import Paginasi from '@/components/daftar/Paginasi'
import { Plus, SlidersHorizontal } from 'lucide-react'
import AksiLainnya from '@/components/AksiLainnya'
import InfoTip from '@/components/InfoTip'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
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
import BulkProductionStructure from './BulkProductionStructure'
import { Checkbox } from '@/components/ui/checkbox'
import ProcessingColorField from './ProcessingColorField'
import { Field, SelectField } from './processingShared'
import ProcessingVarian, { type NilaiBaru } from './ProcessingVarian'
import VarianBanyakPilihan, { type HasilVarian } from './VarianBanyakPilihan'
import { bersihkanVarian, produkBaruDariEdit, labelVarian, masalahVarian, ringkasanVarian, varianDari } from '@/lib/varianProduk'
import { useNamaMenu } from '@/lib/namaMenu'

/** A manual paint tariff may have no model; the catalog still needs a name, so it is stored (and shown) as this. */
const TANPA_MODEL = 'Tanpa model'

export default function ProcessingPrices({ kind: selectedKind }: { kind?: 'produksi' | 'pengecatan' | 'non_kayu' | 'packing' }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-prices', 'catalog'], queryFn: getProcessingCatalogPrices })
  const confirm = useConfirm()
  const [status, setStatus] = useState('active')
  const [changing, setChanging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulk, setBulk] = useState<ProcessingPrice[] | null>(null)
  const selectRow = (price: ProcessingPrice, checked: boolean) => setSelected(previous => {
    const next = new Set(previous)
    if (checked && next.size < 100 && price.active !== false) next.add(price.id)
    else if (!checked) next.delete(price.id)
    return next
  })
  const selection = (q.data?.items || []).filter(p => selected.has(p.id) && p.active !== false && p.kind === 'produksi')
  const [edit, setEdit] = useState<ProcessingPrice | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  // A new manual product can be several at once (one per combination of its variant choices).
  const [kombo, setKombo] = useState<HasilVarian>({ baris: [], masalah: null })
  // Values added to an existing product's variants (Tambah nilai); each new combination is saved as a new product.
  // Status/category filters sit behind a small button so the list starts higher on a phone.
  const [tampilFilter, setTampilFilter] = useState(false)
  const [ekstra, setEkstra] = useState<NilaiBaru[][]>([])
  const [hargaKombinasi, setHargaKombinasi] = useState<Record<string, string>>({})
  const disimpan = useRef(new Set<string>())
  useEffect(() => { disimpan.current = new Set() }, [edit?.id])
  const banyak = !!edit && edit.kind === 'non_kayu' && adding
  const [editingColor, setEditingColor] = useState(false)
  const [useHierarchy, setUseHierarchy] = useState(true)
  /** Paint tariffs: pick the model and size from the production list (otomatis) or type them (manual). */
  const [modeCat, setModeCat] = useState<'otomatis' | 'manual'>('otomatis')
  const [cariModel, setCariModel] = useState('')
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const categoriesId = useId()
  const menu = useNamaMenu()
  const titleOf = (kind: string) => kind === 'produksi' ? menu('/processing/produk-kayu') : kind === 'non_kayu' ? 'Katalog Produk Manual' : kind === 'packing' ? menu('/processing/tarif-packing') : menu('/processing/tarif-pengecatan')
  const categoryOf = (p: ProcessingPrice) => p.jenis?.trim() || ''
  /** Paint tariffs are per model and size, so a tariff row is named by its model (the product name only when it has no model). */
  const namaOf = (p: ProcessingPrice) => (p.kind === 'pengecatan' ? p.model?.trim() || p.produk : p.produk)
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
      [p.produk, p.sku, p.ukuran, labelVarian(p), p.catatan, p.jenis, p.warna, p.model, p.model_kode, p.sku_induk, p.kategori_kode].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  // Manual products read best A–Z by name, 25 to a page; other kinds keep their order and 15 a page.
  if (selectedKind === 'non_kayu') filtered.sort((a, b) => a.produk.localeCompare(b.produk, 'id', { sensitivity: 'base' }) || labelVarian(a).localeCompare(labelVarian(b), 'id', { numeric: true }))
  const perHalaman = selectedKind === 'non_kayu' ? 25 : 15
  const filterAktif = status !== 'active' || category !== 'all'
  const pages = Math.max(1, Math.ceil(filtered.length / perHalaman))
  const current = Math.min(page, pages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Manual (non-wood) catalog text is kept in capitals: name, SKU and notes turn uppercase as they are typed.
  const KAPITAL: (keyof ProcessingPrice)[] = ['produk', 'sku', 'catatan']
  const change = (k: keyof ProcessingPrice, v: string) => setEdit((p) => (p ? { ...p, [k]: p.kind === 'non_kayu' && KAPITAL.includes(k) ? v.toLocaleUpperCase('id') : v } : p))
  const catalogProduct = selectedKind === 'produksi' || selectedKind === 'non_kayu'
  const changeStatus = async (price: ProcessingPrice) => {
    const activate = price.active === false
    const label = activate ? 'Aktifkan' : price.in_use ? 'Nonaktifkan' : 'Hapus'
    if (!await confirm({ title: `${label} produk?`, description: `${price.produk} · ${labelVarian(price) || price.sku || (price.kind === 'non_kayu' ? 'Tanpa varian' : 'Tanpa ukuran')}\n${activate ? 'Produk akan tersedia untuk pemetaan baru.' : price.in_use ? 'Produk sudah dipakai dalam order atau tarif terkait. Produk disembunyikan dari pilihan baru; riwayat tetap utuh.' : 'Produk akan dihapus dari katalog. Jika ternyata sudah dipakai saat diproses, sistem akan menonaktifkannya agar riwayat tetap utuh.'}`, confirmLabel: label, destructive: !activate })) return
    setChanging(true)
    try {
      if (activate) { await activateProcessingPrice(price); toast.success('Produk diaktifkan') }
      else { const result = await retireProcessingPrice(price); toast.success(result.action === 'deleted' ? 'Produk dihapus' : 'Produk dinonaktifkan; riwayat tetap utuh') }
    } catch (err) { toast.error(getApiError(err)) }
    finally { await qc.invalidateQueries({queryKey: ['processing-prices']}); setChanging(false) }
  }
  const rowActions = (price: ProcessingPrice) => <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" disabled={changing} onClick={() => {
      setAdding(false); setEkstra([]); setHargaKombinasi({}); setUseHierarchy(!!price.structure_model_id); setModeCat(price.kind === 'pengecatan' && !price.production_price_id ? 'manual' : 'otomatis'); setCariModel(''); setError(''); setEdit(price.kind === 'non_kayu' ? { ...price, varian: varianDari(price) } : price.kind === 'pengecatan' && !price.production_price_id && price.produk === TANPA_MODEL ? { ...price, produk: '' } : price)
    }}>Edit</Button>
    {catalogProduct && <AksiLainnya><Button variant="outline" size="sm" disabled={changing} className={price.active === false ? '' : 'text-destructive'} onClick={() => void changeStatus(price)}>{price.active === false ? 'Aktifkan' : price.in_use ? 'Nonaktifkan' : 'Hapus'}</Button></AksiLainnya>}
  </div>
  const baseColumns: KolomTabel<ProcessingPrice>[] = [
    {
      kunci: 'produk',
      judul: selectedKind === 'non_kayu' ? 'Produk / Varian' : selectedKind === 'pengecatan' ? 'Model / Ukuran' : 'Produk / Ukuran',
      tetap: true,
      nilai: (r) => namaOf(r),
      sel: (r) => (
        <div>
          <p className="font-medium">{namaOf(r)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[labelVarian(r), r.sku].filter(Boolean).join(' · ') || '—'}
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
      nilai: (r) => Number(r.harga ?? -1),
      sel: (r) => (
        <>
          {r.active === false && <span className="mb-1 block text-xs text-muted-foreground">Nonaktif</span>}
          {r.harga ? fmtRp(r.harga) : <span className="text-muted-foreground">Belum ada harga</span>}
          {r.harga && Number(r.harga) === 0 && (
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
          {!selectedKind && <CardHeader><CardTitle>{titleOf(kind)}</CardTitle></CardHeader>}
          <CardContent className={selectedKind ? "space-y-3 p-3 sm:p-6" : "space-y-3"}>
            {q.error && (
              <p role="alert">
                {getApiError(q.error)}{' '}
                <Button variant="outline" onClick={() => void q.refetch()}>
                  Coba lagi
                </Button>
              </p>
            )}
            {kind === 'produksi' && selection.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
              <span className="mr-auto text-sm">{selection.length} produk dipilih · maksimal 100</span>
              <Button variant="ghost" size="sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Bersihkan pilihan</Button>
              <Button size="sm" disabled={!selection.length || changing} onClick={() => setBulk(selection.map(p => ({...p})))}>Susun Struktur Massal</Button>
            </div>}
            <div className="flex items-center gap-1.5">
            <Input
              className="h-9 min-w-0 flex-1"
              aria-label={`Cari harga ${kind}`}
              placeholder={kind === 'pengecatan' ? 'Cari model, ukuran, warna, atau SKU' : 'Cari produk, ukuran, atau SKU'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {(catalogProduct || kind === 'produksi') && <Button type="button" variant={filterAktif ? 'secondary' : 'outline'} size="icon" className="relative size-9 shrink-0" aria-label="Filter" aria-expanded={tampilFilter} title="Filter" onClick={() => setTampilFilter(v => !v)}>
              <SlidersHorizontal className="size-4" />{filterAktif && <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" aria-hidden />}
            </Button>}
              <Button
                variant="default"
                className="h-9 shrink-0 px-2.5 sm:px-3"
                aria-label={kind === 'non_kayu' ? 'Tambah produk manual' : kind === 'packing' ? 'Tambah tarif packing' : kind === 'produksi' ? 'Tambah produk kayu' : 'Tambah tarif pengecatan'}
                title={kind === 'non_kayu' ? 'Tambah produk manual' : kind === 'packing' ? 'Tambah tarif packing' : kind === 'produksi' ? 'Tambah produk kayu' : 'Tambah tarif pengecatan'}
                onClick={() => {
                  setAdding(true)
                  setUseHierarchy(true)
                  setModeCat('otomatis')
                  setCariModel('')
                  setError('')
                  setEdit({
                    id: crypto.randomUUID(),
                    version: 0,
                    kind,
                    produk: '',
                    sku: '',
                    ukuran: '',
                    ...(kind === 'non_kayu' ? { varian: [] } : {}),
                    harga: kind === 'non_kayu' ? '' : '0',
                    catatan: '',
                    warna: '',
                  })
                }}
              >
                <Plus className="size-4" /><span className="hidden sm:inline">Tambah</span><span className="hidden lg:inline">{kind === 'non_kayu' ? ' produk manual' : kind === 'packing' ? ' tarif packing' : kind === 'produksi' ? ' produk kayu' : ' tarif pengecatan'}</span>
              </Button>
              <InfoTip teks={kind === 'produksi'
                ? 'Perubahan harga tidak mengubah pemetaan order yang sudah tersimpan.'
                : kind === 'packing' ? 'Tarif packing biasa dan kayu. Biaya pada pesanan bisa disesuaikan menurut ukuran.' : kind === 'non_kayu' ? 'Produk dan harga beli supplier yang dicatat manual.' : 'Tarif tagihan reseller, sudah termasuk jasa. Pengecatan internal tidak menimbulkan tagihan jasa karyawan.'} />
              {kind === 'produksi' && <AksiLainnya><Button variant="outline" size="sm" disabled={changing || !filtered.some(p => p.active !== false)} onClick={() => setSelected(new Set(filtered.filter(p => p.active !== false).slice(0,100).map(p => p.id)))}>Pilih hasil pencarian</Button></AksiLainnya>}
            </div>
            {tampilFilter && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-xl">
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
            </div>}
            {kind === 'non_kayu' ? (() => {
              const grup: { nama: string; isi: ProcessingPrice[] }[] = []
              for (const p of filtered) {
                const g = grup.find((x) => x.nama.toLocaleLowerCase('id') === p.produk.trim().toLocaleLowerCase('id'))
                if (g) g.isi.push(p); else grup.push({ nama: p.produk.trim(), isi: [p] })
              }
              const hal = Math.max(1, Math.ceil(grup.length / perHalaman))
              const kini = Math.min(page, hal)
              const harga = (r: ProcessingPrice) => <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${!r.harga || Number(r.harga) === 0 ? 'text-destructive' : ''}`}>{r.harga ? fmtRp(r.harga) : <span className="font-normal">Belum ada harga</span>}{r.harga && Number(r.harga) === 0 && <span className="block text-xs font-normal text-destructive">Harga nol — periksa</span>}</span>
              const ket = (r: ProcessingPrice) => [labelVarian(r), r.sku].filter(Boolean).join(' · ')
              return <div className="divide-y border-y" aria-label="Katalog Produk Manual">
                {grup.slice((kini - 1) * perHalaman, kini * perHalaman).map((g) => {
                  const tunggal = g.isi.length === 1 ? g.isi[0] : null
                  return <div key={g.nama} className="py-3">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="break-words text-sm font-semibold [overflow-wrap:break-word]">{g.nama}</p>
                        {tunggal && ket(tunggal) && <p className="mt-0.5 break-words text-xs text-muted-foreground">{ket(tunggal)}</p>}
                        {g.isi.every((r) => r.active === false) && <span className="text-xs text-muted-foreground">Nonaktif</span>}
                      </div>
                      {tunggal && <div className="ml-auto flex items-center gap-3">{harga(tunggal)}{rowActions(tunggal)}</div>}
                    </div>
                    {!tunggal && <ul className="mt-2 space-y-1.5">
                      {g.isi.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-3">
                        <span className="min-w-0 flex-1 basis-32 break-words text-sm text-muted-foreground">{ket(r) || 'Tanpa varian'}{r.active === false && <span className="ml-1 text-xs">(nonaktif)</span>}</span>
                        <div className="ml-auto flex items-center gap-3">{harga(r)}{rowActions(r)}</div>
                      </li>)}
                    </ul>}
                  </div>
                })}
                {!grup.length && <p className="py-8 text-center text-sm text-muted-foreground">Belum ada produk yang sesuai.</p>}
                {grup.length > perHalaman && <div className="flex items-center justify-between gap-2 pt-3"><Paginasi halaman={kini} totalHalaman={hal} onUbah={setPage} /></div>}
              </div>
            })() : <>
            <div className="hidden md:block">
              <TabelLokal
                label={titleOf(kind)}
                items={filtered}
                pilihan={kind === 'produksi' ? {
                  terpilih: id => selected.has(id), bisaDipilih: p => p.active !== false,
                  onUbah: selectRow, semuaDipilih: false, adaYangBisaDipilih: true, onUbahSemua: () => {},
                } : undefined}
                kolom={columns}
                idDari={(p) => p.id}
                namaDari={(p) => namaOf(p)}
                minWidth={selectedKind === 'produksi' ? 950 : 580}
                perHalaman={perHalaman}
              />
              {!filtered.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada harga yang sesuai. Tambahkan tarif baru untuk mulai.</p>
              )}
            </div>
            <div className="divide-y md:hidden">
              {filtered.slice((current - 1) * perHalaman, current * perHalaman).map((r) => (
                <div className="flex items-start justify-between gap-3 py-4" key={r.id}>
                  {kind === 'produksi' && r.active !== false && <Checkbox aria-label={`Pilih ${r.produk} ${r.ukuran}`} checked={selected.has(r.id)} onCheckedChange={checked => selectRow(r, checked === true)} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{namaOf(r)}</p>
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
                      {r.harga ? <>{fmtRp(r.harga)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">/ unit</span></> : <span className="font-normal text-muted-foreground">Belum ada harga</span>}
                    </p>
                    {r.harga && Number(r.harga) === 0 && <p className="text-xs text-destructive">Harga nol — periksa</p>}
                  </div>
                  {rowActions(r)}
                </div>
              ))}
              {!filtered.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada harga yang sesuai.</p>
              )}
              {filtered.length > perHalaman && (
                <div className="flex items-center justify-between gap-2 pt-3">
                  <Paginasi halaman={current} totalHalaman={pages} onUbah={setPage} />
                </div>
              )}
            </div>
            </>}
          </CardContent>
        </Card>
      ))}
      {bulk && <BulkProductionStructure selected={bulk} catalog={q.data?.items || []} onClose={() => setBulk(null)} onSaved={() => {setBulk(null);setSelected(new Set())}} />}
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
                if (banyak) {
                  if (kombo.masalah) { setError(kombo.masalah); return }
                  setBusy(true)
                  setError('')
                  let dibuat = 0
                  try {
                    for (const b of kombo.baris) {
                      if (disimpan.current.has(b.kunci)) { dibuat++; continue }
                      await saveProcessingPrice({ ...edit, id: crypto.randomUUID(), version: 0, varian: b.varian, ukuran: ringkasanVarian(b.varian), sku: b.sku, harga: b.harga })
                      disimpan.current.add(b.kunci)
                      dibuat++
                    }
                    await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                    setEdit(null); setCategory('all'); setSearch(''); setPage(1)
                    toast.success(dibuat > 1 ? `${dibuat} produk tersimpan` : 'Harga tersimpan')
                  } catch (err) {
                    await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                    setError(`${dibuat} dari ${kombo.baris.length} produk sudah tersimpan. ${getApiError(err)} Perbaiki lalu simpan lagi; yang sudah tersimpan tidak dibuat dua kali.`)
                  } finally {
                    setBusy(false)
                  }
                  return
                }
                if (edit.kind === 'pengecatan' && modeCat === 'otomatis' && !edit.production_price_id) { setError('Pilih model dari daftar, atau pakai cara Manual.'); return }
                const masalah = edit.kind === 'non_kayu' ? masalahVarian(edit.varian ?? []) : null
                if (masalah) { setError(masalah); return }
                setBusy(true)
                setError('')
                const baruKombinasi = edit.kind === 'non_kayu' ? produkBaruDariEdit(edit.varian ?? [], ekstra, hargaKombinasi, edit.harga ?? '') : []
                const salahBaru = baruKombinasi.map(b => masalahVarian(b.varian)).find(Boolean)
                if (salahBaru) { setError(salahBaru); return }
                try {
                  // New sibling products first, so a failure leaves this product untouched and the form open.
                  for (const { varian: k, harga } of baruKombinasi) {
                    const kunci = 'ekstra:' + edit.id + ':' + k.map(v => v.nama + '=' + v.nilai).join('|')
                    if (disimpan.current.has(kunci)) continue
                    await saveProcessingPrice({ ...edit, id: crypto.randomUUID(), version: 0, varian: k, ukuran: ringkasanVarian(k), harga })
                    disimpan.current.add(kunci)
                  }
                  if (baruKombinasi.length) { setEkstra([]); setHargaKombinasi({}) }
                  await saveProcessingPrice(edit.kind === 'non_kayu' ? { ...edit, varian: bersihkanVarian(edit.varian ?? []), ukuran: ringkasanVarian(edit.varian ?? []) } : edit.kind === 'pengecatan' && modeCat === 'manual' && !edit.produk.trim() ? { ...edit, produk: TANPA_MODEL } : edit)
                  await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                  if ((e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-next-size') === 'true') {
                    setAdding(true)
                    setEdit({ ...edit, id: crypto.randomUUID(), version: 0, ukuran: '', sku: '', harga: '0' })
                  } else setEdit(null)
                  setCategory('all')
                  setSearch('')
                  setPage(1)
                  toast.success(baruKombinasi.length ? `Tersimpan, ${baruKombinasi.length} produk baru dibuat` : 'Harga tersimpan')
                } catch (err) {
                  await qc.invalidateQueries({ queryKey: ['processing-prices'] })
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
              {edit.kind === 'pengecatan' ? <>
                <div className="flex gap-2" role="group" aria-label="Cara memilih model">
                  {(['otomatis', 'manual'] as const).map(m => <Button key={m} type="button" size="sm" variant={modeCat === m ? 'default' : 'outline'} aria-pressed={modeCat === m} onClick={() => {
                    if (m === modeCat) return
                    setModeCat(m)
                    setEdit(v => v ? { ...v, production_price_id: '', produk: '', ukuran: '', sku: '' } : v)
                  }}>{m === 'otomatis' ? 'Otomatis (dari daftar)' : 'Manual (ketik sendiri)'}</Button>)}
                </div>
                {modeCat === 'otomatis' ? (() => {
                  const dipakai = (p: ProcessingPrice) => p.kind === 'produksi' && !!p.structure_model_id && (p.active !== false || p.id === edit.production_price_id)
                  const kata = cariModel.trim().toLocaleLowerCase('id')
                  const cocok = (q.data?.items || []).filter(p => dipakai(p) && (p.id === edit.production_price_id || [p.model, p.model_kode, p.produk, p.ukuran, p.sku].filter(Boolean).join(' ').toLocaleLowerCase('id').includes(kata)))
                  const dipilih = edit.production_price_id || ''
                  return <div className="space-y-2">
                    <Field title="Model"><Input value={cariModel} onChange={e => setCariModel(e.target.value)} placeholder="Cari model, ukuran, atau SKU" autoComplete="off" /></Field>
                    <div role="listbox" aria-label="Daftar model" className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-input bg-background p-1">
                      {cocok.length ? cocok.map(p => <button key={p.id} type="button" role="option" aria-selected={p.id === dipilih} className={cn('flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent', p.id === dipilih && 'bg-primary/10 ring-1 ring-primary')} onClick={() => setEdit(v => v ? {...v, production_price_id: p.id, produk: p.produk, ukuran: p.ukuran, sku: p.sku} : v)}>
                        <span className="font-medium">{p.model || p.produk}</span>
                        <span className="break-all text-xs text-muted-foreground">{[p.ukuran, p.sku].filter(Boolean).join(' · ')}</span>
                      </button>) : <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada model yang cocok</p>}
                    </div>
                    {kata && <p className="text-xs text-muted-foreground">{cocok.filter(p => p.id !== dipilih).length} model cocok</p>}
                  </div>
                })() : <Field title="Model (boleh dikosongkan)"><Input maxLength={300} value={edit.produk} placeholder="Contoh: Rak Piring Lantai" onChange={e => change('produk', e.target.value)} /></Field>}
              </> : (
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
              {edit.kind === 'pengecatan' ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field title="Ukuran"><Input readOnly={modeCat === 'otomatis'} required={modeCat === 'manual'} maxLength={100} value={edit.ukuran} placeholder={modeCat === 'manual' ? 'Contoh: 50x30' : undefined} onChange={e => change('ukuran', e.target.value)}/></Field><Field title={modeCat === 'manual' ? 'SKU (opsional)' : 'SKU produksi'}><Input readOnly={modeCat === 'otomatis'} maxLength={200} value={edit.sku} onChange={e => change('sku', e.target.value)}/></Field></div> : <div className={edit.kind === 'packing' || edit.kind === 'non_kayu' ? 'grid gap-3' : 'grid grid-cols-2 gap-3'}>
                {banyak ? <div className="col-span-2"><VarianBanyakPilihan key={edit.id} onChange={setKombo} /></div> : edit.kind === 'non_kayu' ? <div className="col-span-2"><ProcessingVarian value={edit.varian ?? []} onChange={varian => setEdit(v => v ? { ...v, varian } : v)} ekstra={ekstra} onEkstra={setEkstra} harga={edit.harga ?? ''} onHarga={h => change('harga', h)} hargaKombinasi={hargaKombinasi} onHargaKombinasi={setHargaKombinasi} /></div> : <Field title="Ukuran">
                  <Input
                    maxLength={100}
                    value={edit.ukuran}
                    onChange={(e) => change('ukuran', e.target.value)}
                  />
                </Field>}
                {edit.kind !== 'packing' && !banyak && <>
                <Field title={edit.kind === 'non_kayu' ? 'SKU supplier (opsional)' : 'SKU Produksi (opsional)'}>
                  <Input maxLength={200} value={edit.sku} onChange={(e) => change('sku', e.target.value)} />
                </Field>
                </>}
              </div>}
              </>}
              <div className={edit.kind === 'produksi' ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
              {!banyak && !(edit.kind === 'non_kayu' && (edit.varian ?? []).length === 1) && <Field title={edit.kind === 'non_kayu' ? 'Harga per unit (Rp) — boleh dikosongkan, harga menyusul' : 'Harga per unit (Rp)'}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required={edit.kind !== 'non_kayu'}
                  value={edit.harga ?? ''}
                  onChange={(e) => change('harga', e.target.value)}
                />
              </Field>}
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
                  {busy ? 'Menyimpan…' : banyak && kombo.baris.length > 1 ? `Simpan ${kombo.baris.length} produk` : 'Simpan harga'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
