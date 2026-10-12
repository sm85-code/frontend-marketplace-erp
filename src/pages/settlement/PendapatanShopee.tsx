import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import * as api from '@/api/commerce'
import { listAkun } from '@/api/endpoints'
import { fmtDateTime, fmtMoney } from '@/api/client'
import { useTokoAktif } from '@/lib/tokoAktif'
import { useUrutLokal } from '@/lib/urut'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { TabelData, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [shop, setShop] = useTokoAktif(true)
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  return <div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="income-shop">Toko Shopee</Label><select id="income-shop" className={field} value={shop} onChange={e => setShop(e.target.value)}><option value="">Pilih toko</option>{shops.data?.filter(a => a.platform === 'shopee' && a.id_toko_eksternal).map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select></div>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    {shop && <Income key={shop} id={shop} shopName={shops.data?.find(a => a.id === shop)?.nama_toko ?? '—'} />}
  </div>
}
function Income({ id, shopName }: { id: string; shopName: string }) {
  const wibDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)
  const [start, setStart] = useState(() => wibDate(new Date(Date.now() - 13 * 86400000)))
  const [end, setEnd] = useState(() => wibDate(new Date()))
  const [status, setStatus] = useState<1 | 2>(2)
  const [cursors, setCursors] = useState([''])
  const cursor = cursors[cursors.length - 1]
  const q = useQuery({ queryKey: ['income-shopee', id, start, end, status, cursor], queryFn: () => api.income(id, { dari: start, sampai: end, income_status: status, cursor }), enabled: !!start && !!end, retry: false })
  const numbers = [...new Set(q.data?.items.map(r => r.order_sn).filter((n): n is string => !!n && /^[A-Za-z0-9]{1,50}$/.test(n)) ?? [])]
  const details = useQuery({ queryKey: ['income-orders', id, numbers.join(',')], queryFn: () => api.incomeOrders(id, numbers), enabled: numbers.length > 0, staleTime: 60000, retry: false })
  const packages = details.data?.items.flatMap(r => r.packages.length > 1
    ? r.packages.map(p => ({ number: r.order_sn, package: p.package_number, valid: !!p.package_number }))
    : [{ number: r.order_sn, package: r.packages[0]?.package_number, valid: true }]) ?? []
  const tracking = useQueries({ queries: packages.map(p => ({ queryKey: ['income-tracking', id, p.number, p.package ?? ''], queryFn: () => api.incomeTracking(id, p.number, p.package), enabled: p.valid, staleTime: 60000, retry: false })) })
  const rows: Row[] = q.data?.items.map((r, index) => {
    const detail = details.data?.items.find(d => d.order_sn === r.order_sn)
    const traces = packages.flatMap((p, i) => p.number === r.order_sn ? [tracking[i].data] : [])
    const shipped = traces.map(t => eventTime(t, ['PICKED_UP', 'LOGISTICS_PICKUP_DONE'])).filter((v): v is number => v != null)
    const received = traces.map(t => eventTime(t, ['DELIVERED', 'LOGISTICS_DELIVERY_DONE']))
    const states = [...new Set(traces.map(t => t?.logistics_status).filter(Boolean))]
    const fallback = detail?.packages.map(p => p.logistics_status).filter(Boolean) ?? []
    const labels = (states.length ? states : fallback.length ? fallback : [detail?.order_status]).filter((s): s is string => !!s).map(s => shippingLabels[s] ?? s)
    return { key: `${r.order_sn ?? ''}:${index}`, shop: shopName, number: r.order_sn ?? '—',
      products: detail?.items.map(i => i.name || '—') ?? [], variants: detail?.items.map(i => i.variant || '—') ?? [],
      shipping: [...new Set(labels)].join(' · ') || null,
      amount: r.estimated_escrow_amount == null ? null : Number(r.estimated_escrow_amount), currency: r.currency,
      shipped: stamp(detail?.pickup_done_time) ?? (shipped.length ? Math.min(...shipped) : null),
      received: received.length && received.every((v): v is number => v != null) ? Math.max(...received) : null,
      payout: stamp(r.estimated_payout_time) }
  }) ?? []
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
  const sortedColumns = columns.map(c => c.nilai ? { ...c, urut: { kunci: c.kunci } } : { ...c, sel: (r: Row) => (cursors.length - 1) * 30 + hasil.findIndex(x => x.key === r.key) + 1 })
  const trackingFailure = tracking.find(t => t.error)
  return <div className="space-y-4">
    <div className="grid items-end gap-3 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="income-status">Status pendapatan</Label><select id="income-status" className={field} value={status} onChange={e => { setStatus(Number(e.target.value) as 1 | 2); setCursors(['']) }}><option value={2}>Belum cair</option><option value={1}>Sudah dirilis</option></select></div>
      {status === 1 && <><div className="space-y-1"><Label htmlFor="income-start">Dari (WIB)</Label><Input id="income-start" type="date" value={start} onChange={e => { setStart(e.target.value); setCursors(['']) }} /></div><div className="space-y-1"><Label htmlFor="income-end">Sampai (WIB)</Label><Input id="income-end" type="date" value={end} onChange={e => { setEnd(e.target.value); setCursors(['']) }} /></div></>}
    </div>
    {q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}
    {details.error && <QueryError error={details.error} retry={details.refetch} />}
    {trackingFailure?.error && <QueryError error={trackingFailure.error} retry={() => { tracking.filter(t => t.error).forEach(t => { void t.refetch() }) }} />}
    {q.data && <>
      {[...(q.data.warnings ?? []), ...(details.data?.warnings ?? [])].map(w => <p key={w} role="status" className="rounded-lg bg-muted p-3 text-sm">{w}</p>)}
      {(details.isFetching || tracking.some(t => t.isFetching)) && <p role="status" className="text-xs text-muted-foreground">Memuat rincian produk dan pengiriman…</p>}
      <TabelData label="Rincian pendapatan Shopee" items={hasil} kolom={sortedColumns} idDari={r => r.key} namaDari={r => r.number} urut={urut} onUrut={ubah} minWidth={1900} />
      {!rows.length && <p className="text-sm text-muted-foreground">Tidak ada pendapatan pada permintaan ini.</p>}
      <p className="text-xs text-muted-foreground">Sortir berlaku pada halaman ini. Dana cair adalah pelepasan ke saldo toko; tanggal yang belum tersedia ditampilkan —.</p>
      {(cursors.length > 1 || q.data.ada_lagi) && <div className="paginasi"><Button variant="outline" disabled={q.isFetching || cursors.length === 1} onClick={() => setCursors(c => c.slice(0, -1))}>Sebelumnya</Button><span className="text-sm text-muted-foreground">Halaman {cursors.length}</span><Button variant="outline" disabled={q.isFetching || !q.data.ada_lagi} onClick={() => setCursors(c => [...c, q.data!.next_cursor])}>Berikutnya</Button></div>}
    </>}
  </div>
}
