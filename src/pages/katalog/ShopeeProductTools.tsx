
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import * as endpoints from '@/api/endpoints'
import { fmtDateTime, fmtRp, getApiError } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import ShopeeEngagement from './ShopeeEngagement'
import { BarisAksi } from './bagian'
const time = (value?: number) => value ? fmtDateTime(new Date(value * 1000).toISOString()) : '—'

/** Show or hide the product on Shopee (unlist). */
export function StatusShopee({ detail }: { detail: KatalogDetail }) {
  const confirm = useConfirm(), qc = useQueryClient()
  const unlist = detail.status === 'NORMAL'
  const m = useMutation({ retry: false, mutationFn: () => endpoints.statusProdukShopee(detail.id, unlist), onSuccess: () => { toast.success(unlist ? 'Produk dinonaktifkan di Shopee' : 'Produk diaktifkan di Shopee'); void qc.invalidateQueries({ queryKey: ['katalog'] }) } })
  return <>
    <BarisAksi judul={unlist ? 'Nonaktifkan di Shopee' : 'Aktifkan di Shopee'} ket={unlist ? 'Sembunyikan produk dari pembeli.' : 'Tayangkan lagi produk ini.'}><Button variant="outline" size="sm" disabled={m.isPending} onClick={async () => { if (await confirm({ title: unlist ? 'Nonaktifkan produk di Shopee?' : 'Aktifkan produk di Shopee?', description: `${detail.nama} · ${detail.nama_toko}` })) m.mutate() }}>{unlist ? 'Nonaktifkan' : 'Aktifkan'}</Button></BarisAksi>
    {m.error && <p role="alert" className="pb-3 text-sm text-destructive">{getApiError(m.error)}</p>}
  </>
}

/** Taking the product off Shopee. */
export function HapusShopee({ detail, close }: { detail: KatalogDetail; close: () => void }) {
  const confirm = useConfirm(), qc = useQueryClient()
  const remove = useMutation({ retry: false, mutationFn: () => api.deleteProduct(detail.id), onSuccess: result => { toast.success('Produk dihapus dari Shopee'); result.warnings.forEach(w => toast.warning(w)); void qc.invalidateQueries({ queryKey: ['katalog'] }); void qc.invalidateQueries({ queryKey: ['listing'] }); close() } })
  return <>
    <BarisAksi judul="Hapus dari Shopee" ket={`Produk dihapus di ${detail.nama_toko}. Riwayat pesanan di ERP tetap tersimpan.`}>
      <Button variant="destructive" size="sm" disabled={remove.isPending || detail.status === 'SELLER_DELETE'} onClick={async () => { if (await confirm({ title: 'Hapus produk dari Shopee?', description: `${detail.nama}. Produk akan dihapus di ${detail.nama_toko}; riwayat pesanan di ERP tetap tersimpan.`, destructive: true })) remove.mutate() }}>Hapus</Button>
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
