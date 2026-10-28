import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import * as management from '@/api/management'
import * as workflow from '@/api/workflows'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { KatalogDetail } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import MoneyInput from '@/components/MoneyInput'
import PilihNative from '@/components/PilihNative'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Attributes from '../publication/Attributes'

const field = 'w-full rounded-lg border bg-background p-2'
type Opsi = { option: string; asal: number | null }
type Tier = { name: string; options: Opsi[] }
type Baris = { model_id?: string; sku: string; price: string; stock: string; hapus?: boolean }
const kunci = (idx: number[]) => idx.join('-')
const sama = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)
const NO_BRAND = { brand_id: 0, original_brand_name: 'No Brand' }

/** All option-index combinations of the variations, in Seller Center order. */
function kombinasi(tiers: Tier[]): number[][] {
  return tiers.reduce<number[][]>((acc, t) => acc.flatMap(a => t.options.map((_, i) => [...a, i])), [[]]).filter(c => c.length === tiers.length && c.length > 0)
}

export default function EditProdukShopeePage() {
  const { id = '' } = useParams()
  const detail = useQuery({ queryKey: qk.katalogOne(id), queryFn: () => endpoints.getKatalog(id) })
  const settings = useQuery({ queryKey: ['pengaturan-produk', id], queryFn: () => management.settings(id), staleTime: 0, retry: false })
  const error = detail.error || settings.error
  if (error) return <div className="p-4"><QueryError error={error} retry={() => { void detail.refetch(); void settings.refetch() }} /></div>
  if (!detail.data || !settings.data) return <Spinner column label="Memuat data produk dari Shopee…" />
  return <Editor key={settings.dataUpdatedAt} detail={detail.data} initial={settings.data} />
}

