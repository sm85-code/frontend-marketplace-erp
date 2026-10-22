import PilihNative from '@/components/PilihNative'
import TombolRefresh from '@/components/TombolRefresh'
import { BarHalaman } from '@/components/daftar'
import TableShell from '@/components/TableShell'
import PenaltiToko from './PenaltiToko'
import { useQuery } from '@tanstack/react-query'
import { useTokoAktif } from '@/lib/tokoAktif'
import * as api from '@/api/endpoints'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const labels: Record<string, string> = { non_fulfillment_rate: 'Pesanan tidak terpenuhi', cancellation_rate: 'Pembatalan', return_refund_rate: 'Retur/refund', late_shipment_rate: 'Pengiriman terlambat', preparation_time: 'Waktu persiapan', chat_response_rate: 'Tingkat balasan chat', same_day_handover_rate: 'Penyerahan pada hari yang sama', severe_listing_violations: 'Pelanggaran listing berat', spam_listings: 'Listing spam', counterfeit_ip_infringement: 'Pelanggaran hak kekayaan intelektual', prohibited_listings: 'Listing terlarang', pre_order_listing_rate: 'Proporsi preorder' }
const KATA: Record<string, string> = { rate: 'tingkat', late: 'terlambat', shipment: 'pengiriman', shipping: 'pengiriman', response: 'balasan', time: 'waktu', average: 'rata-rata', listing: 'listing', listings: 'listing', violation: 'pelanggaran', violations: 'pelanggaran', other: 'lainnya', shop: 'toko', rating: 'penilaian', handover: 'penyerahan', fast: 'cepat', order: 'pesanan', orders: 'pesanan', cancellation: 'pembatalan', preparation: 'persiapan', days: 'hari', day: 'hari', points: 'poin', penalty: 'penalti', customer: 'pembeli', satisfaction: 'kepuasan', service: 'layanan', same: 'sama', return: 'retur', non: 'tidak', fulfillment: 'terpenuhi', fulfilment: 'terpenuhi', severe: 'berat', prohibited: 'terlarang', counterfeit: 'palsu', ip: 'HKI', infringement: 'pelanggaran', spam: 'spam', pre: 'pre', of: '', the: '', and: 'dan', on: 'tepat', percentage: 'persentase', total: 'total', buyer: 'pembeli', complaint: 'keluhan', complaints: 'keluhan', reviews: 'ulasan', review: 'ulasan' }
/** Shopee sends English names; known ones have a fixed Indonesian label, the rest are translated word by word. */
export function namaIndikator(nama: string): string {
  const kunci = nama.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  if (labels[kunci]) return labels[kunci]
  const kata = kunci.split('_').filter(Boolean).map((w) => KATA[w] ?? w).filter(Boolean)
  const hasil = kata.join(' ')
  return hasil.charAt(0).toUpperCase() + hasil.slice(1)
}
function metricValue(value: number | null | undefined, unit: number): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const suffix: Record<number, string> = { 2: '%', 3: ' detik', 4: ' hari', 5: ' jam' }
  return value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + (suffix[unit] ?? '')
}
export default function PerformaTokoPage() {
  const [akun, setAkun] = useTokoAktif(true)
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => api.listAkun() })
  const result = useQuery({ queryKey: ['performa-toko', akun], queryFn: () => api.getShopPerformance(akun), enabled: !!akun, retry: false })
  return <div className="space-y-4 pb-24">
    <BarHalaman judul="Performa Toko"><TombolRefresh disabled={!akun || result.isFetching} memuat={result.isFetching} onClick={() => void result.refetch()} /></BarHalaman>
    <div className="space-y-2"><label htmlFor="performa-toko">Toko Shopee</label><PilihNative id="performa-toko" className="w-full rounded-2xl border bg-background px-4 py-2 sm:max-w-md" value={akun} onChange={e => setAkun(e.target.value)}><option value="">Pilih toko</option>{shops.data?.filter(s => s.platform === 'shopee').map(s => <option key={s.id} value={s.id}>{s.nama_toko}</option>)}</PilihNative></div>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    {result.error && <QueryError error={result.error} retry={result.refetch} />}
    {result.isFetching && <Spinner column label="Mengambil performa Shopee…" />}
    {!!akun && <PenaltiToko key={akun} akun={akun} />}
    {result.data && <><p className="text-xs text-muted-foreground">Diambil {new Date(result.data.diambil_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB</p>{result.data.metrics.length ? <TableShell label="Indikator performa toko" minWidth={720}><Table><TableHeader><TableRow><TableHead className="min-w-56">Indikator</TableHead><TableHead className="text-right">Periode saat ini</TableHead><TableHead className="text-right">Periode sebelumnya</TableHead><TableHead className="text-right">Target Shopee</TableHead></TableRow></TableHeader><TableBody>{result.data.metrics.map(m => <TableRow key={m.metric_id}><TableCell>{namaIndikator(m.metric_name)}</TableCell><TableCell className="whitespace-nowrap text-right">{metricValue(m.current_period, m.unit)}</TableCell><TableCell className="whitespace-nowrap text-right">{metricValue(m.last_period, m.unit)}</TableCell><TableCell className="whitespace-nowrap text-right">{m.target ? `${m.target.comparator} ${metricValue(m.target.value, m.unit)}` : '—'}</TableCell></TableRow>)}</TableBody></Table></TableShell> : <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">Belum ada indikator yang dikembalikan Shopee.</p>}<details className="text-sm"><summary>Keterangan data</summary><p className="mt-2 text-muted-foreground">Periode dan target mengikuti Shopee. Tanda — berarti nilai belum tersedia, bukan nol. Halaman ini tidak membuat skor kualitas produk.</p></details></>}
  </div>
}
