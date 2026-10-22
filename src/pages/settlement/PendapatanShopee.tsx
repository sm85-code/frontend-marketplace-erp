import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import * as api from '@/api/commerce'
import { listAkun } from '@/api/endpoints'
import { fmtDateTime, fmtMoney } from '@/api/client'
import type { AkunMarketplace } from '@/api/types'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { muatMenunggu } from './muatMenunggu'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TableCell, TableRow } from '@/components/ui/table'

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
  shipped: number | null; received: number | null; payout: number | null; dariDaftar: boolean; danaCepat: number | null; statusErp: string | null
}

export default function PendapatanShopee() {
  const [shop, setShop] = useState('all')
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  const available = (shops.data ?? []).filter(a => a.platform === 'shopee' && a.id_toko_eksternal)
  const selected = shop === 'all' ? available : available.filter(a => a.id === shop)
  return <div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="income-shop">Toko Shopee</Label><select id="income-shop" className={field} value={shop} onChange={e => setShop(e.target.value)}><option value="all">Semua toko</option>{available.map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select></div>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    {selected.length > 0 && <Income key={shop} shops={selected} semuaToko={shop === 'all'} />}
    {!shops.isPending && !available.length && <p className="text-sm text-muted-foreground">Belum ada toko Shopee terhubung.</p>}
  </div>
}
function Income({ shops, semuaToko }: { shops: AkunMarketplace[]; semuaToko: boolean }) {
  const [statuses, setStatuses] = useState<string[]>([])
  const q = useQuery({ queryKey: ['menunggu-pencairan', shops.map(s => s.id).join(','), semuaToko], queryFn: () => muatMenunggu(shops, semuaToko), staleTime: 60000, retry: false })
  const baris = q.data?.baris ?? []
  const packages = baris.flatMap(b => !b.detail ? [] : b.detail.packages.length > 1
    ? b.detail.packages.map(p => ({ id: b.shopId, number: b.number, package: p.package_number, valid: !!p.package_number }))
    : [{ id: b.shopId, number: b.number, package: b.detail.packages[0]?.package_number, valid: true }])
  const tracking = useQueries({ queries: packages.map(p => ({ queryKey: ['income-tracking', p.id, p.number, p.package ?? ''], queryFn: () => api.incomeTracking(p.id, p.number, p.package), enabled: p.valid && !q.isFetching, staleTime: 60000, retry: false })) })
  const rows: Row[] = baris.map(b => {
    const traces = packages.flatMap((p, i) => p.id === b.shopId && p.number === b.number ? [tracking[i].data] : [])
    const shipped = traces.map(t => eventTime(t, ['PICKED_UP', 'LOGISTICS_PICKUP_DONE'])).filter((v): v is number => v != null)
    const received = traces.map(t => eventTime(t, ['DELIVERED', 'LOGISTICS_DELIVERY_DONE']))
    const states = [...new Set(traces.map(t => t?.logistics_status).filter(Boolean))]
    const fallback = b.detail?.packages.map(p => p.logistics_status).filter(Boolean) ?? []
    const labels = (states.length === traces.length && states.length ? states : fallback.length ? fallback : [b.detail?.order_status]).filter((v): v is string => !!v).map(v => shippingLabels[v] ?? v)
    return { key: `${b.shopId}:${b.number}`, shop: b.shopName, number: b.number,
      products: b.detail?.items.map(i => i.name || '—') ?? [], variants: b.detail?.items.map(i => i.variant || '—') ?? [],
      shipping: b.detail?.order_status === 'COMPLETED' ? 'Selesai, dana belum cair' : [...new Set(labels)].join(' · ') || null,
      amount: b.amount, currency: b.currency, dariDaftar: b.dariDaftar,
      shipped: stamp(b.detail?.pickup_done_time) ?? (shipped.length ? Math.min(...shipped) : null),
      received: received.length && received.every((v): v is number => v != null) ? Math.max(...received) : null,
      payout: stamp(b.payoutTime), danaCepat: b.danaCepat, statusErp: b.statusErp }
  })
  const names = (values: string[]) => values.length ? <div className="space-y-2">{values.map((v, i) => <div key={i}>{v}</div>)}</div> : '—'
  const columns: KolomTabel<Row>[] = [
    { kunci: 'shop', judul: 'Nama Toko', sel: r => r.shop, nilai: r => r.shop },
    { kunci: 'number', judul: 'Kode Pesanan', sel: r => r.number, nilai: r => r.number, tetap: true, kelas: 'font-mono whitespace-nowrap' },
    { kunci: 'products', judul: 'Nama Produk', sel: r => names(r.products), nilai: r => r.products.join(' · '), kelas: 'min-w-60' },
    { kunci: 'variants', judul: 'Varian', sel: r => names(r.variants), nilai: r => r.variants.join(' · '), kelas: 'min-w-36' },
    { kunci: 'shipping', judul: 'Status Pengiriman', sel: r => r.shipping ?? '—', nilai: r => r.shipping },
    { kunci: 'erp', judul: 'Status di Menu Pesanan', sel: r => r.statusErp ?? 'Tidak ada di menu Pesanan', nilai: r => r.statusErp, kelas: 'whitespace-nowrap' },
    { kunci: 'amount', judul: 'Estimasi Dana Cair', sel: r => <>{r.amount == null ? '—' : fmtMoney(r.amount, r.currency)}{!r.dariDaftar && <span className="block text-xs font-normal text-muted-foreground">belum tampil di daftar Shopee</span>}</>, nilai: r => r.amount, rata: 'kanan', kelas: 'whitespace-nowrap' },
    { kunci: 'shipped', judul: 'Tanggal Dikirim', sel: r => time(r.shipped), nilai: r => r.shipped, kelas: 'whitespace-nowrap' },
    { kunci: 'received', judul: 'Tanggal Diterima', sel: r => time(r.received), nilai: r => r.received, kelas: 'whitespace-nowrap' },
    { kunci: 'payout', judul: 'Estimasi Tgl. Pencairan', sel: r => <>{r.payout != null ? time(r.payout) : <span className="text-xs text-muted-foreground">{alasanTanpaEstimasi(r.dariDaftar)}</span>}{r.danaCepat != null && <span className="block text-xs text-muted-foreground">Dana Cepat: {fmtMoney(r.danaCepat, r.currency)} sudah dicairkan awal</span>}</>, nilai: r => r.payout, kelas: 'whitespace-nowrap' },
  ]
  const unknownStatus = 'Status belum diketahui'
  const statusesOf = (r: Row) => r.shipping ? r.shipping.split(' · ') : [unknownStatus]
  const statusCounts = new Map<string, number>()
  for (const r of rows) for (const label of new Set(statusesOf(r))) statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1)
  const shown = statuses.length ? rows.filter(r => statusesOf(r).some(label => statuses.includes(label))) : rows
  const totals = new Map<string, number>()
  for (const r of shown) if (r.amount != null) totals.set(r.currency ?? 'IDR', (totals.get(r.currency ?? 'IDR') ?? 0) + r.amount)
  const withoutAmount = shown.filter(r => r.amount == null).length
  const trackingFailure = tracking.find(t => t.error)
  return <div className="space-y-4">
    {q.isPending && <Spinner column label="Memuat pesanan menunggu pencairan…" />}
    {q.error && <QueryError error={q.error} retry={q.refetch} />}
    {trackingFailure?.error && <QueryError error={trackingFailure.error} retry={() => { tracking.filter(t => t.error).forEach(t => { void t.refetch() }) }} />}
    {q.data && <>
      {tracking.some(t => t.isFetching) && <p role="status" className="text-xs text-muted-foreground">Memuat rincian pengiriman…</p>}
      {statusCounts.size > 0 && <div role="group" aria-label="Filter status pengiriman" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {[['', rows.length] as const, ...[...statusCounts].sort(([a], [b]) => a.localeCompare(b, 'id-ID'))].map(([label, count]) => {
          const all = label === ''
          const active = all ? statuses.length === 0 : statuses.includes(label)
          return <Button key={label || 'semua'} type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} className="shrink-0 rounded-full whitespace-nowrap"
            onClick={() => setStatuses(current => all ? [] : active ? current.filter(v => v !== label) : [...current, label])}>
            {all ? 'Semua' : label} <span className="text-xs opacity-75">({count})</span>
          </Button>
        })}
      </div>}
      <TabelLokal label="Pesanan menunggu pencairan" items={shown} kolom={columns} idDari={r => r.key} namaDari={r => r.number} minWidth={1800}
        footer={<TableRow className="font-semibold">
          <TableCell colSpan={6}>Total {shown.length} pesanan{withoutAmount > 0 && <span className="block text-xs font-normal text-muted-foreground">{withoutAmount} pesanan belum ada estimasi dana</span>}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{totals.size ? [...totals].map(([currency, total]) => <div key={currency}>{fmtMoney(total, currency)}</div>) : '—'}</TableCell>
          <TableCell colSpan={3} />
        </TableRow>} />
      {!rows.length && <p className="text-sm text-muted-foreground">Tidak ada pesanan yang sedang menunggu pencairan.</p>}
      {rows.length > 0 && !shown.length && <p className="text-sm text-muted-foreground">Tidak ada pesanan dengan status pengiriman yang dipilih.</p>}
      <div><Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => void q.refetch()}>{q.isFetching ? 'Memuat…' : 'Perbarui'}</Button></div>
    </>}
  </div>
}

/** Why a pending row has no estimated payout date, instead of a bare dash. */
export function alasanTanpaEstimasi(dariDaftar: boolean) {
  return dariDaftar ? 'Shopee tidak mengirim estimasi' : 'Belum ada di daftar Shopee'
}
