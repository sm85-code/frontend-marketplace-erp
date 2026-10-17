import { useId, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProcessingCatalogPrices, retireProcessingPrice, activateProcessingPrice, saveProcessingPrice, type ProcessingPrice } from '@/api/processing'
import { fmtRp, getApiError } from '@/api/client'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ConfirmProvider'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import ProductionStructurePicker from './ProductionStructurePicker'
import ProcessingColorField from './ProcessingColorField'
import { Field, SelectField } from './processingShared'

export default function ProcessingPrices({ kind: selectedKind }: { kind?: 'produksi' | 'pengecatan' | 'non_kayu' | 'packing' }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-prices', 'catalog'], queryFn: getProcessingCatalogPrices })
  const confirm = useConfirm()
  const [status, setStatus] = useState('active')
  const [changing, setChanging] = useState(false)
  const [edit, setEdit] = useState<ProcessingPrice | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingColor, setEditingColor] = useState(false)
  const [useHierarchy, setUseHierarchy] = useState(true)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const categoriesId = useId()
  const titleOf = (kind: string) => kind === 'produksi' ? 'Katalog Produk Kayu' : kind === 'non_kayu' ? 'Katalog Produk Manual' : kind === 'packing' ? 'Tarif Packing' : 'Tarif Pengecatan'
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
      (status === 'all' || (status === 'inactive' ? p.active === false : p.active !== false)) &&
      (selectedKind !== 'produksi' ||
        category === 'all' ||
        (category === 'none' ? !categoryOf(p) : category === 'category:' + categoryOf(p))) &&
      [p.produk, p.sku, p.ukuran, p.catatan, p.jenis, p.warna, p.model, p.model_kode, p.sku_induk, p.kategori_kode].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 15))
  const current = Math.min(page, pages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (k: keyof ProcessingPrice, v: string) => setEdit((p) => (p ? { ...p, [k]: v } : p))
  const catalogProduct = selectedKind === 'produksi' || selectedKind === 'non_kayu'
  const changeStatus = async (price: ProcessingPrice) => {
    const activate = price.active === false
    const label = activate ? 'Aktifkan' : price.in_use ? 'Nonaktifkan' : 'Hapus'
    if (!await confirm({ title: `${label} produk?`, description: `${price.produk} · ${price.ukuran || price.sku || 'Tanpa ukuran'}\n${activate ? 'Produk akan tersedia untuk pemetaan baru.' : price.in_use ? 'Produk sudah dipakai dalam order atau tarif terkait. Produk disembunyikan dari pilihan baru; riwayat tetap utuh.' : 'Produk akan dihapus dari katalog. Jika ternyata sudah dipakai saat diproses, sistem akan menonaktifkannya agar riwayat tetap utuh.'}`, confirmLabel: label, destructive: !activate })) return
    setChanging(true)
    try {
      if (activate) { await activateProcessingPrice(price); toast.success('Produk diaktifkan') }
      else { const result = await retireProcessingPrice(price); toast.success(result.action === 'deleted' ? 'Produk dihapus' : 'Produk dinonaktifkan; riwayat tetap utuh') }
    } catch (err) { toast.error(getApiError(err)) }
    finally { await qc.invalidateQueries({queryKey: ['processing-prices']}); setChanging(false) }
  }
  const rowActions = (price: ProcessingPrice) => <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" disabled={changing} onClick={() => {
      setAdding(false); setUseHierarchy(!!price.structure_model_id); setError(''); setEdit(price)
    }}>Edit</Button>
    {catalogProduct && <Button variant="outline" size="sm" disabled={changing} className={price.active === false ? '' : 'text-destructive'} onClick={() => void changeStatus(price)}>{price.active === false ? 'Aktifkan' : price.in_use ? 'Nonaktifkan' : 'Hapus'}</Button>}
  </div>
  const baseColumns: KolomTabel<ProcessingPrice>[] = [
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
      : selectedKind === 'pengecatan' ? [{ kunci: 'warna', judul: 'Warna', nilai: (r: ProcessingPrice) => r.warna || '', sel: (r: ProcessingPrice) => <span>{r.warna || 'Belum ditentukan'}</span> }] : selectedKind === 'packing' ? [{ kunci: 'packing_type', judul: 'Jenis packing', nilai: (r: ProcessingPrice) => r.packing_type || 'biasa', sel: (r: ProcessingPrice) => r.packing_type === 'kayu' ? 'Kayu' : 'Biasa' }] : []),
    {
      kunci: 'harga',
      judul: 'Harga / unit',
      nilai: (r) => Number(r.harga),
      sel: (r) => (
        <>
          {r.active === false && <span className="mb-1 block text-xs text-muted-foreground">Nonaktif</span>}
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
      sel: rowActions,
    },
  ]
  const columns: KolomTabel<ProcessingPrice>[] = selectedKind === 'produksi' ? [
    { kunci: 'jenis', judul: 'Kategori', nilai: r => categoryOf(r), sel: r => <div><p className="font-medium">{r.jenis || 'Belum dikategorikan'}</p>{r.kategori_kode && <p className="text-xs text-muted-foreground">{r.kategori_kode}</p>}</div> },
    { kunci: 'produk', judul: 'Produk / SKU induk', tetap: true, nilai: r => r.produk, sel: r => <div><p className="font-medium">{r.produk}</p><p className="text-xs text-muted-foreground">{r.sku_induk || 'Data lama · belum terstruktur'}</p></div> },
    { kunci: 'model', judul: 'Model', nilai: r => r.model_kode || '', sel: r => <div>{r.model_kode || '—'}{r.model && r.model !== r.model_kode && <p className="text-xs text-muted-foreground">{r.model}</p>}</div> },
    { kunci: 'ukuran', judul: 'Ukuran / SKU', nilai: r => r.ukuran, sel: r => <div>{r.ukuran || '—'}<p className="mt-1 break-all text-xs text-muted-foreground">{r.sku || '—'}</p></div> },
    ...baseColumns.filter(c => c.kunci === 'harga' || c.kunci === 'aksi'),
  ] : baseColumns
  return (
    <>
      {(selectedKind ? [selectedKind] : (['produksi', 'pengecatan'] as const)).map((kind) => (
        <Card className="min-w-0" key={kind}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{titleOf(kind)}</CardTitle>
              <Button
                variant="default"
                onClick={() => {
                  setAdding(true)
                  setUseHierarchy(true)
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
                    warna: '',
                  })
                }}
              >
                {kind === 'non_kayu' ? 'Tambah produk manual' : kind === 'packing' ? 'Tambah tarif packing' : kind === 'produksi' ? 'Tambah produk kayu' : 'Tambah tarif pengecatan'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {kind === 'produksi'
                ? 'Perubahan harga tidak mengubah pemetaan order yang sudah tersimpan.'
                : kind === 'packing' ? 'Tarif packing biasa dan kayu. Biaya pada pesanan bisa disesuaikan menurut ukuran.' : kind === 'non_kayu' ? 'Produk dan harga beli supplier yang dicatat manual.' : 'Tarif tagihan reseller, sudah termasuk jasa. Pengecatan internal tidak menimbulkan tagihan jasa karyawan.'}
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
              placeholder={kind === 'pengecatan' ? 'Cari produk, ukuran, warna, atau SKU' : 'Cari produk, ukuran, atau SKU'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {catalogProduct && <SelectField aria-label="Status produk" value={status} onChange={e => {setStatus(e.target.value);setPage(1)}}><option value="active">Produk aktif</option><option value="inactive">Produk nonaktif</option><option value="all">Semua status</option></SelectField>}
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
                label={titleOf(kind)}
                items={filtered}
                kolom={columns}
                idDari={(p) => p.id}
                namaDari={(p) => p.produk}
                minWidth={selectedKind === 'produksi' ? 950 : 580}
              />
            </div>
            <div className="divide-y md:hidden">
              {filtered.slice((current - 1) * 15, current * 15).map((r) => (
                <div className="flex items-start justify-between gap-3 py-4" key={r.id}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{r.produk}</p>
                    {r.active === false && <span className="text-xs text-muted-foreground">Nonaktif</span>}
                    {kind === 'produksi' && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        {categoryOf(r) || 'Belum dikategorikan'}
                      </p>
                    )}
                    {kind === 'pengecatan' && <p className="mt-1 text-sm text-muted-foreground">Warna: {r.warna || 'Belum ditentukan'}</p>}
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {[r.model_kode, r.ukuran, r.sku].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {fmtRp(r.harga)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">/ unit</span>
                    </p>
                    {Number(r.harga) === 0 && <p className="text-xs text-destructive">Harga nol — periksa</p>}
                  </div>
                  {rowActions(r)}
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
        <DialogContent className={`processing-dialog max-h-[90dvh] overflow-y-auto text-left [&_p]:text-left ${edit?.kind === 'produksi' ? 'sm:max-w-6xl' : ''}`}>
          <DialogHeader>
            <DialogTitle>{adding ? 'Tambah' : 'Edit'} {edit?.kind === 'non_kayu' ? 'produk manual' : edit?.kind === 'packing' ? 'tarif packing' : `harga ${edit?.kind}`}</DialogTitle>
            <DialogDescription>
              Harga disimpan untuk pilihan pemetaan berikutnya. Riwayat order tidak berubah.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault()
                if (editingColor) return
                setBusy(true)
                setError('')
                try {
                  await saveProcessingPrice(edit)
                  await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                  if ((e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-next-size') === 'true') {
                    setAdding(true)
                    setEdit({ ...edit, id: crypto.randomUUID(), version: 0, ukuran: '', sku: '', harga: '0' })
                  } else setEdit(null)
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
              {edit.kind === 'produksi' && useHierarchy ? (
                <ProductionStructurePicker key={edit.id} value={edit} onChange={fields => setEdit(v => v ? { ...v, ...fields } : v)} />
              ) : <>
                {edit.kind === 'produksi' && <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <p>Harga ini memakai data lama. Susun kategori, produk, dan model untuk membuat SKU otomatis.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setUseHierarchy(true)}>Susun struktur</Button>
                </div>}
              {edit.kind === 'pengecatan' ? <Field title="Nama produk"><SelectField required value={edit.production_price_id || ''} onChange={e => {
                const product = q.data?.items.find(p => p.id === e.target.value && p.kind === 'produksi' && p.structure_model_id && (p.active !== false || p.id === edit.production_price_id))
                setEdit(v => v && product ? {...v, production_price_id: product.id, produk: product.produk, ukuran: product.ukuran, sku: product.sku} : v)
              }}><option value="">Pilih produk terstruktur</option>{(q.data?.items || []).filter(p => p.kind === 'produksi' && p.structure_model_id && (p.active !== false || p.id === edit.production_price_id)).map(p => <option key={p.id} value={p.id}>{[p.produk,p.model,p.ukuran,p.sku].filter(Boolean).join(' · ')}</option>)}</SelectField></Field> : (
              <Field title="Nama produk">
                <Input
                  required
                  maxLength={300}
                  value={edit.produk}
                  onChange={(e) => change('produk', e.target.value)}
                />
              </Field>
              )}
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
              {edit.kind === 'packing' && <Field title="Jenis packing"><SelectField value={edit.packing_type || 'biasa'} onChange={e => change('packing_type', e.target.value)}><option value="biasa">Biasa</option><option value="kayu">Kayu</option></SelectField></Field>}
              {edit.kind === 'pengecatan' && <ProcessingColorField onEditingChange={setEditingColor} value={edit.warna ?? ''} colors={(q.data?.items || []).filter(p => p.kind === 'pengecatan').map(p => p.warna || '')} onChange={(color, id) => setEdit(v => v ? {...v, warna:color, color_id:id} : v)} />}
              {edit.kind === 'pengecatan' ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field title="Ukuran"><Input readOnly value={edit.ukuran}/></Field><Field title="SKU produksi"><Input readOnly value={edit.sku}/></Field></div> : <div className={edit.kind === 'packing' ? 'grid gap-3' : 'grid grid-cols-2 gap-3'}>
                <Field title="Ukuran">
                  <Input
                    maxLength={100}
                    value={edit.ukuran}
                    onChange={(e) => change('ukuran', e.target.value)}
                  />
                </Field>
                {edit.kind !== 'packing' && <>
                <Field title={edit.kind === 'non_kayu' ? 'SKU supplier (opsional)' : 'SKU Produksi (opsional)'}>
                  <Input maxLength={200} value={edit.sku} onChange={(e) => change('sku', e.target.value)} />
                </Field>
                </>}
              </div>}
              </>}
              <div className={edit.kind === 'produksi' ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
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
              </div>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter className="sticky -bottom-6 z-10 border-t bg-background py-3">
                {edit.kind === 'produksi' && useHierarchy && <Button type="submit" variant="outline" data-next-size="true" disabled={busy}>Simpan & tambah ukuran</Button>}
                <Button disabled={busy || editingColor} type="submit">
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
