import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import * as management from '@/api/management'
import { fmtDateTime, fmtRp, getApiError } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import AksiLainnya from '@/components/AksiLainnya'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import MoneyInput from '@/components/MoneyInput'
const field = 'w-full rounded-lg border bg-background p-2'
const time = (value?: number) => value ? fmtDateTime(new Date(value * 1000).toISOString()) : '—'

export default function ShopeeProductTools({ detail, close }: { detail: KatalogDetail; close: () => void }) {
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [promotionsOpen, setPromotionsOpen] = useState(false)
  const [violationsOpen, setViolationsOpen] = useState(false)
  const confirm = useConfirm(), qc = useQueryClient()
  const promotions = useQuery({ queryKey: ['product-promotions', detail.id], queryFn: () => api.productPromotions(detail.id), enabled: promotionsOpen, retry: false })
  const violations = useQuery({ queryKey: ['product-violations', detail.id], queryFn: () => api.productViolations(detail.id), enabled: violationsOpen, retry: false })
  const remove = useMutation({ retry: false, mutationFn: () => api.deleteProduct(detail.id), onSuccess: result => { toast.success('Produk dihapus dari Shopee'); result.warnings.forEach(w => toast.warning(w)); void qc.invalidateQueries({ queryKey: ['katalog'] }); void qc.invalidateQueries({ queryKey: ['listing'] }); close() } })
  return <section className="space-y-2 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">Pengelolaan produk Shopee</h2><AksiLainnya><Button variant="outline" size="sm" onClick={() => setVariantsOpen(true)}>Tambah / hapus varian</Button><Button variant="destructive" size="sm" disabled={remove.isPending || detail.status === 'SELLER_DELETE'} onClick={async () => { if (await confirm({ title: 'Hapus produk dari Shopee?', description: `${detail.nama}. Produk akan dihapus di ${detail.nama_toko}; riwayat pesanan dan stok ERP tetap tersimpan.`, destructive: true })) remove.mutate() }}>Hapus produk Shopee</Button></AksiLainnya></div>{remove.error && <p role="alert" className="text-sm text-destructive">{getApiError(remove.error)}</p>}<details onToggle={e => setPromotionsOpen(e.currentTarget.open)}><summary className="cursor-pointer py-2">Promosi produk</summary>{promotionsOpen && <div className="space-y-2">{promotions.isPending && <Spinner column />}{promotions.error && <QueryError error={promotions.error} retry={promotions.refetch} />}{promotions.data?.promotion.map((p, i) => <div key={`${p.promotion_id}:${i}`} className="rounded-lg bg-muted p-3"><p className="font-medium">{p.promotion_type} · {p.promotion_staging}</p><p className="text-sm">{time(p.start_time)} – {time(p.end_time)} WIB</p>{p.promotion_price_info?.map((price, j) => <p key={j} className="font-medium">{fmtRp(price.promotion_price)}</p>)}</div>)}{promotions.data && !promotions.data.promotion.length && <p className="text-sm text-muted-foreground">Tidak ada promosi untuk produk ini.</p>}</div>}</details><details onToggle={e => setViolationsOpen(e.currentTarget.open)}><summary className="cursor-pointer py-2">Pelanggaran &amp; pembatasan pencarian</summary>{violationsOpen && <div className="space-y-2">{violations.isPending && <Spinner column />}{violations.error && <QueryError error={violations.error} retry={violations.refetch} />}{violations.data && <><p className="text-sm">Status Shopee: {violations.data.item_status}{violations.data.deboost ? ' · Peringkat pencarian diturunkan' : ''}</p>{[...(violations.data.item_status_details ?? []), ...(violations.data.deboost_details ?? [])].map((v, i) => <div key={i} className="rounded-lg bg-muted p-3"><p className="font-medium">{v.violation_type}</p><p>{v.violation_reason}</p><p className="mt-1 text-sm">{v.suggestion}</p>{v.fix_deadline_time ? <p className="mt-1 text-xs text-muted-foreground">Batas perbaikan: {time(v.fix_deadline_time)} WIB</p> : null}</div>)}</>}</div>}</details><Dialog open={variantsOpen} onOpenChange={setVariantsOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Kelola varian Shopee</DialogTitle></DialogHeader>{variantsOpen && <Variants id={detail.id} />}</DialogContent></Dialog></section>
}

function Variants({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['pengaturan-produk', id], queryFn: () => management.settings(id), staleTime: 0, retry: false })
  return <>{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data && <VariantForm key={JSON.stringify(q.data)} id={id} initial={q.data} />}</>
}
function VariantForm({ id, initial }: { id: string; initial: management.ItemSettings }) {
  const [indices, setIndices] = useState(initial.tiers.map(() => 0))
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [tierName, setTierName] = useState('Warna')
  const [options, setOptions] = useState('')
  const confirm = useConfirm(), qc = useQueryClient()
  const success = (r: { warnings: string[] }) => { toast.success('Perubahan varian dikonfirmasi Shopee'); r.warnings.forEach(w => toast.warning(w)); void qc.invalidateQueries({ queryKey: ['pengaturan-produk', id] }); void qc.invalidateQueries({ queryKey: ['katalog'] }) }
  const add = useMutation({ retry: false, mutationFn: () => initial.tiers.length ? api.addVariant(id, { tier_index: indices, sku, price: Number(price), stock: Number(stock) }) : api.initVariants(id, { tiers: [{ name: tierName, options: options.split(',').map(o => ({ option: o.trim() })) }], models: options.split(',').map((_, i) => ({ tier_index: [i], sku: sku ? `${sku}-${i + 1}` : '', price: Number(price), stock: Number(stock) })) }), onSuccess: success })
  const remove = useMutation({ retry: false, mutationFn: (model: string) => api.deleteVariant(id, model), onSuccess: success })
  const busy = add.isPending || remove.isPending
  const exists = initial.models.some(m => JSON.stringify(m.tier_index) === JSON.stringify(indices))
  return <div className="space-y-4">{initial.models.length > 0 && <ul className="space-y-2">{initial.models.map(m => <li key={m.model_id} className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3"><span className="min-w-0 break-words text-sm">{m.model_name || m.tier_index.map((index, i) => initial.tiers[i]?.option_list[index]?.option).join(' / ') || m.model_id}<span className="block text-xs text-muted-foreground">{m.model_sku}</span></span><Button variant="outline" size="sm" disabled={busy || initial.models.length <= 1} onClick={async () => { if (await confirm({ title: 'Hapus varian dari Shopee?', description: m.model_name || m.model_id, destructive: true })) remove.mutate(m.model_id) }}>Hapus</Button></li>)}</ul>}<form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: initial.tiers.length ? 'Tambahkan varian ke Shopee?' : 'Buat varian untuk produk Shopee?', description: `Harga ${fmtRp(price)} · stok ${stock}${initial.tiers.length ? '' : ' per pilihan'}.` })) add.mutate() }}><h3 className="font-medium">{initial.tiers.length ? 'Tambah kombinasi varian' : 'Buat pilihan varian'}</h3>{initial.tiers.length ? initial.tiers.map((t, i) => <div key={i} className="space-y-1"><Label htmlFor={`add-tier-${i}`}>{t.name}</Label><select id={`add-tier-${i}`} className={field} value={indices[i]} disabled={busy} onChange={e => setIndices(v => v.map((x, j) => j === i ? Number(e.target.value) : x))}>{t.option_list.map((o, j) => <option key={j} value={j}>{o.option}</option>)}</select></div>) : <><Label htmlFor="new-tier-name">Nama variasi</Label><Input id="new-tier-name" required maxLength={100} value={tierName} disabled={busy} onChange={e => setTierName(e.target.value)} /><Label htmlFor="new-tier-options">Pilihan · pisahkan dengan koma</Label><Input id="new-tier-options" required value={options} disabled={busy} placeholder="Merah, Putih, Coklat" onChange={e => setOptions(e.target.value)} /></>}<div className="space-y-1"><Label htmlFor="new-model-sku">SKU{initial.tiers.length ? '' : ' awalan'}</Label><Input id="new-model-sku" maxLength={90} value={sku} disabled={busy} onChange={e => setSku(e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="new-model-price">Harga</Label><MoneyInput id="new-model-price" required value={price} disabled={busy} onChange={e => setPrice(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="new-model-stock">Stok Shopee</Label><Input id="new-model-stock" required type="number" min={0} step={1} value={stock} disabled={busy} onChange={e => setStock(e.target.value)} /></div></div>{initial.tiers.length > 0 && exists && <p className="text-sm text-muted-foreground">Kombinasi ini sudah ada. Pilih kombinasi lain atau edit varian existing.</p>}{(add.error || remove.error) && <p role="alert" className="text-sm text-destructive">{getApiError(add.error || remove.error)}</p>}<Button type="submit" disabled={busy || (initial.tiers.length > 0 && exists)}>Tambah varian</Button></form></div>
}