function Editor({ detail, initial }: { detail: KatalogDetail; initial: management.ItemSettings }) {
  const navigate = useNavigate(), confirm = useConfirm(), qc = useQueryClient()
  const kembali = () => navigate(`/katalog/${detail.id}?tab=kelola`)
  // Informasi produk
  const [name, setName] = useState(initial.item_name)
  const [description, setDescription] = useState(initial.description ?? '')
  const [category, setCategory] = useState(initial.category_id)
  const [images, setImages] = useState(initial.image?.image_id_list ?? [])
  const [urls, setUrls] = useState<Record<string, string>>(() => Object.fromEntries((initial.image?.image_id_list ?? []).map((x, i) => [x, initial.image?.image_url_list?.[i] ?? ''])))
  // Spesifikasi
  const [brand, setBrand] = useState(initial.brand ?? NO_BRAND)
  const [attributes, setAttributes] = useState(initial.attribute_list ?? [])
  // Informasi penjualan
  const tiersAwal: Tier[] = (initial.tiers ?? []).map(t => ({ name: t.name, options: t.option_list.map((o, i) => ({ option: o.option, asal: i })) }))
  const [tiers, setTiers] = useState<Tier[]>(tiersAwal)
  const barisAwal = useMemo(() => Object.fromEntries(initial.models.map(m => [kunci(m.tier_index), { model_id: m.model_id, sku: m.model_sku ?? '', price: String(m.price_info?.[0]?.original_price ?? m.price_info?.[0]?.current_price ?? ''), stock: String(m.stock_info_v2?.seller_stock?.[0]?.stock ?? m.stock_info_v2?.summary_info?.total_available_stock ?? '') }])), [initial.models]) as Record<string, Baris>
  const [rows, setRows] = useState<Record<string, Baris>>(barisAwal)
  const itemPrice = String(initial.price_info?.[0]?.original_price ?? initial.price_info?.[0]?.current_price ?? '')
  const itemStock = String(initial.stock_info_v2?.seller_stock?.[0]?.stock ?? initial.stock_info_v2?.summary_info?.total_available_stock ?? '')
  const [price, setPrice] = useState(itemPrice)
  const [stock, setStock] = useState(itemStock)
  const [massal, setMassal] = useState({ price: '', stock: '', sku: '' })
  // Pengiriman & lainnya
  const [weight, setWeight] = useState(initial.weight == null ? '' : String(initial.weight))
  const [dimension, setDimension] = useState(initial.dimension ?? { package_length: 0, package_width: 0, package_height: 0 })
  const [preorder, setPreorder] = useState(initial.pre_order ?? { is_pre_order: false, days_to_ship: 2 })
  const [itemSku, setItemSku] = useState(initial.item_sku ?? '')

  const meta = useQuery({ queryKey: ['listing-metadata', detail.akun_id, category], queryFn: () => workflow.listingMetadata(detail.akun_id, category), retry: false })
  const brands = useQuery({ queryKey: ['edit-listing-brands', detail.akun_id, category], queryFn: () => workflow.listingBrands(detail.akun_id, category, 0), retry: false })
  const upload = useMutation({ retry: false, mutationFn: (file: File) => workflow.uploadListingPhoto(detail.akun_id, file), onSuccess: (r, file) => { setImages(v => [...v, r.image_id]); setUrls(u => ({ ...u, [r.image_id]: URL.createObjectURL(file) })) } })

  const punyaVarian = initial.models.length > 0
  const combos = kombinasi(tiers)
  const baris = (c: number[]): Baris => rows[kunci(c)] ?? { sku: '', price: '', stock: '' }
  const setBaris = (c: number[], patch: Partial<Baris>) => setRows(r => ({ ...r, [kunci(c)]: { ...baris(c), ...patch } }))
  const comboBaru = (c: number[]) => !baris(c).model_id
  const ubahTier = (i: number, f: (t: Tier) => Tier) => setTiers(v => v.map((t, j) => j === i ? f(t) : t))
  const namaOpsi = (c: number[]) => c.map((x, i) => tiers[i]?.options[x]?.option || '…').join(' / ')

  // What changed, as the backend's one-request edit body.
  const body = useMemo(() => {
    const b: Record<string, unknown> = {}
    const item: management.ItemEdit = {}
    if (name !== initial.item_name) item.item_name = name
    if (description !== (initial.description ?? '')) item.description = description
    if (category !== initial.category_id) { item.category_id = category; item.attribute_list = attributes }
    if (sama(attributes, initial.attribute_list ?? [])) item.attribute_list = attributes
    if (sama(brand, initial.brand ?? NO_BRAND)) item.brand = brand
    if (sama(images, initial.image?.image_id_list ?? [])) item.image_ids = images
    if (weight !== (initial.weight == null ? '' : String(initial.weight))) item.weight = Number(weight)
    if (sama(dimension, initial.dimension ?? { package_length: 0, package_width: 0, package_height: 0 })) item.dimension = dimension
    if (sama(preorder, initial.pre_order ?? { is_pre_order: false, days_to_ship: 2 })) item.pre_order = preorder
    if (itemSku !== (initial.item_sku ?? '')) item.item_sku = itemSku
    if (Object.keys(item).length) { if (punyaVarian && (item.weight !== undefined || item.dimension)) item.apply_to_all_models = true; b.item = item }
    if (sama(tiers, tiersAwal)) b.tiers = tiers.map(t => ({ name: t.name, options: t.options.map(o => ({ option: o.option, asal: o.asal })) }))
    const hapus: string[] = [], tambah: unknown[] = [], ubah: unknown[] = []
    for (const c of combos) {
      const r = baris(c), awal = r.model_id ? barisAwal[kunci(c)] : undefined
      if (r.model_id && r.hapus) { hapus.push(r.model_id); continue }
      if (!r.model_id) { if (r.price) tambah.push({ tier_index: c, sku: r.sku, price: Number(r.price), stock: Number(r.stock || 0) }); continue }
      const m: Record<string, unknown> = { model_id: Number(r.model_id) }
      if (awal && r.sku !== awal.sku) m.model_sku = r.sku
      if (awal && r.price !== awal.price) m.price = Number(r.price)
      if (awal && r.stock !== awal.stock) m.stock = Number(r.stock)
      if (Object.keys(m).length > 1) ubah.push(m)
    }
    if (hapus.length) b.delete_models = hapus.map(Number)
    if (tambah.length) b.add_models = tambah
    if (ubah.length) b.models = ubah
    if (!tiers.length) { if (price !== itemPrice) b.price = Number(price); if (stock !== itemStock) b.stock = Number(stock) }
    return b
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, category, attributes, brand, images, weight, dimension, preorder, itemSku, tiers, rows, price, stock])

  const masalah: string[] = []
  if (!name.trim()) masalah.push('Nama produk wajib diisi.')
  if (!description.trim()) masalah.push('Deskripsi wajib diisi.')
  if (!images.length) masalah.push('Minimal satu foto.')
  tiers.forEach(t => { if (!t.name.trim() || t.options.some(o => !o.option.trim())) masalah.push(`Lengkapi nama variasi dan pilihannya${t.name ? ` (${t.name})` : ''}.`) })
  if (!punyaVarian && tiers.length && combos.some(c => !baris(c).price)) masalah.push('Isi harga untuk setiap varian baru.')
  if (punyaVarian) tiers.forEach((t, i) => t.options.filter(o => o.asal === null).forEach((_, k) => { const idx = t.options.length - 1 - k; if (!combos.filter(c => c[i] === idx).some(c => baris(c).price)) masalah.push(`Isi harga minimal satu varian untuk pilihan baru "${t.options[idx]?.option || '…'}".`) }))
  if (combos.some(c => !baris(c).hapus && baris(c).model_id && !baris(c).price)) masalah.push('Harga varian tidak boleh kosong.')
  if (punyaVarian && combos.every(c => baris(c).hapus || (!baris(c).model_id && !baris(c).price))) masalah.push('Minimal satu varian harus tersisa.')
  const adaPerubahan = Object.keys(body).length > 0

  const save = useMutation({ retry: false, mutationFn: () => management.editProduct(detail.id, body), onSuccess: r => {
    toast.success(`Tersimpan di Shopee: ${r.langkah.join(', ')}`); r.warnings.forEach(w => toast.warning(w))
    void qc.invalidateQueries({ queryKey: ['katalog'] }); void qc.invalidateQueries({ queryKey: ['pengaturan-produk', detail.id] }); kembali()
  } })
  const ringkas = () => {
    const out: string[] = []
    if (body.item) out.push('informasi produk/pengiriman')
    if (body.tiers) out.push('variasi')
    if (body.delete_models) out.push(`hapus ${(body.delete_models as unknown[]).length} varian`)
    if (body.add_models) out.push(`tambah ${(body.add_models as unknown[]).length} varian`)
    if (body.models) out.push(`ubah ${(body.models as unknown[]).length} varian (harga/stok/SKU)`)
    if (body.price !== undefined) out.push('harga')
    if (body.stock !== undefined) out.push('stok')
    return out.join(', ')
  }
  async function simpan() {
    if (await confirm({ title: 'Simpan perubahan ke Shopee?', description: `${detail.nama} · ${detail.nama_toko}\nYang diubah: ${ringkas()}.\nHarga dan stok langsung berlaku di Shopee.`, confirmLabel: 'Simpan' })) save.mutate()
  }
  async function batal() {
    if (!adaPerubahan || await confirm({ title: 'Buang perubahan?', description: 'Isian belum disimpan.', confirmLabel: 'Buang perubahan', cancelLabel: 'Lanjut mengisi', destructive: true })) kembali()
  }
  const busy = save.isPending || upload.isPending
  const namaKat = (cid: number) => { const c = meta.data?.categories.find(c => c.category_id === cid); return c ? workflow.namaKategori(c) : meta.isFetching ? 'Memuat nama kategori…' : `Kategori saat ini (ID ${cid})` }
  const sec = 'space-y-4 rounded-xl border bg-card p-4 sm:p-6'

  return <div className="space-y-4">
    <div className="flex items-start gap-3"><Button variant="outline" size="icon" className="size-10 shrink-0" onClick={() => void batal()} aria-label="Kembali"><ArrowLeft className="size-5" /></Button><div className="min-w-0"><h1 className="text-lg font-semibold sm:text-xl">Edit Produk</h1><p className="truncate text-sm text-muted-foreground">{detail.nama_toko} · {detail.nama}</p></div></div>
    <fieldset disabled={busy} className="min-w-0 space-y-4">
    <section className={sec} aria-labelledby="s-info">
      <h2 id="s-info" className="text-base font-semibold">Informasi Produk</h2>
      <div className="space-y-2"><p className="text-sm font-medium">Foto produk ({images.length}/9)</p>
        <div className="flex flex-wrap gap-2">{images.map((img, i) => <div key={img} className="relative"><img src={urls[img]} alt={`Foto ${i + 1}`} className="size-20 rounded-lg border object-cover" />{i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Utama</span>}<button type="button" aria-label={`Hapus foto ${i + 1}`} disabled={images.length <= 1} className="absolute -top-2 -right-2 rounded-full border bg-background p-1 shadow disabled:opacity-40" onClick={() => setImages(v => v.filter(x => x !== img))}><Trash2 className="size-3.5" /></button></div>)}
          {images.length < 9 && <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"><Plus className="size-5" />{upload.isPending ? 'Mengunggah…' : 'Tambah foto'}<input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }} /></label>}</div>
        {upload.error && <p className="text-sm text-destructive">{getApiError(upload.error)}</p>}</div>
      <div className="space-y-1"><Label htmlFor="e-nama">Nama produk</Label><Input id="e-nama" maxLength={255} value={name} onChange={e => setName(e.target.value)} /><p className="text-right text-xs text-muted-foreground">{name.length}/255</p></div>
      <div className="space-y-1"><Label htmlFor="e-kategori">Kategori</Label><PilihNative id="e-kategori" className={field} value={category} disabled={meta.isFetching} onChange={e => { setCategory(Number(e.target.value)); setAttributes([]); setBrand(NO_BRAND) }}><option value={category}>{namaKat(category)}</option>{meta.data?.categories.filter(c => !c.has_children && c.category_id !== category).map(c => <option key={c.category_id} value={c.category_id}>{workflow.namaKategori(c)}</option>)}</PilihNative></div>
      <div className="space-y-1"><Label htmlFor="e-desk">Deskripsi produk</Label><Textarea id="e-desk" rows={8} maxLength={12000} value={description} onChange={e => setDescription(e.target.value)} /><p className="text-right text-xs text-muted-foreground">{description.length}/12.000</p></div>
    </section>

    <section className={sec} aria-labelledby="s-spek">
      <h2 id="s-spek" className="text-base font-semibold">Spesifikasi</h2>
      <div className="space-y-1"><Label htmlFor="e-merek">Merek</Label><PilihNative id="e-merek" className={field} value={brand.brand_id} onChange={e => { const v = Number(e.target.value); const b = brands.data?.brand_list.find(b => b.brand_id === v); setBrand(b ?? NO_BRAND) }}><option value="0">Tanpa merek</option>{brand.brand_id !== 0 && !brands.data?.brand_list.some(b => b.brand_id === brand.brand_id) && <option value={brand.brand_id}>{brand.original_brand_name}</option>}{brands.data?.brand_list.filter(b => b.brand_id !== 0).map(b => <option key={b.brand_id} value={b.brand_id}>{b.original_brand_name}</option>)}</PilihNative></div>
      {meta.error && <QueryError error={meta.error} retry={meta.refetch} />}
      {meta.data && <div className="grid gap-x-4 sm:grid-cols-2 [&>div]:contents"><Attributes nodes={meta.data.attributes} values={attributes} change={setAttributes} /></div>}
    </section>

    <section className={sec} aria-labelledby="s-jual">
      <h2 id="s-jual" className="text-base font-semibold">Informasi Penjualan</h2>
      {tiers.map((t, i) => <div key={i} className="space-y-3 rounded-lg bg-muted/50 p-3">
        <div className="flex items-end gap-2"><div className="min-w-0 flex-1 space-y-1"><Label htmlFor={`v-${i}`}>Variasi {i + 1}</Label><Input id={`v-${i}`} maxLength={100} placeholder="mis. Warna" value={t.name} onChange={e => ubahTier(i, x => ({ ...x, name: e.target.value }))} /></div>
          {!punyaVarian && <Button type="button" variant="ghost" size="icon" aria-label={`Hapus variasi ${i + 1}`} onClick={() => setTiers(v => v.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>}</div>
        <div className="grid gap-2 sm:grid-cols-2">{t.options.map((o, j) => <div key={j} className="flex gap-2"><Input aria-label={`Pilihan ${j + 1} ${t.name}`} maxLength={100} placeholder="Pilihan, mis. Merah" value={o.option} onChange={e => ubahTier(i, x => ({ ...x, options: x.options.map((p, k) => k === j ? { ...p, option: e.target.value } : p) }))} />
          {o.asal === null && <Button type="button" variant="ghost" size="icon" aria-label="Hapus pilihan" onClick={() => { ubahTier(i, x => ({ ...x, options: x.options.filter((_, k) => k !== j) })); setRows(r => Object.fromEntries(Object.entries(r).filter(([k]) => Number(k.split('-')[i]) !== j))) }}><Trash2 className="size-4" /></Button>}</div>)}</div>
        <Button type="button" variant="outline" size="sm" disabled={t.options.length >= 50} onClick={() => ubahTier(i, x => ({ ...x, options: [...x.options, { option: '', asal: null }] }))}><Plus className="size-4" />Tambah pilihan</Button>
      </div>)}
      {tiers.length < 2 && (!punyaVarian
        ? <Button type="button" variant="outline" onClick={() => setTiers(v => [...v, { name: '', options: [{ option: '', asal: null }] }])}><Plus className="size-4" />{tiers.length ? 'Tambah variasi kedua' : 'Aktifkan variasi'}</Button>
        : <p className="text-xs text-muted-foreground">Menambah jenis variasi baru pada produk yang sudah bervarian hanya bisa di Seller Center.</p>)}
      {punyaVarian && <p className="text-xs text-muted-foreground">Pilihan lama bisa diganti namanya. Untuk menghapus pilihan, hapus semua varian yang memakainya.</p>}

      {tiers.length === 0 ? <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="e-harga">Harga</Label><MoneyInput id="e-harga" value={price} onChange={e => setPrice(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="e-stok">Stok</Label><Input id="e-stok" type="number" min={0} value={stock} onChange={e => setStock(e.target.value)} /></div></div>
      : <>
        <div className="space-y-2 rounded-lg border p-3"><p className="text-sm font-medium">Atur sekaligus</p><div className="grid grid-cols-3 gap-2 [&>*]:min-w-0"><MoneyInput aria-label="Harga untuk semua" placeholder="Harga" value={massal.price} onChange={e => setMassal(m => ({ ...m, price: e.target.value }))} /><Input aria-label="Stok untuk semua" type="number" min={0} placeholder="Stok" value={massal.stock} onChange={e => setMassal(m => ({ ...m, stock: e.target.value }))} /><Input aria-label="SKU untuk semua" placeholder="SKU" value={massal.sku} onChange={e => setMassal(m => ({ ...m, sku: e.target.value }))} /></div><Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={!massal.price && !massal.stock && !massal.sku} onClick={() => { setRows(r => { const n = { ...r }; combos.forEach(c => { const b = n[kunci(c)] ?? { sku: '', price: '', stock: '' }; if (b.hapus) return; n[kunci(c)] = { ...b, ...(massal.price ? { price: massal.price } : {}), ...(massal.stock ? { stock: massal.stock } : {}), ...(massal.sku ? { sku: massal.sku } : {}) } }); return n }); setMassal({ price: '', stock: '', sku: '' }) }}>Terapkan ke semua varian</Button></div>
        <div className="rounded-lg border">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_1fr_0.7fr_1fr_2.5rem] gap-2 border-b bg-muted p-2 text-sm font-medium sm:grid"><span>Varian</span><span>Harga</span><span>Stok</span><span>SKU</span><span className="sr-only">Aksi</span></div>
          {combos.map(c => { const r = baris(c), baru = comboBaru(c), n = namaOpsi(c); return <div key={kunci(c)} className={`grid grid-cols-3 items-center gap-2 border-b p-2 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_1fr_0.7fr_1fr_2.5rem] [&>*]:min-w-0 ${r.hapus ? 'bg-muted/60' : ''}`}>
            <div className="col-span-2 sm:col-span-1"><span className={`text-sm font-medium ${r.hapus ? 'line-through opacity-60' : ''}`}>{n}</span>{baru && <span className="block text-xs text-amber-700 dark:text-amber-400">{r.price ? 'Baru · akan ditambahkan' : 'Belum ada · isi harga untuk menambah'}</span>}{r.hapus && <span className="block text-xs text-destructive">Akan dihapus</span>}</div>
            <div className="flex justify-end sm:order-last">{!baru && <Button type="button" variant="ghost" size="icon" aria-label={r.hapus ? `Batal hapus ${n}` : `Hapus varian ${n}`} onClick={() => setBaris(c, { hapus: !r.hapus })}>{r.hapus ? <Undo2 className="size-4" /> : <Trash2 className="size-4" />}</Button>}</div>
            <label className="space-y-0.5"><span className="text-xs text-muted-foreground sm:sr-only">Harga</span><MoneyInput aria-label={`Harga ${n}`} disabled={r.hapus} value={r.price} onChange={e => setBaris(c, { price: e.target.value })} /></label>
            <label className="space-y-0.5"><span className="text-xs text-muted-foreground sm:sr-only">Stok</span><Input aria-label={`Stok ${n}`} type="number" min={0} disabled={r.hapus} value={r.stock} onChange={e => setBaris(c, { stock: e.target.value })} /></label>
            <label className="space-y-0.5"><span className="text-xs text-muted-foreground sm:sr-only">SKU</span><Input aria-label={`SKU ${n}`} maxLength={100} disabled={r.hapus} value={r.sku} onChange={e => setBaris(c, { sku: e.target.value })} /></label>
          </div> })}
        </div>
        <p className="text-xs text-muted-foreground">Harga dan stok langsung dikirim ke Shopee saat disimpan. Harga yang sedang ikut promosi tetap memakai harga promosi sampai promosinya selesai. {initial.models.length > 0 && `Total stok saat ini: ${initial.models.reduce((s, m) => s + (m.stock_info_v2?.summary_info?.total_available_stock ?? 0), 0)}. Harga ${fmtRp(Math.min(...initial.models.map(m => m.price_info?.[0]?.current_price ?? Infinity)))}–${fmtRp(Math.max(...initial.models.map(m => m.price_info?.[0]?.current_price ?? 0)))}.`}</p>
      </>}
    </section>

    <section className={sec} aria-labelledby="s-kirim">
      <h2 id="s-kirim" className="text-base font-semibold">Pengiriman</h2>
      <div className="space-y-1"><Label htmlFor="e-berat">Berat (kg)</Label><Input id="e-berat" type="number" min="0.001" step="0.001" value={weight} onChange={e => setWeight(e.target.value)} /></div>
      <div><p className="mb-1 text-sm font-medium">Ukuran paket (cm)</p><div className="grid grid-cols-3 gap-2">{(['package_length', 'package_width', 'package_height'] as const).map((k, i) => <Input key={k} aria-label={['Panjang', 'Lebar', 'Tinggi'][i]} placeholder={['Panjang', 'Lebar', 'Tinggi'][i]} type="number" min="1" step="1" value={dimension[k] || ''} onChange={e => setDimension(v => ({ ...v, [k]: Number(e.target.value) }))} />)}</div></div>
      {punyaVarian && <p className="text-xs text-muted-foreground">Berat dan ukuran paket berlaku untuk semua varian.</p>}
    </section>

    <section className={sec} aria-labelledby="s-lain">
      <h2 id="s-lain" className="text-base font-semibold">Lainnya</h2>
      <div className="space-y-2"><p className="text-sm font-medium">Pre-order</p><div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" name="po" className="size-4" checked={!preorder.is_pre_order} onChange={() => setPreorder(v => ({ ...v, is_pre_order: false }))} />Tidak</label><label className="flex items-center gap-2"><input type="radio" name="po" className="size-4" checked={preorder.is_pre_order} onChange={() => setPreorder(v => ({ ...v, is_pre_order: true }))} />Ya</label></div>{preorder.is_pre_order && <div className="space-y-1"><Label htmlFor="e-po">Waktu proses (hari)</Label><Input id="e-po" type="number" min={1} max={180} value={preorder.days_to_ship} onChange={e => setPreorder(v => ({ ...v, days_to_ship: Number(e.target.value) }))} /></div>}</div>
      <div className="space-y-1"><Label htmlFor="e-sku">SKU induk</Label><Input id="e-sku" maxLength={100} value={itemSku} onChange={e => setItemSku(e.target.value)} /></div>
    </section>
    </fieldset>

    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur lg:bottom-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
        <p role="status" className="w-full min-w-0 text-xs text-muted-foreground sm:mr-auto sm:w-auto sm:flex-1">{save.error ? <span className="text-destructive">{getApiError(save.error)}</span> : masalah[0] ?? (adaPerubahan ? `Akan disimpan: ${ringkas()}` : 'Belum ada perubahan.')}</p>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void batal()}>Batal</Button>
        <Button type="button" disabled={busy || !adaPerubahan || masalah.length > 0 || meta.isFetching} onClick={() => void simpan()}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
      </div>
    </div>
  </div>
}
