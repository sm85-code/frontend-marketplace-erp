import { useState } from 'react'
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
import { Field } from './processingShared'

export default function ProcessingPrices() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-prices'], queryFn: getProcessingPrices })
  const [edit, setEdit] = useState<ProcessingPrice | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (k: keyof ProcessingPrice, v: string) => setEdit((p) => (p ? { ...p, [k]: v } : p))
  const columns: KolomTabel<ProcessingPrice>[] = [
    { kunci: 'produk', judul: 'Produk', tetap: true, nilai: (r) => r.produk, sel: (r) => r.produk },
    { kunci: 'ukuran', judul: 'Ukuran', sel: (r) => r.ukuran || '—' },
    { kunci: 'sku', judul: 'SKU Produksi', sel: (r) => r.sku || '—' },
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
    { kunci: 'catatan', judul: 'Keterangan', sel: (r) => r.catatan || '—' },
    {
      kunci: 'aksi',
      judul: 'Aksi',
      sel: (r) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
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
      {(['produksi', 'pengecatan'] as const).map((kind) => (
        <Card className="min-w-0" key={kind}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Daftar Harga {kind === 'produksi' ? 'Produksi' : 'Pengecatan'}</CardTitle>
              <Button
                variant="outline"
                onClick={() => {
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
              onChange={(e) => setSearch(e.target.value)}
            />
            <TabelLokal
              label={`Harga ${kind}`}
              items={(q.data?.items || []).filter(
                (p) =>
                  p.kind === kind &&
                  [p.produk, p.sku, p.ukuran, p.catatan]
                    .join(' ')
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )}
              kolom={columns}
              idDari={(p) => p.id}
              namaDari={(p) => p.produk}
              minWidth={950}
            />
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Biaya proses reseller</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Rp10.000 per unit, hanya untuk produk pesanan reseller yang dibuat tukang kayu. Tidak berlaku
            untuk pesanan toko sendiri atau produk supplier.
          </p>
        </CardContent>
      </Card>
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!busy && !o) setEdit(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.version === 0 ? 'Tambah' : 'Edit'} harga {edit?.kind}
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
