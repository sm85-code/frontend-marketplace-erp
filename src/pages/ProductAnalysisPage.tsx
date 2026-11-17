import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { fmtAngka, fmtRp } from '@/api/client'
import { BarHalaman } from '@/components/daftar'
import QueryError from '@/components/QueryError'
import './ProductAnalysisPage.css'

type Shop = { key: string; name: string; units: number; sales: string; shop_id: string | null; item_id: string | null; model_id: string | null; url: string | null }
type Group = { key: string; name: string; units: number; sales: string; shops: Shop[]; variants: Group[] }
type Listing = { key: string; name: string; variant: string; sku: string; shop: string; stock: number | null; status: string; as_of: string; url: string | null; message: string | null; reason: string | null }
type Data = { rows: (Group | Listing)[]; total: number; totals?: { units: number; sales: string }; shops: { id: string; name: string }[]; notes: string[] }
export default function ProductAnalysisPage() {
  const [tab, setTab] = useState('sales')
  const [preset, setPreset] = useState('bulan_ini')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [shop, setShop] = useState('')
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState('')
  const reset = () => { setPage(1); setOpen(new Set()) }
  const q = useQuery({ queryKey: ['product-analysis', tab, preset, start, end, shop, search, page],
    enabled: tab === 'links' || preset !== 'khusus' || (!!start && !!end),
    queryFn: async ({ signal }) => (await api.get<Data>('/product-analysis', {
      params: { tab, preset: tab === 'links' ? 'bulan_ini' : preset, start: start || undefined, end: end || undefined, shop, search, page, page_size: 25 }, signal, timeout: 15000,
    })).data, staleTime: 60000, retry: false, refetchOnWindowFocus: false })
  const toggle = (key: string) => setOpen(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice('Berhasil disalin') }
    catch { setNotice('Tidak dapat menyalin. Buka link lalu salin dari browser.') }
  }
  const expander = (key: string, name: string) => <button type="button" className="pa-expand" aria-expanded={open.has(key)} aria-label={`${open.has(key) ? 'Tutup' : 'Buka'} ${name}`} onClick={() => toggle(key)}>{open.has(key) ? '−' : '+'}</button>
  const shopRows = (shops: Shop[], indent: number) => shops.map(s => <tr key={s.key} className="pa-shop"><td style={{ paddingLeft: indent }}>{s.name}<small>Listing {s.item_id || 'belum tersedia'}{s.model_id && s.model_id !== '0' ? ` · model ${s.model_id}` : ''}</small>{s.url && <a href={s.url} target="_blank" rel="noopener noreferrer">Buka Shopee</a>}</td><td>{fmtAngka(s.units)}</td><td>{fmtRp(s.sales)}</td></tr>)
  return <div className="product-analysis space-y-3">
    <BarHalaman judul="Analisis Produk" />
    <div role="tablist" aria-label="Analisis Produk" className="pa-tabs">
      <button role="tab" aria-selected={tab === 'sales'} onClick={() => { setTab('sales'); reset() }}>Produk Terlaris</button>
      <button role="tab" aria-selected={tab === 'links'} onClick={() => { setTab('links'); reset() }}>Link Produk</button>
    </div>
    <form className="pa-filters" onSubmit={e => { e.preventDefault(); setSearch(draft); reset() }}>
      {tab === 'sales' && <label>Periode<select value={preset} onChange={e => { setPreset(e.target.value); reset() }}>{Object.entries({ hari_ini: 'Hari ini', '7': '7 hari', '30': '30 hari', bulan_ini: 'Bulan ini', khusus: 'Rentang tanggal' }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
      {tab === 'sales' && preset === 'khusus' && <><label>Dari<input type="date" value={start} onChange={e => { setStart(e.target.value); reset() }} /></label><label>Sampai<input type="date" value={end} onChange={e => { setEnd(e.target.value); reset() }} /></label></>}
      <label>Toko<select value={shop} onChange={e => { setShop(e.target.value); reset() }}><option value="">Semua toko</option>{q.data?.shops.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <label className="pa-search">Cari produk, SKU, varian<input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Nama produk / SKU / varian" /></label><button type="submit">Cari</button>
    </form>
    <p role="status" className="text-xs">{notice}</p>
    {q.isPending && <p>Memuat analisis…</p>}
    {q.error && <QueryError error={q.error} retry={q.refetch} />}
    {q.data && <>
      {tab === 'sales' && <p className="text-sm">Total hasil filter: <strong>{fmtAngka(q.data.totals?.units)} unit</strong> · Omzet {fmtRp(q.data.totals?.sales)} · Urutan unit terbesar</p>}
      <div className="pa-scroll"><table aria-label={tab === 'sales' ? 'Produk terlaris' : 'Link produk Shopee'}>
        <thead>{tab === 'sales' ? <tr><th>Produk / Varian / Toko</th><th>Unit</th><th>Omzet</th></tr> : <tr><th>Produk / Varian</th><th>Toko / Ketersediaan</th><th>Link Shopee</th></tr>}</thead>
        <tbody>
          {q.data.rows.length === 0 && <tr><td colSpan={3}>Tidak ada data untuk filter ini.</td></tr>}
          {tab === 'sales' ? (q.data.rows as Group[]).map(g => <Fragment key={g.key}>
            <tr className="pa-product"><td>{expander(g.key, g.name)}{g.name}</td><td>{fmtAngka(g.units)}</td><td>{fmtRp(g.sales)}</td></tr>
            {open.has(g.key) && <>{g.variants.map(v => <Fragment key={v.key}><tr className="pa-variant"><td>{expander(v.key, v.name)}{v.name}</td><td>{fmtAngka(v.units)}</td><td>{fmtRp(v.sales)}</td></tr>{open.has(v.key) && shopRows(v.shops, 42)}</Fragment>)}{shopRows(g.shops, 22)}</>}
          </Fragment>) : (q.data.rows as Listing[]).map(l => <tr key={l.key}><td>{l.name}{l.variant && <small>Varian: {l.variant}</small>}{l.sku && <small>SKU: {l.sku}</small>}</td><td>{l.shop}<small>Stok snapshot: {l.stock == null ? 'Belum tersedia' : fmtAngka(l.stock)} · {l.status}</small><small>{new Date(l.as_of).toLocaleString('id-ID')}</small></td><td>{l.url ? <div className="pa-actions"><button onClick={() => copy(l.url!)}>Salin Link Shopee</button><button onClick={() => copy(l.message!)}>Salin Pesan + Link</button><a href={l.url} target="_blank" rel="noopener noreferrer">Buka</a></div> : l.reason}</td></tr>)}
        </tbody>
      </table></div>
      <div className="pa-pagination"><button disabled={page === 1} onClick={() => { setPage(page - 1); setOpen(new Set()) }}>Sebelumnya</button><span>{page} / {Math.max(1, Math.ceil(q.data.total / 25))} · {q.data.total} {tab === 'sales' ? 'produk' : 'listing/varian'}</span><button disabled={page * 25 >= q.data.total} onClick={() => { setPage(page + 1); setOpen(new Set()) }}>Berikutnya</button></div>
      <details className="text-xs"><summary>Definisi dan keterbatasan data</summary><ul>{q.data.notes.map(n => <li key={n}>{n}</li>)}</ul></details>
      <p className="text-xs text-muted-foreground">Data sementara: koreksi retur sebagian belum lengkap. Omzet bukan omzet bersih.</p>
    </>}
  </div>
}
