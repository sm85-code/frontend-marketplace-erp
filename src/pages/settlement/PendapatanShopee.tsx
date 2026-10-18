import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import * as api from '@/api/commerce'
import { listAkun } from '@/api/endpoints'
import { fmtDateTime, fmtMoney } from '@/api/client'
import type { AkunMarketplace } from '@/api/types'
import { useUrutLokal } from '@/lib/urut'
import QueryError from '@/components/QueryError'
import { ErrorDetails } from '@/pages/katalog/ShopeeEngagement'
import Spinner from '@/components/Spinner'
import { TabelData, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const field = 'w-full rounded-lg border bg-background p-2'
const shippingLabels: Record<string, string> = {
  LOGISTICS_NOT_START: 'Belum dikirim', LOGISTICS_REQUEST_CREATED: 'Menunggu kurir',
  LOGISTICS_PICKUP_DONE: 'Dalam pengiriman', LOGISTICS_DELIVERY_DONE: 'Diterima',
  LOGISTICS_DELIVERY_FAILED: 'Gagal diterima', LOGISTICS_PICKUP_FAILED: 'Gagal dijemput',
  LOGISTICS_REQUEST_CANCELED: 'Pengiriman dibatalkan', LOGISTICS_LOST: 'Paket hilang',
  LOGISTICS_READY: 'Siap dikirim', LOGISTICS_COD_REJECTED: 'COD ditolak',
  UNPAID: 'Belum dibayar', READY_TO_SHIP: 'Siap dikirim', PROCESSED: 'Menunggu kurir',
  SHIPPED: 'Dalam pengiriman', TO_CONFIRM_RECEIVE: 'Menunggu konfirmasi penerimaan',
  COMPLETED: 'Pesanan selesai', CANCELLED: 'Dibatalkan',
}
const stamp = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 8640000000000 ? v : null
const time = (v: number | null) => v == null ? '—' : `${fmtDateTime(new Date(v * 1000).toISOString())} WIB`
const eventTime = (data: api.Tracking | undefined, codes: string[]) => {
  const times = data?.tracking_info.filter(e => codes.includes(e.logistics_status ?? '')).map(e => stamp(e.update_time)).filter((v): v is number => v != null) ?? []
  return times.length ? Math.min(...times) : null
}
interface Row {
  key: string; shop: string; number: string; products: string[]; variants: string[]
  shipping: string | null; amount: number | null; currency?: string
  shipped: number | null; received: number | null; payout: number | null
}

export default function PendapatanShopee() {
  const [shop, setShop] = useState('all')
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  const available = (shops.data ?? []).filter(a => a.platform === 'shopee' && a.id_toko_eksternal)
  const selected = shop === 'all' ? available : available.filter(a => a.id === shop)
  return <div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="income-shop">Toko Shopee</Label><select id="income-shop" className={field} value={shop} onChange={e => setShop(e.target.value)}><option value="all">Semua toko</option>{available.map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select></div>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    {selected.length > 0 && <Income key={shop} shops={selected} />}
    {!shops.isPending && !available.length && <p className="text-sm text-muted-foreground">Belum ada toko Shopee terhubung.</p>}
  </div>
}
function Income({ shops }: { shops: AkunMarketplace[] }) {
  const wibDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)
  const [start] = useState(() => wibDate(new Date(Date.now() - 13 * 86400000)))
  const [end] = useState(() => wibDate(new Date()))
  const [pages, setPages] = useState<Record<string, string | null>[]>([{}])
  const current = pages[pages.length - 1]
  const sources = shops.flatMap(shop => ([2] as const).map(status => ({ shop, status, key: `${shop.id}:${status}` })))
  const incomeOptions = (index: number, ready = true) => {
    const source = sources[index]
    return {
      queryKey: ['income-shopee', source.shop.id, start, end, source.status, current[source.key] ?? ''],
      queryFn: () => api.income(source.shop.id, { dari: start, sampai: end, income_status: source.status, cursor: current[source.key] ?? '', page_size: 10 }),
      enabled: ready && !!start && !!end && current[source.key] !== null, retry: false, staleTime: 60000,
    }
  }
  const queries = useQueries({ queries: sources.map((_, index) => incomeOptions(index)) })
  const incomeBusy = sources.some((source, i) => current[source.key] !== null && (queries[i].isFetching || queries[i].isPending))

  const loaded = sources.flatMap((source, index) => {
    if (current[source.key] === null) return []
    return (queries[index].data?.items ?? []).map((row, position) => ({ ...row, _shop: source.shop.id, _shopName: source.shop.nama_toko, _status: source.status, _key: `${source.shop.id}:${row.order_sn || `${source.status}:${position}`}` }))
  })
  const items = [...new Map(loaded.map(row => [row._key, row])).values()]
  const active = queries.filter((_, i) => current[sources[i].key] !== null)
  const q = {
    isPending: active.some(r => r.isPending) && !active.some(r => r.data),
    isFetching: active.some(r => r.isFetching),
    data: active.some(r => r.data) ? { items, warnings: sources.flatMap((source, i) => current[source.key] === null ? [] : (queries[i].data?.warnings ?? []).map(w => `${source.shop.nama_toko}: ${w}`)), ada_lagi: sources.some((source, i) => current[source.key] !== null && !!queries[i].data?.ada_lagi) } : undefined,
  }
  const batches = shops.flatMap(shop => {
    const numbers = [...new Set(items.filter(r => r._shop === shop.id).map(r => r.order_sn).filter((n): n is string => !!n && /^[A-Za-z0-9]{1,50}$/.test(n)))]
    return Array.from({ length: Math.ceil(numbers.length / 30) }, (_, index) => ({ id: shop.id, numbers: numbers.slice(index * 30, index * 30 + 30) }))
  })
  const details = useQueries({ queries: batches.map(batch => ({ queryKey: ['income-orders', batch.id, batch.numbers.join(',')], queryFn: () => api.incomeOrders(batch.id, batch.numbers), enabled: !incomeBusy, staleTime: 60000, retry: false })) })
  const detailRows = details.flatMap((result, i) => (result.data?.items ?? []).map(row => ({ ...row, shopId: batches[i].id })))
  const packages = detailRows.flatMap(r => r.packages.length > 1
    ? r.packages.map(p => ({ id: r.shopId, number: r.order_sn, package: p.package_number, valid: !!p.package_number }))
    : [{ id: r.shopId, number: r.order_sn, package: r.packages[0]?.package_number, valid: true }])
  const tracking = useQueries({ queries: packages.map(p => ({ queryKey: ['income-tracking', p.id, p.number, p.package ?? ''], queryFn: () => api.incomeTracking(p.id, p.number, p.package), enabled: p.valid && !incomeBusy, staleTime: 60000, retry: false })) })
  const rows: Row[] = items.map(r => {
    const detail = detailRows.find(d => d.shopId === r._shop && d.order_sn === r.order_sn)
    const traces = packages.flatMap((p, i) => p.id === r._shop && p.number === r.order_sn ? [tracking[i].data] : [])
    const shipped = traces.map(t => eventTime(t, ['PICKED_UP', 'LOGISTICS_PICKUP_DONE'])).filter((v): v is number => v != null)
    const received = traces.map(t => eventTime(t, ['DELIVERED', 'LOGISTICS_DELIVERY_DONE']))
    const states = [...new Set(traces.map(t => t?.logistics_status).filter(Boolean))]
    const fallback = detail?.packages.map(p => p.logistics_status).filter(Boolean) ?? []
    const labels = (states.length === traces.length && states.length ? states : fallback.length ? fallback : [detail?.order_status]).filter((v): v is string => !!v).map(v => shippingLabels[v] ?? v)
    const amount = r.estimated_escrow_amount
    return { key: r._key, shop: r._shopName, number: r.order_sn ?? '—',
      products: detail?.items.map(i => i.name || '—') ?? [], variants: detail?.items.map(i => i.variant || '—') ?? [],
      shipping: [...new Set(labels)].join(' · ') || null,
      amount: amount == null ? null : Number(amount), currency: r.currency,
      shipped: stamp(detail?.pickup_done_time) ?? (shipped.length ? Math.min(...shipped) : null),
      received: received.length && received.every((v): v is number => v != null) ? Math.max(...received) : null,
      payout: stamp(r.estimated_payout_time) }
  })
  const names = (values: string[]) => values.length ? <div className="space-y-2">{values.map((v, i) => <div key={i}>{v}</div>)}</div> : '—'
  const columns: KolomTabel<Row>[] = [
    { kunci: 'no', judul: 'No.', sel: () => null },
    { kunci: 'shop', judul: 'Nama Toko', sel: r => r.shop, nilai: r => r.shop },
    { kunci: 'number', judul: 'Kode Pesanan', sel: r => r.number, nilai: r => r.number, tetap: true, kelas: 'font-mono whitespace-nowrap' },
    { kunci: 'products', judul: 'Nama Produk', sel: r => names(r.products), nilai: r => r.products.join(' · '), kelas: 'min-w-60' },
    { kunci: 'variants', judul: 'Varian', sel: r => names(r.variants), nilai: r => r.variants.join(' · '), kelas: 'min-w-36' },
    { kunci: 'shipping', judul: 'Status Pengiriman', sel: r => r.shipping ?? '—', nilai: r => r.shipping },
    { kunci: 'amount', judul: 'Estimasi Dana Cair', sel: r => r.amount == null ? '—' : fmtMoney(r.amount, r.currency), nilai: r => r.amount, rata: 'kanan', kelas: 'whitespace-nowrap' },
    { kunci: 'shipped', judul: 'Tanggal Dikirim', sel: r => time(r.shipped), nilai: r => r.shipped, kelas: 'whitespace-nowrap' },
    { kunci: 'received', judul: 'Tanggal Diterima', sel: r => time(r.received), nilai: r => r.received, kelas: 'whitespace-nowrap' },
    { kunci: 'payout', judul: 'Estimasi Tgl. Pencairan', sel: r => time(r.payout), nilai: r => r.payout, kelas: 'whitespace-nowrap' },
  ]
  const { hasil, urut, ubah } = useUrutLokal(rows, (row, key) => columns.find(c => c.kunci === key)?.nilai?.(row))
  const sortedColumns = columns.map(c => c.nilai ? { ...c, urut: { kunci: c.kunci } } : { ...c, sel: (r: Row) => hasil.findIndex(x => x.key === r.key) + 1 })
  const trackingFailure = tracking.find(t => t.error)
  return <div className="space-y-4">
    {q.isPending && <Spinner column />}
    {sources.map((source, i) => current[source.key] !== null && queries[i].error ? <div key={source.key}><p className="text-sm font-medium">{source.shop.nama_toko} · Menunggu pencairan</p><ErrorDetails error={queries[i].error}/><Button variant="outline" onClick={() => void queries[i].refetch()}>Coba lagi</Button></div> : null)}
    {details.filter(r => r.error).map((r, i) => <QueryError key={i} error={r.error} retry={r.refetch} />)}
    {trackingFailure?.error && <QueryError error={trackingFailure.error} retry={() => { tracking.filter(t => t.error).forEach(t => { void t.refetch() }) }} />}
    {q.data && <>
      {[...(q.data.warnings ?? []).filter(w => !w.includes('Shopee tidak menyertakan informasi halaman berikutnya.')), ...details.flatMap(r => r.data?.warnings ?? [])].map(w => <p key={w} role="status" className="rounded-lg bg-muted p-3 text-sm">{w}</p>)}
      {(q.isFetching || details.some(r => r.isFetching) || tracking.some(t => t.isFetching)) && <p role="status" className="text-xs text-muted-foreground">Memuat rincian produk dan pengiriman…</p>}
      <TabelData label="Pesanan menunggu pencairan" items={hasil} kolom={sortedColumns} idDari={r => r.key} namaDari={r => r.number} urut={urut} onUrut={ubah} minWidth={1900} />
      {!rows.length && <p className="text-sm text-muted-foreground">Tidak ada pesanan menunggu pencairan pada permintaan ini.</p>}
      {(pages.length > 1 || q.data.ada_lagi) && <div className="paginasi">
        <Button variant="outline" disabled={q.isFetching || pages.length === 1} onClick={() => setPages(p => p.slice(0, -1))}>Sebelumnya</Button>
        <span className="text-sm text-muted-foreground">Halaman {pages.length}</span>
        <Button variant="outline" disabled={q.isFetching || active.some(r => r.error) || !q.data.ada_lagi} onClick={() => setPages(p => [...p, Object.fromEntries(sources.map((source, i) => [source.key, current[source.key] !== null && queries[i].data?.ada_lagi ? queries[i].data!.next_cursor : null]))])}>Berikutnya</Button>
      </div>}
    </>}
  </div>
}
