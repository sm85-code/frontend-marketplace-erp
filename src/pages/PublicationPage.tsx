import MoneyInput from '@/components/MoneyInput'
import Bantuan from '@/components/Bantuan'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as endpoints from '@/api/endpoints'
import * as api from '@/api/workflows'
import { useAuth } from '@/lib/auth'
import { getApiError } from '@/api/client'
import { BarHalaman, TabelData, type KolomTabel } from '@/components/daftar'
import QueryError from '@/components/QueryError'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Attributes from './publication/Attributes'
import { listingModels, modelLabel, reachableAttributes } from '@/lib/publication'

const fieldClass = 'w-full rounded-md border bg-background p-2 text-sm'
function blank(): api.Publication {
  return {
    operation_id: '',
    nama: '',
    deskripsi: '',
    sku: '',
    category_id: 0,
    price: '',
    stock: 0,
    weight: '',
    dimension: { package_length: 1, package_width: 1, package_height: 1 },
    pre_order: { is_pre_order: false, days_to_ship: 2 },
    condition: 'NEW',
    image_ids: [],
    attribute_list: [],
    logistic_info: [],
    brand_id: 0,
    brand_name: 'No Brand',
    tiers: [],
    models: [],
    aktif: false,
  }
}
function pending(key: string): { shop: string; payload: api.Publication } | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
export default function PublicationPage() {
  const { user } = useAuth()
  const key = `erp.publication.pending.${user?.id ?? 'anonymous'}`
  const [search] = useSearchParams()
  const draftKey = `erp.publication.draft.${user?.id ?? 'anonymous'}`
  const [saved] = useState(() => pending(key) ?? pending(draftKey))
  const [step,setStep]=useState(0)
  const [draftAt,setDraftAt]=useState('')
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({})
  const [shop, setShop] = useState(saved?.shop ?? '')
  const [source, setSource] = useState(search.get('source') ?? '')
  const [item, setItem] = useState(search.get('item') ?? '')
  const [form, setForm] = useState<api.Publication>(saved?.payload ?? blank())
  const [operation, setOperation] = useState(saved?.payload.operation_id ?? '')
  const [result, setResult] = useState<api.PublicationResult | null>(null)
  const [error, setError] = useState('')
  const [brandOffset, setBrandOffset] = useState(0)
  const confirm = useConfirm()
  const qc = useQueryClient()
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => endpoints.listAkun() })
  const meta = useQuery({
    queryKey: ['publikasi', 'metadata', shop, form.category_id],
    queryFn: () => api.listingMetadata(shop, form.category_id || undefined),
    enabled: !!shop,
    retry: false,
  })
  const brands = useQuery({
    queryKey: ['publikasi', 'brands', shop, form.category_id, brandOffset],
    queryFn: () => api.listingBrands(shop, form.category_id, brandOffset),
    enabled: !!shop && !!form.category_id,
    retry: false,
  })
  const products = useQuery({
    queryKey: ['publikasi', 'source', source],
    queryFn: () => endpoints.listKatalog({ akun_id: source, per_halaman: 100 }),
    enabled: !!source,
  })
  const copy = useMutation({
    retry: false,
    mutationFn: () => api.copyListing(source, item),
    onSuccess: (draft) => {
      setForm({ ...blank(), ...draft, operation_id: '', logistic_info: [], aktif: false })
      setError('')
      setBrandOffset(0)
    },
  })
  const chartUpload = useMutation({
    retry: false,
    mutationFn: (file: File) => api.uploadListingPhoto(shop, file),
    onSuccess: (r) => setForm((f) => ({ ...f, size_chart: r.image_id, size_chart_id: undefined })),
  })
  const upload = useMutation({
    retry: false,
    mutationFn: (file: File) => api.uploadListingPhoto(shop, file),
    onSuccess: (r) => setForm((f) => f.image_ids.includes(r.image_id) ? f : ({ ...f, image_ids: [...f.image_ids, r.image_id] })),
  })
  function applyResult(r: api.PublicationResult) {
    setResult(r)
    if (r.ok || r.status === 'belum_dikirim') sessionStorage.removeItem(key)
    if(r.ok) sessionStorage.removeItem(draftKey)
    if (r.status === 'belum_dikirim') { setOperation(''); setForm(f => ({ ...f, operation_id: '' })) }
    if (r.ok) void qc.invalidateQueries({ queryKey: ['katalog'] })
  }
  const publish = useMutation({
    retry: false,
    mutationFn: (payload: api.Publication) => api.publishListing(shop, payload),
    onSuccess: applyResult,
    onError: (e) => {
      // Framework input validation runs before orchestration or remote writes.
      const status = (e as { response?: { status?: number } }).response?.status
      if (status === 422 || status === 403) { sessionStorage.removeItem(key); setOperation(''); setForm(f => ({ ...f, operation_id: '' })) }
    },
  })
  const check = useMutation({
    retry: false,
    mutationFn: () => api.publicationResult(shop, operation),
    onSuccess: applyResult,
  })
  const busy = publish.isPending || check.isPending || upload.isPending || chartUpload.isPending || copy.isPending
  const locked = busy || !!operation
  useEffect(() => {
    if (operation || result?.ok) return
    const timer=setTimeout(()=>{ try { sessionStorage.setItem(draftKey,JSON.stringify({shop,payload:{...form,operation_id:''}}));setDraftAt(new Date().toLocaleTimeString('id-ID')) } catch { setDraftAt('') } },600)
    return ()=>clearTimeout(timer)
  },[draftKey,shop,form,operation,result?.ok])
  function validateStep(index: number) {
    const errors: Record<string,string>={}
    if(index===0&&!shop) errors['publish-shop']='Pilih toko tujuan'
    if(index===1) {
      if(!form.nama.trim()) errors['publish-name']='Nama produk wajib diisi'
      if(!form.deskripsi.trim()) errors['publish-description']='Deskripsi wajib diisi'
      if(!form.category_id) errors['publish-category']='Pilih kategori terakhir'
      if(!form.image_ids.length) errors['publish-photo']='Unggah minimal satu foto'
    }
    if(index===3) {
      if(!(Number(form.price)>0)) errors['publish-price']='Harga harus lebih dari nol'
      if(!(Number(form.weight)>0)) errors['publish-weight']='Berat paket harus lebih dari nol'
      if(!(form.logistic_info.length||meta.data?.channels.some(c=>c.force_enable))) errors['publish-logistics']='Pilih jasa kirim'
    }
    setFieldErrors(errors)
    if(Object.keys(errors).length) { setError(Object.values(errors)[0]);setTimeout(()=>document.getElementById(Object.keys(errors)[0])?.focus(),0);return false }
    setError('');return true
  }
  function next() { if(validateStep(step)) setStep(s=>Math.min(4,s+1)) }
  function patch(p: Partial<api.Publication>) {
    setForm((f) => ({ ...f, ...p }))
  }
  function models(tiers: api.Tier[]) {
    if (
      JSON.stringify(tiers.map((t) => [t.name, t.options.map((o) => o.option)])) ===
      JSON.stringify(form.tiers.map((t) => [t.name, t.options.map((o) => o.option)]))
    )
      return
    try {
      patch({ tiers, models: listingModels(tiers, [], form.price) })
      setError('')
    } catch (e) {
      setError(getApiError(e))
    }
  }
  function changeModel(index: number, p: Partial<api.ListingModel>) {
    patch({ models: form.models.map((m, i) => (i === index ? { ...m, ...p } : m)) })
  }
  async function submit() {
    if (locked || !shop) return
    for(const i of [0,1,3]) if(!validateStep(i)) {setStep(i);return}
    if (!meta.data || meta.error || meta.isFetching) {
      setError('Muat metadata toko dan kategori sampai lengkap.')
      return
    }
    if (
      !form.nama.trim() ||
      !form.deskripsi.trim() ||
      !form.image_ids.length ||
      !(form.logistic_info.length || meta.data.channels.some((c) => c.force_enable)) ||
      !form.category_id ||
      !form.price ||
      !form.weight
    ) {
      setError('Lengkapi nama, deskripsi, kategori, harga, berat, foto dan jasa kirim.')
      return
    }
    if (
      !(await confirm({
        title: 'Buat produk di Shopee?',
        description: `${form.nama} → ${shops.data?.find((s) => s.id === shop)?.nama_toko}. ${form.models.length} varian. Stok toko tujuan sesuai formulir; stok ERP tidak berubah. ${form.aktif ? 'Produk diaktifkan setelah seluruh varian dikonfirmasi.' : 'Produk akan disembunyikan untuk diperiksa dahulu.'}`,
      }))
    )
      return
    const forced = meta.data.channels
      .filter((c) => c.force_enable && !form.logistic_info.some((l) => l.logistic_id === c.logistics_channel_id))
      .map((c) => ({ logistic_id: c.logistics_channel_id, enabled: true, is_free: false }))
    const payload = { ...form, logistic_info: [...form.logistic_info, ...forced], operation_id: crypto.randomUUID() }
    try {
      sessionStorage.setItem(key, JSON.stringify({ shop, payload }))
    } catch {
      setError('Penyimpanan browser tidak tersedia. Izinkan penyimpanan agar hasil operasi dapat diperiksa setelah koneksi terputus.')
      return
    }
    setOperation(payload.operation_id)
    patch({ operation_id: payload.operation_id })
    setError('')
    publish.mutate(payload)
  }
  const columns: KolomTabel<api.ListingModel>[] = [
    { kunci: 'variant', judul: 'Pilihan varian', tetap: true, sel: (m) => modelLabel(form.tiers, m.tier_index), kelas: 'min-w-[160px]' },
    {
      kunci: 'sku',
      judul: 'SKU',
      sel: (m) => (
        <Input
          aria-label={`SKU ${modelLabel(form.tiers, m.tier_index)}`}
          value={m.sku}
          onChange={(e) => changeModel(form.models.indexOf(m), { sku: e.target.value })}
        />
      ),
    },
    {
      kunci: 'price',
      judul: 'Harga',
      sel: (m) => (
        <MoneyInput
          aria-label={`Harga ${modelLabel(form.tiers, m.tier_index)}`}
          type="number"
          min="0.01"
          step="any"
          value={m.price}
          onChange={(e) => changeModel(form.models.indexOf(m), { price: e.target.value })}
        />
      ),
    },
    {
      kunci: 'stock',
      judul: 'Stok',
      sel: (m) => (
        <Input
          aria-label={`Stok ${modelLabel(form.tiers, m.tier_index)}`}
          type="number"
          min="0"
          step="1"
          value={m.stock}
          onChange={(e) => changeModel(form.models.indexOf(m), { stock: Number(e.target.value) })}
        />
      ),
    },
    {
      kunci: 'weight',
      judul: 'Berat kg',
      sel: (m) => (
        <Input
          aria-label={`Berat ${modelLabel(form.tiers, m.tier_index)}`}
          placeholder="Ikuti induk"
          type="number"
          min="0.001"
          step="any"
          value={m.weight ?? ''}
          onChange={(e) => changeModel(form.models.indexOf(m), { weight: e.target.value || undefined })}
        />
      ),
    },
    {
      kunci: 'dimension',
      judul: 'Dimensi cm',
      sel: (m) => (
        <div className="flex gap-1">
          {(['package_length', 'package_width', 'package_height'] as const).map((k, i) => (
            <Input
              key={k}
              className="w-20"
              aria-label={`${['Panjang', 'Lebar', 'Tinggi'][i]} ${modelLabel(form.tiers, m.tier_index)}`}
              type="number"
              min="1"
              placeholder="Induk"
              value={m.dimension?.[k] ?? ''}
              onChange={(e) =>
                changeModel(form.models.indexOf(m), {
                  weight: e.target.value ? m.weight || form.weight : m.weight,
                  dimension: e.target.value ? { ...(m.dimension ?? form.dimension), [k]: Number(e.target.value) } : undefined,
                })
              }
            />
          ))}
        </div>
      ),
    },
    {
      kunci: 'preorder',
      judul: 'Preorder / DTS',
      sel: (m) => (
        <div className="space-y-1">
          <select
            className={fieldClass}
            aria-label={`Preorder ${modelLabel(form.tiers, m.tier_index)}`}
            value={m.pre_order ? String(m.pre_order.is_pre_order) : ''}
            onChange={(e) =>
              changeModel(form.models.indexOf(m), {
                pre_order: e.target.value
                  ? { is_pre_order: e.target.value === 'true', days_to_ship: form.pre_order.days_to_ship }
                  : undefined,
              })
            }
          >
            <option value="">Ikuti induk</option>
            <option value="false">Ready stock</option>
            <option value="true">Preorder</option>
          </select>
          {m.pre_order && (
            <Input
              aria-label={`Hari kirim ${modelLabel(form.tiers, m.tier_index)}`}
              type="number"
              min="1"
              value={m.pre_order.days_to_ship}
              onChange={(e) =>
                changeModel(form.models.indexOf(m), { pre_order: { ...m.pre_order!, days_to_ship: Number(e.target.value) } })
              }
            />
          )}
        </div>
      ),
    },
    {
      kunci: 'gtin',
      judul: 'GTIN',
      sel: (m) => (
        <Input
          aria-label={`GTIN ${modelLabel(form.tiers, m.tier_index)}`}
          value={m.gtin_code ?? ''}
          onChange={(e) => changeModel(form.models.indexOf(m), { gtin_code: e.target.value || undefined })}
        />
      ),
    },
  ]
  return (
    <div className="min-w-0 space-y-4">
      <BarHalaman judul="Buat / Salin Produk" deskripsi="Produk baru di toko tujuan, dengan pilihan varian terpisah.">
        <Button asChild variant="outline">
          <Link to="/katalog">Kembali ke Katalog</Link>
        </Button>
      </BarHalaman>
      <Bantuan><p className="rounded-lg border bg-card p-4 text-sm">
        Isi data atau ambil produk sumber. Periksa kategori dan jasa kirim toko tujuan. Stok salinan dimulai dari 0; isi stok yang
        benar-benar tersedia. Harga menggunakan harga asli, bukan harga diskon. Angka harga mengikuti mata uang toko tujuan.
      </p></Bantuan>
      {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
      <nav aria-label="Langkah publikasi" className="flex flex-wrap gap-2">{['Sumber & Toko','Informasi Produk','Varian','Harga & Pengiriman','Tinjau'].map((label,i)=><Button key={label} size="sm" variant={step===i?'default':'outline'} aria-current={step===i?'step':undefined} disabled={busy} onClick={()=>setStep(i)}>{i+1}. {label}</Button>)}</nav>
      {draftAt&&!operation&&!result?.ok&&<p className="text-xs text-muted-foreground">Draft tersimpan di perangkat ini · {draftAt}</p>}
      <fieldset disabled={locked} className="min-w-0 space-y-4">
        <section hidden={step!==0} className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">1. Toko dan sumber</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="publish-shop">Toko tujuan</Label>
              <select
                id="publish-shop"
                className={fieldClass}
                value={shop}
                onChange={(e) => {
                  setShop(e.target.value)
                  patch({ logistic_info: [], attribute_list: [], brand_id: 0, brand_name: 'No Brand' })
                  setBrandOffset(0)
                }}
              >
                <option value="">Pilih toko Shopee</option>
                {shops.data
                  ?.filter((s) => s.platform === 'shopee')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_toko}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="source-shop">Toko sumber (opsional)</Label>
              <select
                id="source-shop"
                className={fieldClass}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value)
                  setItem('')
                }}
              >
                <option value="">Buat dari awal</option>
                {shops.data
                  ?.filter((s) => s.platform === 'shopee')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_toko}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {source && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="source-product">Produk sumber</Label>
                <select id="source-product" className={fieldClass} value={item} onChange={(e) => setItem(e.target.value)}>
                  <option value="">Pilih produk</option>
                  {products.data?.items.map((p) => (
                    <option key={p.item_id} value={p.item_id}>
                      {p.nama} · {p.item_id}
                    </option>
                  ))}
                </select>
                <Input
                  className="mt-2"
                  aria-label="ID produk sumber jika tidak ada di daftar"
                  placeholder="Atau isi ID produk sumber"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                />
              </div>
              <Button type="button" disabled={!item || copy.isPending} onClick={() => copy.mutate()}>
                Ambil Salinan
              </Button>
            </div>
          )}
          {products.error && <QueryError error={products.error} retry={products.refetch} />}
          {copy.error && (
            <p role="alert" className="text-destructive">
              {getApiError(copy.error)}
            </p>
          )}
        </section>
        <section hidden={step!==1} className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">2. Informasi produk</h2>
          <div>
            <Label htmlFor="publish-name">Nama produk (tanpa pilihan varian)</Label>
            <Input id="publish-name" value={form.nama} onChange={(e) => patch({ nama: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="publish-sku">SKU induk</Label>
            <Input id="publish-sku" value={form.sku} onChange={(e) => patch({ sku: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="publish-description">Deskripsi</Label>
            <Textarea id="publish-description" rows={5} value={form.deskripsi} onChange={(e) => patch({ deskripsi: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="publish-category">Kategori toko tujuan</Label>
            <select
              id="publish-category"
              className={fieldClass}
              value={form.category_id || ''}
              onChange={(e) => {
                patch({ category_id: Number(e.target.value), attribute_list: [], brand_id: 0, brand_name: 'No Brand' })
                setBrandOffset(0)
              }}
            >
              <option value="">Pilih kategori terakhir</option>
              {meta.data?.categories
                .filter((c) => !c.has_children)
                .map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.display_category_name || c.original_category_name} · {c.category_id}
                  </option>
                ))}
            </select>
          </div>
          {meta.error && <QueryError error={meta.error} retry={meta.refetch} />}
          {meta.isFetching && <p role="status">Memuat kategori, atribut dan batas toko…</p>}
          {meta.data && (
            <Attributes
              nodes={meta.data.attributes}
              values={form.attribute_list}
              change={(values) => patch({ attribute_list: reachableAttributes(meta.data!.attributes, values) })}
            />
          )}
          <div>
            <Label htmlFor="publish-brand">Merek</Label>
            <select
              id="publish-brand"
              className={fieldClass}
              value={form.brand_id}
              onChange={(e) => {
                const b = brands.data?.brand_list.find((b) => b.brand_id === Number(e.target.value))
                patch({ brand_id: Number(e.target.value), brand_name: b?.original_brand_name || 'No Brand' })
              }}
            >
              <option value="0">Tanpa merek</option>
              {form.brand_id !== 0 && !brands.data?.brand_list.some((b) => b.brand_id === form.brand_id) && (
                <option value={form.brand_id}>{form.brand_name} (periksa merek tujuan)</option>
              )}
              {brands.data?.brand_list.map((b) => (
                <option key={b.brand_id} value={b.brand_id}>
                  {b.original_brand_name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="outline" disabled={brandOffset === 0} onClick={() => setBrandOffset(0)}>
                Merek awal
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!brands.data?.has_next_page}
                onClick={() => setBrandOffset(brands.data!.next_offset)}
              >
                Merek berikutnya
              </Button>
            </div>
            {brands.error && <QueryError error={brands.error} retry={brands.refetch} />}
          </div>
          <div>
            <Label htmlFor="publish-condition">Kondisi</Label>
            <select
              id="publish-condition"
              className={fieldClass}
              value={form.condition}
              onChange={(e) => patch({ condition: e.target.value as 'NEW' | 'USED' })}
            >
              <option value="NEW">Baru</option>
              <option value="USED">Bekas</option>
            </select>
          </div>
          <div>
            <Label htmlFor="publish-photo">Foto JPG/PNG (maks. 10 MB/foto, 9 foto)</Label>
            <Input
              id="publish-photo"
              type="file"
              accept="image/jpeg,image/png"
              disabled={!shop || form.image_ids.length >= 9}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload.mutate(file)
                e.target.value = ''
              }}
            />
            <p className="text-sm text-muted-foreground">
              {form.image_ids.length} foto terpasang {copy.data ? '(termasuk foto sumber)' : ''}.
            </p>
            <div className="flex flex-wrap gap-2">
              {form.image_ids.map((id, i) => (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  key={id}
                  onClick={() => patch({ image_ids: form.image_ids.filter((x) => x !== id) })}
                >
                  Hapus foto {i + 1}
                </Button>
              ))}
            </div>
            {upload.error && (
              <p role="alert" className="text-destructive">
                {getApiError(upload.error)}
              </p>
            )}
          </div>
        </section>
        <section hidden={step!==3} className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">4. Harga, stok dan pengiriman</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['price', 'stock', 'weight'] as const).map((k, i) => (
              <div key={k}>
                <Label htmlFor={`publish-${k}`}>{['Harga asli (mata uang toko)', 'Stok toko tujuan', 'Berat paket (kg)'][i]}</Label>
                <Input
                  id={`publish-${k}`}
                  type="number"
                  step={k === 'stock' ? '1' : 'any'}
                  min={k === 'stock' ? '0' : '0.001'}
                  value={form[k]}
                  onChange={(e) => patch({ [k]: k === 'stock' ? Number(e.target.value) : e.target.value })}
                />
              </div>
            ))}
            {(['package_length', 'package_width', 'package_height'] as const).map((k, i) => (
              <div key={k}>
                <Label htmlFor={`publish-${k}`}>{['Panjang', 'Lebar', 'Tinggi'][i]} paket (cm)</Label>
                <Input
                  id={`publish-${k}`}
                  type="number"
                  min="1"
                  value={form.dimension[k] ?? ''}
                  onChange={(e) => patch({ dimension: { ...form.dimension, [k]: Number(e.target.value) } })}
                />
              </div>
            ))}
          </div>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={form.pre_order.is_pre_order}
              onChange={(e) => patch({ pre_order: { ...form.pre_order, is_pre_order: e.target.checked } })}
            />
            Produk preorder
          </label>
          <div>
            <Label htmlFor="publish-dts">Hari sampai dikirim (DTS)</Label>
            <Input
              id="publish-dts"
              type="number"
              min="1"
              value={form.pre_order.days_to_ship}
              onChange={(e) => patch({ pre_order: { ...form.pre_order, days_to_ship: Number(e.target.value) } })}
            />
            <p className="text-xs text-muted-foreground">
              {meta.data?.limits.dts_limit
                ? `Batas kategori: preorder ${meta.data.limits.dts_limit.days_to_ship_limit?.min_limit}–${meta.data.limits.dts_limit.days_to_ship_limit?.max_limit} hari; ready stock ${meta.data.limits.dts_limit.non_pre_order_days_to_ship} hari.`
                : 'Batas DTS dimuat sesuai kategori.'}
            </p>
          </div>
          <div>
            <Label htmlFor="publish-gtin">GTIN induk (00 hanya jika kategori memperbolehkan)</Label>
            <Input id="publish-gtin" value={form.gtin_code ?? ''} onChange={(e) => patch({ gtin_code: e.target.value || undefined })} />
          </div>
          <div>
            <Label htmlFor="publish-location">ID gudang Shopee (opsional, hanya jika toko memakai multi-gudang)</Label>
            <Input
              id="publish-location"
              value={form.location_id ?? ''}
              onChange={(e) => patch({ location_id: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publish-chart">Foto panduan ukuran (jika diwajibkan kategori)</Label>
            <Input
              id="publish-chart"
              type="file"
              accept="image/jpeg,image/png"
              disabled={!shop}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) chartUpload.mutate(file)
                e.target.value = ''
              }}
            />
            <p className="text-xs text-muted-foreground">
              {form.size_chart ? 'Foto panduan ukuran terpasang.' : 'Belum ada foto panduan ukuran.'}
            </p>
            <Label htmlFor="publish-chart-template">Atau ID template ukuran Shopee</Label>
            <Input
              id="publish-chart-template"
              type="number"
              min="1"
              value={form.size_chart_id ?? ''}
              onChange={(e) => patch({ size_chart_id: e.target.value ? Number(e.target.value) : undefined, size_chart: undefined })}
            />
            {chartUpload.error && (
              <p role="alert" className="text-destructive">
                {getApiError(chartUpload.error)}
              </p>
            )}
          </div>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={form.item_dangerous === 1}
              onChange={(e) => patch({ item_dangerous: e.target.checked ? 1 : 0 })}
            />
            Produk berbahaya sesuai ketentuan Shopee (Indonesia/Malaysia)
          </label>
          <h3 className="font-medium">Jasa kirim aktif di toko tujuan</h3>
          {meta.data?.channels
            .filter((c) => c.enabled)
            .map((c) => {
              const l = form.logistic_info.find((l) => l.logistic_id === c.logistics_channel_id)
              return (
                <div key={c.logistics_channel_id} className="space-y-1">
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={!!l || !!c.force_enable}
                      disabled={!!c.force_enable}
                      onChange={(e) =>
                        patch({
                          logistic_info: e.target.checked
                            ? [...form.logistic_info, { logistic_id: c.logistics_channel_id, enabled: true, is_free: false }]
                            : form.logistic_info.filter((l) => l.logistic_id !== c.logistics_channel_id),
                        })
                      }
                    />
                    {c.logistics_channel_name}
                    {c.force_enable ? ' (wajib Shopee)' : ''}
                  </label>
                  {l && c.fee_type === 'CUSTOM_PRICE' && (
                    <Input
                      type="number"
                      min="0"
                      aria-label={`Ongkos ${c.logistics_channel_name}`}
                      placeholder="Ongkos kirim"
                      value={l.shipping_fee ?? ''}
                      onChange={(e) =>
                        patch({ logistic_info: form.logistic_info.map((x) => (x === l ? { ...x, shipping_fee: e.target.value } : x)) })
                      }
                    />
                  )}
                  {(l || c.force_enable) && c.fee_type === 'SIZE_SELECTION' && (
                    <select
                      className={fieldClass}
                      aria-label={`Ukuran ${c.logistics_channel_name}`}
                      value={l?.size_id ?? ''}
                      onChange={(e) => {
                        const value = {
                          logistic_id: c.logistics_channel_id,
                          enabled: true,
                          is_free: false,
                          ...l,
                          size_id: Number(e.target.value),
                        }
                        patch({ logistic_info: [...form.logistic_info.filter((x) => x.logistic_id !== c.logistics_channel_id), value] })
                      }}
                    >
                      <option value="">Pilih ukuran kirim</option>
                      {c.size_list?.map((s) => (
                        <option key={s.size_id} value={s.size_id}>
                          {s.name || s.size_id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
        </section>
        <section hidden={step!==2} className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">3. Variasi produk</h2>
          <p className="text-sm text-muted-foreground">
            Maksimal 2 jenis variasi dan 50 kombinasi. Contoh: Warna → Merah, Biru. Mengubah pilihan membentuk ulang tabel, jadi atur
            pilihan sebelum mengisi SKU/harga. Kosongkan fisik/DTS varian untuk mengikuti induk.
          </p>
          {form.tiers.map((t, i) => (
            <div className="grid gap-2 sm:grid-cols-2" key={i}>
              <div>
                <Label htmlFor={`tier-${i}`}>Jenis variasi {i + 1}</Label>
                <Input
                  id={`tier-${i}`}
                  value={t.name}
                  onChange={(e) => patch({ tiers: form.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                />
              </div>
              <div>
                <Label htmlFor={`options-${i}`}>Pilihan (pisahkan dengan koma)</Label>
                <Input
                  id={`options-${i}`}
                  defaultValue={t.options.map((o) => o.option).join(', ')}
                  key={`${copy.submittedAt}-${i}-${form.tiers.length}`}
                  onBlur={(e) =>
                    models(
                      form.tiers.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              options: e.target.value
                                .split(',')
                                .map((v) => v.trim())
                                .filter(Boolean)
                                .map((option) => ({ option })),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.tiers.length >= 2}
              onClick={() => models([...form.tiers, { name: '', options: [{ option: 'Pilihan 1' }] }])}
            >
              Tambah jenis variasi
            </Button>
            <Button type="button" variant="outline" disabled={!form.tiers.length} onClick={() => models(form.tiers.slice(0, -1))}>
              Hapus jenis terakhir
            </Button>
          </div>
          {!!form.models.length && (
            <TabelData
              label="Pemetaan varian produk baru"
              items={form.models}
              kolom={columns}
              idDari={(m) => m.tier_index.join(':')}
              namaDari={(m) => modelLabel(form.tiers, m.tier_index)}
              minWidth={1400}
            />
          )}
        </section>
        <label className="flex gap-2 items-center">
          <input type="checkbox" checked={form.aktif} onChange={(e) => patch({ aktif: e.target.checked })} />
          Aktifkan setelah semua varian terkonfirmasi (default: disembunyikan)
        </label>
        <section hidden={step!==4} className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">5. Tinjau sebelum membuat produk</h2><dl className="grid gap-3 sm:grid-cols-2">{[
          ['Toko',shops.data?.find(s=>s.id===shop)?.nama_toko??'Belum dipilih'],['Produk',form.nama||'Belum diisi'],['Harga',form.price||'Belum diisi'],['Stok',String(form.stock)],['Varian',String(form.models.length)],['Foto',String(form.image_ids.length)],['Berat paket',`${form.weight||'—'} kg`],['Status awal',form.aktif?'Aktif setelah konfirmasi':'Disembunyikan'],
        ].map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl></section>
      </fieldset>
      {Object.keys(fieldErrors).length>0&&<ul role="alert" className="space-y-1 text-sm text-destructive">{Object.entries(fieldErrors).map(([id,message])=><li key={id}><button type="button" className="underline" onClick={()=>document.getElementById(id)?.focus()}>{message}</button></li>)}</ul>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {publish.error && (
        <p role="alert" className="text-destructive">
          {getApiError(publish.error)} Periksa hasil operasi sebelum tindakan berikutnya.
        </p>
      )}
      {check.error && (
        <p role="alert" className="text-destructive">
          {getApiError(check.error)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {step>0&&<Button variant="outline" disabled={busy} onClick={()=>setStep(s=>s-1)}>Sebelumnya</Button>}
        {step<4&&<Button disabled={locked} onClick={next}>Lanjut</Button>}
        {step===4&&<Button disabled={locked || !shop || meta.isFetching || !!meta.error} onClick={submit}>
          {publish.isPending ? 'Memproses publikasi…' : 'Periksa dan Buat Produk'}
        </Button>}
        {operation && (
          <Button variant="outline" disabled={busy} onClick={() => check.mutate()}>
            Periksa Hasil Operasi
          </Button>
        )}
        {result && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (
                !result.ok &&
                !(await confirm({
                  title: 'Mulai produk baru yang berbeda?',
                  description: `Hasil operasi sebelumnya ${result.status}, ID ${result.item_id ?? 'belum diketahui'}. Pastikan sudah memeriksa katalog/Seller Centre dan jangan gunakan formulir baru untuk membuat ulang produk yang sama.`,
                  destructive: true,
                }))
              )
                return
              setForm(blank())
              setResult(null)
              setOperation('')
              sessionStorage.removeItem(key)
            }}
          >
            Mulai formulir baru
          </Button>
        )}
      </div>
      {operation && (
        <p className="text-xs break-all text-muted-foreground">
          Operasi: {operation}. Jika koneksi terputus, gunakan Periksa Hasil Operasi; jangan membuat ulang.
        </p>
      )}
      {result && (
        <div role="status" className="rounded-lg border bg-card p-4 space-y-2">
          <p>
            {result.ok ? 'Produk dikonfirmasi' : result.status === 'belum_dikirim' ? 'Belum dikirim; formulir dapat diperbaiki' : 'Hasil belum lengkap/pasti'} · {result.status} · ID produk:{' '}
            {result.item_id ?? 'belum tersedia'}
          </p>
          {result.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
          {result.request_id && <p className="text-xs break-all">Request ID: {result.request_id}</p>}
        </div>
      )}
    </div>
  )
}
