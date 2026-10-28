import PilihNative from '@/components/PilihNative'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import * as management from '@/api/management'
import { fmtDateTime, fmtRp, getApiError } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import MoneyInput from '@/components/MoneyInput'
import ShopeeEngagement from './ShopeeEngagement'
import { BarisAksi } from './bagian'
const field = 'w-full rounded-lg border bg-background p-2'
const time = (value?: number) => value ? fmtDateTime(new Date(value * 1000).toISOString()) : '—'

/** Variants at Shopee: list, add (with a new option), delete. */
export function VarianShopee({ detail }: { detail: KatalogDetail }) {
  const [variantsOpen, setVariantsOpen] = useState(false)
  return <>
    <BarisAksi judul="Tambah / hapus varian" ket="Lihat varian di Shopee, tambah varian (boleh dengan pilihan baru), atau hapus."><Button variant="outline" size="sm" onClick={() => setVariantsOpen(true)}>Kelola</Button></BarisAksi>
    <Dialog open={variantsOpen} onOpenChange={setVariantsOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Kelola varian Shopee</DialogTitle></DialogHeader>{variantsOpen && <Variants id={detail.id} />}</DialogContent></Dialog>
  </>
}

/** Taking the product off Shopee. */
export function HapusShopee({ detail, close }: { detail: KatalogDetail; close: () => void }) {
  const confirm = useConfirm(), qc = useQueryClient()
  const remove = useMutation({ retry: false, mutationFn: () => api.deleteProduct(detail.id), onSuccess: result => { toast.success('Produk dihapus dari Shopee'); result.warnings.forEach(w => toast.warning(w)); void qc.invalidateQueries({ queryKey: ['katalog'] }); void qc.invalidateQueries({ queryKey: ['listing'] }); close() } })
  return <>
    <BarisAksi judul="Hapus dari Shopee" ket={`Produk dihapus di ${detail.nama_toko}. Riwayat pesanan dan stok ERP tetap tersimpan.`}>
      <Button variant="destructive" size="sm" disabled={remove.isPending || detail.status === 'SELLER_DELETE'} onClick={async () => { if (await confirm({ title: 'Hapus produk dari Shopee?', description: `${detail.nama}. Produk akan dihapus di ${detail.nama_toko}; riwayat pesanan dan stok ERP tetap tersimpan.`, destructive: true })) remove.mutate() }}>Hapus</Button>
    </BarisAksi>
    {remove.error && <p role="alert" className="pb-3 text-sm text-destructive">{getApiError(remove.error)}</p>}
  </>
}

/** The promotion segment of a product: boost, running promotions, and violations. Each loads when the segment opens. */
export function PromosiProduk({ detail }: { detail: KatalogDetail }) {
  const promotions = useQuery({ queryKey: ['product-promotions', detail.id], queryFn: () => api.productPromotions(detail.id), retry: false })
  const violations = useQuery({ queryKey: ['product-violations', detail.id], queryFn: () => api.productViolations(detail.id), retry: false })
  return <div className="space-y-4">
    <section className="rounded-xl border p-4"><ShopeeEngagement key={detail.id} detail={detail} bagian="boost" /></section>
    <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Promosi produk</h2>{promotions.isPending && <Spinner column />}{promotions.error && <QueryError error={promotions.error} retry={promotions.refetch} />}{promotions.data?.promotion.map((p, i) => <div key={`${p.promotion_id}:${i}`} className="rounded-lg bg-muted p-3"><p className="font-medium">{p.promotion_type} · {p.promotion_staging}</p><p className="text-sm">{time(p.start_time)} – {time(p.end_time)} WIB</p>{p.promotion_price_info?.map((price, j) => <p key={j} className="font-medium">{fmtRp(price.promotion_price)}</p>)}</div>)}{promotions.data && !promotions.data.promotion.length && <p className="text-sm text-muted-foreground">Tidak ada promosi untuk produk ini.</p>}</section>
    <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Pelanggaran dan pembatasan pencarian</h2>{violations.isPending && <Spinner column />}{violations.error && <QueryError error={violations.error} retry={violations.refetch} />}{violations.data && <><p className="text-sm">Status Shopee: {violations.data.item_status}{violations.data.deboost ? ' · Peringkat pencarian diturunkan' : ''}</p>{[...(violations.data.item_status_details ?? []), ...(violations.data.deboost_details ?? [])].map((v, i) => <div key={i} className="rounded-lg bg-muted p-3"><p className="font-medium">{v.violation_type}</p><p>{v.violation_reason}</p><p className="mt-1 text-sm">{v.suggestion}</p>{v.fix_deadline_time ? <p className="mt-1 text-xs text-muted-foreground">Batas perbaikan: {time(v.fix_deadline_time)} WIB</p> : null}</div>)}{!violations.data.item_status_details?.length && !violations.data.deboost_details?.length && <p className="text-sm text-muted-foreground">Tidak ada pelanggaran.</p>}</>}</section>
  </div>
}

function Variants({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['pengaturan-produk', id], queryFn: () => management.settings(id), staleTime: 0, retry: false })
  return <>{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data && <VariantForm key={JSON.stringify(q.data)} id={id} initial={q.data} />}</>
}
const BARU = '__baru'
/** Add a variant: pick an existing option per variation or type a new one (added to the variation first). */
function VariantForm({ id, initial }: { id: string; initial: management.ItemSettings }) {
  const [pilih, setPilih] = useState<string[]>(initial.tiers.map(() => ''))
  const [baru, setBaru] = useState<string[]>(initial.tiers.map(() => ''))
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [tierName, setTierName] = useState('Warna')
  const [options, setOptions] = useState('')
  const confirm = useConfirm(), qc = useQueryClient()
  const success = (r: { warnings: string[] }) => { toast.success('Perubahan varian dikonfirmasi Shopee'); r.warnings.forEach(w => toast.warning(w)); void qc.invalidateQueries({ queryKey: ['pengaturan-produk', id] }); void qc.invalidateQueries({ queryKey: ['katalog'] }) }
  const ada = initial.tiers.length > 0
  const namaBaru = (i: number) => baru[i].trim()
  const indices = initial.tiers.map((t, i) => pilih[i] === BARU ? t.option_list.length : pilih[i] === '' ? -1 : Number(pilih[i]))
  const duplikat = initial.tiers.some((t, i) => pilih[i] === BARU && t.option_list.some(o => o.option.trim().toLowerCase() === namaBaru(i).toLowerCase()))
  const lengkap = initial.tiers.every((_, i) => pilih[i] === BARU ? !!namaBaru(i) : pilih[i] !== '')
  const exists = lengkap && initial.models.some(m => JSON.stringify(m.tier_index) === JSON.stringify(indices))
  const adaBaru = pilih.includes(BARU)
  const add = useMutation({ retry: false, mutationFn: async () => {
    if (!ada) return api.initVariants(id, { tiers: [{ name: tierName, options: options.split(',').map(o => ({ option: o.trim() })) }], models: options.split(',').map((_, i) => ({ tier_index: [i], sku: sku ? `${sku}-${i + 1}` : '', price: Number(price), stock: Number(stock) })) })
    if (adaBaru) {
      // Shopee only accepts a model whose options already exist, so the new option is appended to its variation first.
      await management.editTiers(id, {
        standardise_tier_variation: initial.tiers.map((t, i) => ({ variation_id: 0, variation_name: t.name, variation_option_list: [...t.option_list.map(o => ({ variation_option_id: 0, variation_option_name: o.option, ...(o.image?.image_id ? { image_id: o.image.image_id } : {}) })), ...(pilih[i] === BARU ? [{ variation_option_id: 0, variation_option_name: namaBaru(i) }] : [])] })),
        model_list: initial.models.map(m => ({ model_id: m.model_id, tier_index: m.tier_index })),
      }).catch((e: unknown) => { throw Object.assign(new Error(`Pilihan baru gagal ditambahkan: ${getApiError(e)}`)) })
      try { return await api.addVariant(id, { tier_index: indices, sku, price: Number(price), stock: Number(stock) }) }
      catch (e) { void qc.invalidateQueries({ queryKey: ['pengaturan-produk', id] }); throw new Error(`Pilihan baru sudah ditambahkan, tetapi varian belum dibuat: ${getApiError(e)} Muat ulang lalu pilih pilihan tersebut.`) }
    }
    return api.addVariant(id, { tier_index: indices, sku, price: Number(price), stock: Number(stock) })
  }, onSuccess: success })
  const remove = useMutation({ retry: false, mutationFn: (model: string) => api.deleteVariant(id, model), onSuccess: success })
  const busy = add.isPending || remove.isPending
  const label = (m: management.ModelSettings) => m.model_name || m.tier_index.map((index, i) => initial.tiers[i]?.option_list[index]?.option).join(' / ') || m.model_id
  const err = add.error || remove.error
  return <div className="space-y-4">
    {initial.models.length > 0 && <section className="space-y-2"><h3 className="font-medium">Varian saat ini ({initial.models.length})</h3><ul className="space-y-2">{initial.models.map(m => <li key={m.model_id} className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3"><span className="min-w-0 break-words text-sm">{label(m)}<span className="block text-xs text-muted-foreground">{m.model_sku || 'Tanpa SKU'}{m.price_info?.[0] ? ` · ${fmtRp(m.price_info[0].current_price)}` : ''}{m.stock_info_v2?.summary_info ? ` · stok ${m.stock_info_v2.summary_info.total_available_stock}` : ''}</span></span><Button variant="outline" size="sm" disabled={busy || initial.models.length <= 1} onClick={async () => { if (await confirm({ title: 'Hapus varian dari Shopee?', description: label(m), destructive: true })) remove.mutate(m.model_id) }}>Hapus</Button></li>)}</ul>
    <p className="text-xs text-muted-foreground">Harga dan stok varian yang sudah ada diubah lewat menu Harga & Stok ERP, lalu kirim ke Shopee dari halaman Akun. SKU, berat, dan nama pilihan diubah lewat tombol "Edit varian".</p></section>}
    <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: ada ? 'Tambahkan varian ke Shopee?' : 'Buat varian untuk produk Shopee?', description: `${adaBaru ? 'Pilihan baru ditambahkan ke variasi, lalu varian dibuat. ' : ''}Harga ${fmtRp(price)} · stok ${stock}${ada ? '' : ' per pilihan'}.` })) add.mutate() }}>
      <h3 className="font-medium">{ada ? 'Tambah varian baru' : 'Buat pilihan varian'}</h3>
      {ada ? initial.tiers.map((t, i) => <div key={i} className="space-y-1"><Label htmlFor={`add-tier-${i}`}>{t.name}</Label><PilihNative id={`add-tier-${i}`} className={field} value={pilih[i]} disabled={busy} onChange={e => setPilih(v => v.map((x, j) => j === i ? e.target.value : x))}><option value="">Pilih {t.name}</option>{t.option_list.map((o, j) => <option key={j} value={j}>{o.option}</option>)}<option value={BARU}>+ Pilihan {t.name} baru…</option></PilihNative>{pilih[i] === BARU && <Input aria-label={`${t.name} baru`} required maxLength={100} placeholder={`Ketik ${t.name} baru`} value={baru[i]} disabled={busy} onChange={e => setBaru(v => v.map((x, j) => j === i ? e.target.value : x))} />}</div>)
        : <><Label htmlFor="new-tier-name">Nama variasi</Label><Input id="new-tier-name" required maxLength={100} value={tierName} disabled={busy} onChange={e => setTierName(e.target.value)} /><Label htmlFor="new-tier-options">Pilihan · pisahkan dengan koma</Label><Input id="new-tier-options" required value={options} disabled={busy} placeholder="Merah, Putih, Coklat" onChange={e => setOptions(e.target.value)} /></>}
      <div className="space-y-1"><Label htmlFor="new-model-sku">SKU{ada ? ' (boleh kosong)' : ' awalan (boleh kosong)'}</Label><Input id="new-model-sku" maxLength={90} value={sku} disabled={busy} onChange={e => setSku(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="new-model-price">Harga</Label><MoneyInput id="new-model-price" required value={price} disabled={busy} onChange={e => setPrice(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="new-model-stock">Stok Shopee</Label><Input id="new-model-stock" required type="number" min={0} step={1} value={stock} disabled={busy} onChange={e => setStock(e.target.value)} /></div></div>
      {ada && !lengkap && <p className="text-sm text-muted-foreground">Pilih atau ketik pilihan untuk setiap variasi. Kalau semua kombinasi sudah ada, pilih "+ Pilihan baru…".</p>}
      {exists && <p className="text-sm text-muted-foreground">Kombinasi ini sudah ada. Pilih kombinasi lain atau tambah pilihan baru.</p>}
      {duplikat && <p className="text-sm text-destructive">Nama pilihan baru sudah ada di daftar. Pilih dari daftar saja.</p>}
      {err && <p role="alert" className="break-words text-sm text-destructive">{err instanceof Error && !('response' in err) ? err.message : getApiError(err)}</p>}
      <Button type="submit" disabled={busy || (ada && (!lengkap || exists || duplikat))}>{add.isPending ? 'Memproses…' : 'Tambah varian'}</Button>
    </form></div>
}
