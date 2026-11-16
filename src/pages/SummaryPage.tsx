import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api, { fmtAngka, fmtDateTime, fmtRp } from '@/api/client'
import { BarHalaman } from '@/components/daftar'
import PilihNative from '@/components/PilihNative'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import './SummaryPage.css'

type NumberValue = string | number | null
type Metric = { orders: number; units: NumberValue; completed: number; processing: number; shipping: number; cancelled: number; returns: null; average_units: NumberValue; gross: NumberValue; net: null; pending: null; average_value: NumberValue; completed_sales: NumberValue; shipping_sales: NumberValue; cancellation_value: NumberValue; return_value: null; contribution?: NumberValue; waiting_courier: number; unknown: number; missing_sales: number; known_sales: NumberValue }
type Shop = Metric & { id: string; name: string }
type Group = Metric & { platform: string; shops: Shop[] }
type Summary = { totals: Metric; marketplaces: Group[]; trend: (Metric & { date: string })[]; shops: { id: string; platform: string; name: string }[]; orders: { platform: string; name: string; number: string; date: string; status: string; units: NumberValue; gross: NumberValue }[]; page: number; page_size: number; total_orders: number; start: string; end: string; as_of: string; last_source_update: string | null; limitations: string[]; quality: { deduplicated: number; fallback_dates: number; unknown_status: number; missing_sales: number } }
const MARKETPLACES: Record<string, string> = { shopee: 'Shopee', tiktokshop: 'TikTok Shop', lazada: 'Lazada' }
const STATUS: Record<string, string> = { perlu_diproses: 'Perlu diproses', dikirim: 'Dalam pengiriman', selesai: 'Selesai', dibatalkan: 'Dibatalkan', retur: 'Retur/pengembalian', menunggu_kurir: 'Menunggu kurir', belum_bayar: 'Belum bayar', tidak_dikenal: 'Belum dikenali' }
const PRESETS = { hari_ini: 'Hari ini', kemarin: 'Kemarin', '7': '7 hari terakhir', '30': '30 hari terakhir', bulan_ini: 'Bulan ini', bulan_lalu: 'Bulan lalu', khusus: 'Rentang khusus' }
const COUNT_KEYS: [keyof Metric, string][] = [['orders', 'Total Pesanan'], ['units', 'Total Unit Terjual'], ['completed', 'Pesanan Selesai'], ['processing', 'Perlu Diproses'], ['shipping', 'Dalam Pengiriman'], ['cancelled', 'Dibatalkan'], ['returns', 'Retur/Pengembalian'], ['average_units', 'Rata-rata Unit/Pesanan']]
const MONEY_KEYS: [keyof Metric, string][] = [['gross', 'Omzet Kotor'], ['net', 'Omzet Bersih'], ['average_value', 'Rata-rata Nilai Pesanan'], ['pending', 'Estimasi Menunggu Pencairan'], ['completed_sales', 'Omzet Pesanan Selesai'], ['shipping_sales', 'Omzet Dalam Pengiriman'], ['cancellation_value', 'Nilai Pembatalan'], ['return_value', 'Nilai Retur/Pengembalian']]

