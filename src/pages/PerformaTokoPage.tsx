import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as api from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const labels: Record<string, string> = { non_fulfillment_rate: 'Pesanan tidak terpenuhi', cancellation_rate: 'Pembatalan', return_refund_rate: 'Retur/refund', late_shipment_rate: 'Pengiriman terlambat', preparation_time: 'Waktu persiapan', chat_response_rate: 'Tingkat balasan chat', same_day_handover_rate: 'Penyerahan pada hari yang sama', severe_listing_violations: 'Pelanggaran listing berat', spam_listings: 'Listing spam', counterfeit_ip_infringement: 'Pelanggaran hak kekayaan intelektual', prohibited_listings: 'Listing terlarang', pre_order_listing_rate: 'Proporsi preorder' }
function metricValue(value: number | null | undefined, unit: number): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const suffix: Record<number, string> = { 2: '%', 3: ' detik', 4: ' hari', 5: ' jam' }
  return value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + (suffix[unit] ?? '')
}
export default function PerformaTokoPage() {
  const [akun, setAkun] = useState('')
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => api.listAkun() })
  const result = useQuery({ queryKey: ['performa-toko', akun], queryFn: () => api.getShopPerformance(akun), enabled: !!akun, retry: false })
  return <div className="space-y-4 pb-24">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Performa Toko</h1><Button variant="outline" disabled={!akun || result.isFetching} onClick={() => void result.refetch()}>Segarkan</Button></div>
    <div className="space-y-2"><label htmlFor="performa-toko">Toko Shopee</label><select id="performa-toko" className="w-full rounded-lg border bg-background p-3 sm:max-w-md" value={akun} onChange={e => setAkun(e.target.value)}><option value="">Pilih toko</option>{shops.data?.filter(s => s.platform === 'shopee').map(s => <option key={s.id} value={s.id}>{s.nama_toko}</option>)}</select></div>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    {result.error && <QueryError error={result.error} retry={result.refetch} />}
    {result.isFetching && <Spinner column label="Mengambil performa Shopee…" />}
    {result.data && <><p className="text-sm text-muted-foreground">Indikator resmi Shopee · {new Date(result.data.diambil_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p><div className="overflow-x-auto rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead className="min-w-56">Indikator</TableHead><TableHead>Periode saat ini</TableHead><TableHead>Periode sebelumnya</TableHead><TableHead>Target Shopee</TableHead></TableRow></TableHeader><TableBody>{result.data.metrics.map(m => <TableRow key={m.metric_id}><TableCell>{labels[m.metric_name] ?? m.metric_name.replaceAll('_', ' ')}</TableCell><TableCell className="whitespace-nowrap">{metricValue(m.current_period, m.unit)}</TableCell><TableCell className="whitespace-nowrap">{metricValue(m.last_period, m.unit)}</TableCell><TableCell className="whitespace-nowrap">{m.target ? `${m.target.comparator} ${metricValue(m.target.value, m.unit)}` : '—'}</TableCell></TableRow>)}</TableBody></Table></div>{!result.data.metrics.length && <p>Belum ada indikator yang dikembalikan Shopee.</p>}<details className="text-sm"><summary>Keterangan data</summary><p className="mt-2 text-muted-foreground">Periode dan target mengikuti Shopee. Tanda — berarti nilai belum tersedia, bukan nol. Halaman ini tidak membuat skor kualitas produk.</p></details></>}
  </div>
}
