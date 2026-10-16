import { useId, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProcessingPrices, saveProcessingPrice, type ProcessingPrice } from '@/api/processing'
import { fmtRp, getApiError } from '@/api/client'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Field, SelectField } from './processingShared'

export default function ProcessingPrices({ kind: selectedKind }: { kind?: 'produksi' | 'pengecatan' }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-prices'], queryFn: getProcessingPrices })
  const [edit, setEdit] = useState<ProcessingPrice | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const categoriesId = useId()
  const categoryOf = (p: ProcessingPrice) => p.jenis?.trim() || ''
  const categories = [
    ...new Set(
      (q.data?.items || [])
        .filter((p) => p.kind === 'produksi')
        .map(categoryOf)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'id'))
  const filtered = (q.data?.items || []).filter(
    (p) =>
      p.kind === selectedKind &&
      (selectedKind !== 'produksi' ||
        category === 'all' ||
        (category === 'none' ? !categoryOf(p) : category === 'category:' + categoryOf(p))) &&
      [p.produk, p.sku, p.ukuran, p.catatan, p.jenis].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 15))
  const current = Math.min(page, pages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (k: keyof ProcessingPrice, v: string) => setEdit((p) => (p ? { ...p, [k]: v } : p))
  const columns: KolomTabel<ProcessingPrice>[] = [
    {
      kunci: 'produk',
      judul: 'Produk / Ukuran',
      tetap: true,
      nilai: (r) => r.produk,
      sel: (r) => (
        <div>
          <p className="font-medium">{r.produk}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[r.ukuran, r.sku].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    ...(selectedKind === 'produksi'
      ? [
          {
            kunci: 'jenis',
            judul: 'Kategori',
            nilai: (r: ProcessingPrice) => categoryOf(r),
            sel: (r: ProcessingPrice) => (
              <span className="text-sm text-muted-foreground">{categoryOf(r) || 'Belum dikategorikan'}</span>
            ),
          },
        ]
      : []),
    {
      kunci: 'harga',
      judul: 'Harga / unit',
      nilai: (r) => Number(r.harga),
      sel: (r) => (
        <>
          {fmtRp(r.harga)}
          {Number(r.harga) === 0 && (
            <span className="block text-xs text-destructive">Harga nol — periksa</span>
          )}
        </>
      ),
    },

    {
      kunci: 'aksi',
      judul: 'Aksi',
      sel: (r) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAdding(false)
            setError('')
            setEdit(r)
          }}
        >
          Edit
        </Button>
      ),
    },
  ]
  return (
    <>
      {(selectedKind ? [selectedKind] : (['produksi', 'pengecatan'] as const)).map((kind) => (
        <Card className="min-w-0" key={kind}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Daftar Harga {kind === 'produksi' ? 'Produksi' : 'Pengecatan'}</CardTitle>
              <Button
                variant="default"
                onClick={() => {
                  setAdding(true)
                  setError('')
                  setEdit({
                    id: crypto.randomUUID(),
                    version: 0,
                    kind,
                    produk: '',
                    sku: '',
                    ukuran: '',
                    harga: '0',
                    catatan: '',
                  })
                }}
              >
                Tambah harga {kind}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {kind === 'produksi'
                ? 'Perubahan harga tidak mengubah pemetaan order yang sudah tersimpan.'
                : 'Tarif tagihan reseller, sudah termasuk jasa. Pengecatan internal tidak menimbulkan tagihan jasa karyawan.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.error && (
              <p role="alert">
                {getApiError(q.error)}{' '}
                <Button variant="outline" onClick={() => void q.refetch()}>
                  Coba lagi
                </Button>
              </p>
            )}
            <Input
              aria-label={`Cari harga ${kind}`}
              placeholder="Cari produk, ukuran, atau SKU"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {kind === 'produksi' && (
              <SelectField
                aria-label="Filter kategori produk"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">Semua kategori</option>
                <option value="none">Belum dikategorikan</option>
                {categories.map((c) => (
                  <option value={'category:' + c} key={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            )}
            <div className="hidden md:block">
              <TabelLokal
                label={`Harga ${kind}`}
                items={filtered}
                kolom={columns}
                idDari={(p) => p.id}
                namaDari={(p) => p.produk}
                minWidth={580}
              />
            </div>
            <div className="divide-y md:hidden">
              {filtered.slice((current - 1) * 15, current * 15).map((r) => (
                <div className="flex items-start justify-between gap-3 py-4" key={r.id}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{r.produk}</p>
                    {kind === 'produksi' && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        {categoryOf(r) || 'Belum dikategorikan'}
                      </p>
                    )}
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {[r.ukuran, r.sku].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {fmtRp(r.harga)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">/ unit</span>
                    </p>
                    {Number(r.harga) === 0 && <p className="text-xs text-destructive">Harga nol — periksa</p>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdding(false)
                      setError('')
                      setEdit(r)
                    }}
                  >
                    Edit
                  </Button>
                </div>
              ))}
              {!filtered.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada harga yang sesuai.</p>
              )}
              {filtered.length > 15 && (
                <div className="flex items-center justify-between gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs">
                    {current} / {pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!busy && !o) setEdit(null)
        }}
      >
        <DialogContent className="processing-dialog max-h-[90dvh] overflow-y-auto text-left [&_p]:text-left">
          <DialogHeader>
            <DialogTitle>
              {adding ? 'Tambah' : 'Edit'} harga {edit?.kind}
            </DialogTitle>
            <DialogDescription>
              Harga disimpan untuk pilihan pemetaan berikutnya. Riwayat order tidak berubah.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                setError('')
                try {
                  await saveProcessingPrice(edit)
                  await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                  setEdit(null)
                  setCategory('all')
                  setSearch('')
                  setPage(1)
                  toast.success('Harga tersimpan')
                } catch (err) {
                  setError(getApiError(err))
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Field title="Nama produk">
                <Input
                  required
                  maxLength={300}
                  value={edit.produk}
                  onChange={(e) => change('produk', e.target.value)}
                />
              </Field>
              {edit.kind === 'produksi' && (
                <>
                  <Field title="Kategori produk">
                    <Input
                      list={categoriesId}
                      maxLength={200}
                      value={edit.jenis ?? ''}
                      placeholder="Pilih atau ketik kategori"
                      onChange={(e) => change('jenis', e.target.value)}
                    />
                  </Field>
                  <datalist id={categoriesId}>
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field title="Ukuran">
                  <Input
                    maxLength={100}
                    value={edit.ukuran}
                    onChange={(e) => change('ukuran', e.target.value)}
                  />
                </Field>
                <Field title="SKU Produksi (opsional)">
                  <Input maxLength={200} value={edit.sku} onChange={(e) => change('sku', e.target.value)} />
                </Field>
              </div>
              <Field title="Harga per unit (Rp)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={edit.harga}
                  onChange={(e) => change('harga', e.target.value)}
                />
              </Field>
              <Field title="Keterangan">
                <Input
                  maxLength={2000}
                  value={edit.catatan}
                  onChange={(e) => change('catatan', e.target.value)}
                />
              </Field>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button disabled={busy} type="submit">
                  {busy ? 'Menyimpan…' : 'Simpan harga'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