export default function SummaryPage() {
  const [tab, setTab] = useState<'orders' | 'sales'>('orders')
  const [preset, setPreset] = useState('bulan_ini')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [range, setRange] = useState({ start: '', end: '' })
  const [platform, setPlatform] = useState('semua')
  const [shop, setShop] = useState('')
  const [status, setStatus] = useState('semua')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const ready = preset !== 'khusus' || !!(range.start && range.end)
  const q = useQuery({ queryKey: ['summary', preset, range, platform, shop, status, page], enabled: ready,
    queryFn: async ({ signal }) => (await api.get<Summary>('/summary', { params: { preset, ...(preset === 'khusus' ? range : {}), platform, shop, status, page, page_size: 25 }, signal, timeout: 15000 })).data,
    staleTime: 60000, retry: false, refetchOnWindowFocus: false })
  const data = q.data
  const format = tab === 'sales' ? fmtRp : fmtAngka
  const toggle = (key: string) => setExpanded(previous => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next })
  const cells = (m: Metric) => tab === 'orders' ? <><td>{fmtAngka(m.orders)}</td><td>{fmtAngka(m.units)}</td><td>{fmtAngka(m.completed)}</td><td>{fmtAngka(m.processing)}</td></> : <><td>{fmtRp(m.gross)}</td><td title="Ledger retur/refund belum lengkap">{fmtRp(m.net)}</td><td>{m.contribution == null ? '—' : `${fmtAngka(m.contribution)}%`}</td></>
  return <div className="erp-summary space-y-3">
    <BarHalaman judul="Summary" />
    <div role="tablist" aria-label="Jenis KPI" className="summary-tabs">
      <button id="summary-orders" role="tab" aria-selected={tab === 'orders'} aria-controls="summary-panel" onClick={() => setTab('orders')}>Jumlah Pesanan</button>
      <button id="summary-sales" role="tab" aria-selected={tab === 'sales'} aria-controls="summary-panel" onClick={() => setTab('sales')}>Omzet Penjualan</button>
    </div>
    <div className="summary-filters">
      <label>Periode<PilihNative value={preset} onChange={e => { setPreset(e.target.value); setPage(1) }}>{Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</PilihNative></label>
      <label>Marketplace<PilihNative value={platform} onChange={e => { setPlatform(e.target.value); setShop(''); setPage(1) }}><option value="semua">Semua marketplace</option>{Object.entries(MARKETPLACES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</PilihNative></label>
      <label>Toko<PilihNative value={shop} onChange={e => { setShop(e.target.value); setPage(1) }}><option value="">Semua toko</option>{data?.shops.filter(s => platform === 'semua' || s.platform === platform).map(s => <option key={s.id} value={s.id}>{s.name} · {MARKETPLACES[s.platform]}</option>)}</PilihNative></label>
      <label>Status<PilihNative value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="semua">Semua status</option>{Object.entries(STATUS).slice(0, 5).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</PilihNative></label>
    </div>
    {preset === 'khusus' && <form className="summary-range" onSubmit={e => { e.preventDefault(); setRange({ start, end }); setPage(1) }}><label>Dari<input type="date" required value={start} onChange={e => setStart(e.target.value)} /></label><label>Sampai<input type="date" required min={start} value={end} onChange={e => setEnd(e.target.value)} /></label><Button type="submit" size="sm">Terapkan</Button></form>}
    {!ready && <p className="text-sm text-muted-foreground">Pilih tanggal lalu tekan Terapkan. Maksimal 366 hari.</p>}
    {ready && q.isPending && <Spinner column label="Membaca KPI ERP…" />}
    {q.error && <QueryError error={q.error} retry={q.refetch} />}
    {data && <div id="summary-panel" role="tabpanel" aria-labelledby={tab === 'orders' ? 'summary-orders' : 'summary-sales'} className="space-y-3">
      <p className="text-xs text-muted-foreground">Tanggal pesanan {data.start} s.d. {data.end} · Asia/Jakarta. Status terkini yang tersimpan; dibaca {fmtDateTime(data.as_of)} WIB.</p>
      <div className="summary-kpis">{(tab === 'orders' ? COUNT_KEYS : MONEY_KEYS).map(([key, label], i) => <div key={key} className={i < 4 ? 'summary-kpi' : 'summary-kpi summary-extra'}><span>{label}</span><strong>{format(data.totals[key])}</strong>{data.totals[key] == null && <small>Belum tersedia</small>}</div>)}</div>
      <details className="summary-notice" open><summary>Dasar angka & keterbatasan data</summary><p>{data.limitations[tab === 'sales' ? 2 : 4]}</p><p>{data.limitations[3]}</p><p>{data.limitations[0]}</p><p>Menunggu kurir: {data.totals.waiting_courier}; status belum dikenali: {data.quality.unknown_status}; tanggal memakai waktu masuk ERP: {data.quality.fallback_dates}; duplikat dikeluarkan: {data.quality.deduplicated}.</p>{data.quality.missing_sales > 0 && <p role="alert">{data.quality.missing_sales} pesanan tanpa subtotal barang lengkap. Omzet total tidak tersedia; subtotal yang diketahui: {fmtRp(data.totals.known_sales)}.</p>}</details>
      {data.total_orders === 0 && <p role="status" className="summary-notice">Tidak ada pesanan ERP sesuai filter ini. Ini tidak membuktikan tidak ada penjualan di marketplace.</p>}
      <details className="summary-chart"><summary>Tren {tab === 'orders' ? 'jumlah pesanan' : 'omzet kotor'} · tanggal pesanan</summary><div className="summary-chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trend.map(r => ({ date: r.date.slice(5), value: r[tab === 'orders' ? 'orders' : 'gross'] == null ? null : Number(r[tab === 'orders' ? 'orders' : 'gross']) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" minTickGap={30} /><YAxis width={65} tickFormatter={v => Number(v) >= 1000000 ? `${Number(v) / 1000000}jt` : Number(v) >= 1000 ? `${Number(v) / 1000}rb` : String(v)} /><Tooltip formatter={v => format(Number(v))} /><Area dataKey="value" name={tab === 'orders' ? 'Pesanan' : 'Omzet kotor'} type="monotone" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} connectNulls={false} /></AreaChart></ResponsiveContainer></div><p className="text-xs text-muted-foreground">Grafik memakai filter yang sama dengan tabel. Data omzet yang tidak lengkap ditampilkan sebagai celah.</p></details>
      <div className="summary-scroll" tabIndex={0} role="region" aria-label="Ringkasan marketplace dan toko"><table><thead><tr><th>Marketplace / Toko</th>{(tab === 'orders' ? ['Pesanan', 'Unit Terjual', 'Selesai', 'Perlu Diproses'] : ['Omzet Kotor', 'Omzet Bersih', 'Kontribusi Omzet Kotor']).map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{data.marketplaces.map(g => <Fragment key={g.platform}><tr className="summary-subtotal"><th><button className="summary-expand" aria-label={`${expanded.has(g.platform) ? 'Tutup' : 'Buka'} rincian ${MARKETPLACES[g.platform]}`} aria-expanded={expanded.has(g.platform)} onClick={() => toggle(g.platform)}>{expanded.has(g.platform) ? '−' : '+'}</button>{MARKETPLACES[g.platform]}</th>{cells(g)}</tr>{expanded.has(g.platform) && g.shops.map(s => <tr key={s.id}><th className="summary-shop">{s.name}</th>{cells(s)}</tr>)}</Fragment>)}</tbody><tfoot><tr><th>Total Keseluruhan</th>{cells({ ...data.totals, contribution: data.totals.gross ? 100 : null })}</tr></tfoot></table></div>
      <details><summary className="text-sm font-medium cursor-pointer">Rincian pesanan ({data.total_orders})</summary><div className="summary-scroll" tabIndex={0} role="region" aria-label="Rincian pesanan"><table><thead><tr>{['Nomor Pesanan', 'Toko', 'Tanggal', 'Status Tersimpan', 'Unit Dipesan', 'Subtotal Barang'].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{data.orders.map((r, i) => <tr key={`${r.platform}:${r.number}:${i}`}><th>{r.number}</th><th>{r.name}</th><td>{r.date}</td><td>{STATUS[r.status] || r.status}</td><td>{fmtAngka(r.units)}</td><td>{fmtRp(r.gross)}</td></tr>)}</tbody></table></div><div className="summary-paging"><Button size="sm" variant="outline" disabled={page === 1 || q.isFetching} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button><span>Halaman {page} / {Math.max(1, Math.ceil(data.total_orders / data.page_size))}</span><Button size="sm" variant="outline" disabled={page * data.page_size >= data.total_orders || q.isFetching} onClick={() => setPage(p => p + 1)}>Berikutnya</Button></div></details>
    </div>}
  </div>
}
