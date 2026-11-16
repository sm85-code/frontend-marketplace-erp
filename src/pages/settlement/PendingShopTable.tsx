import { Fragment, useState } from 'react'
import { fmtMoney } from '@/api/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Paginasi } from '@/components/daftar'
import type { ReactNode } from 'react'

export interface PendingRow {
  key: string; shopId: string; shop: string; number: string; amount: number | null; currency?: string
  products: string[]; variants: string[]; shipping: string | null
}
export function groupPending<T extends PendingRow>(rows: T[]) {
  const groups = new Map<string, { id: string; name: string; rows: T[]; totals: Map<string, number>; unknown: number }>()
  const seen = new Set<string>()
  for (const row of rows) {
    const key = JSON.stringify([row.shopId, row.number])
    if (seen.has(key)) continue
    seen.add(key)
    let group = groups.get(row.shopId)
    if (!group) { group = { id: row.shopId, name: row.shop, rows: [], totals: new Map(), unknown: 0 }; groups.set(row.shopId, group) }
    group.rows.push(row)
    if (row.amount == null) group.unknown++
    else group.totals.set(row.currency ?? 'IDR', (group.totals.get(row.currency ?? 'IDR') ?? 0) + row.amount)
  }
  return [...groups.values()]
}
export default function PendingShopTable<T extends PendingRow>({ rows, dates }: { rows: T[]; dates: (row: T) => ReactNode }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = search.trim().toLocaleLowerCase('id')
  const groups = groupPending(rows.filter(r => !query || [r.shop, r.number, ...r.products, ...r.variants, r.shipping].join(' ').toLocaleLowerCase('id').includes(query)))
  const pages = Math.max(1, Math.ceil(groups.length / 10))
  const current = Math.min(page, pages)
  const totals = new Map<string, number>()
  for (const g of groups) for (const [currency, total] of g.totals) totals.set(currency, (totals.get(currency) ?? 0) + total)
  const money = (values: Map<string, number>) => values.size ? [...values].map(([c, v]) => <div key={c}>{fmtMoney(v, c)}</div>) : '—'
  const count = groups.reduce((n, g) => n + g.rows.length, 0)
  const unknown = groups.reduce((n, g) => n + g.unknown, 0)
  return <div className="space-y-3">
    <input aria-label="Cari pesanan menunggu pencairan" placeholder="Cari toko, pesanan, produk…" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
    <div className="max-w-full overflow-x-auto rounded-md border">
      <Table aria-label="Pesanan menunggu pencairan" className="min-w-[360px]">
        <TableHeader><TableRow><TableHead className="w-10 px-1"><span className="sr-only">Rincian</span></TableHead><TableHead>Toko / Pesanan</TableHead><TableHead className="text-right">Jml.</TableHead><TableHead className="text-right">Menunggu Pencairan</TableHead></TableRow></TableHeader>
        <TableBody>{groups.slice((current - 1) * 10, current * 10).map(g => <Fragment key={g.id}>
          <TableRow className="bg-muted/40 font-semibold" data-shop-id={g.id}>
            <TableCell className="px-1"><button type="button" aria-label={`${expanded.has(g.id) ? 'Tutup' : 'Buka'} rincian ${g.name}`} aria-expanded={expanded.has(g.id)} className="inline-flex h-9 w-9 items-center justify-center rounded border text-lg" onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next })}>{expanded.has(g.id) ? '−' : '+'}</button></TableCell>
            <TableCell className="min-w-24 whitespace-normal">{g.name}</TableCell><TableCell className="text-right">{g.rows.length}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{money(g.totals)}{g.unknown > 0 && <small className="block font-normal">{g.unknown} belum ada estimasi</small>}</TableCell>
          </TableRow>
          {expanded.has(g.id) && g.rows.map(r => <TableRow key={r.key} data-order={r.number}>
            <TableCell className="px-1 text-center text-muted-foreground">↳</TableCell>
            <TableCell className="whitespace-normal"><div className="font-mono break-all">{r.number}</div>
              {r.products.map((p, i) => <div key={i} className="mt-1">{p}<span className="block text-xs text-muted-foreground">Varian: {r.variants[i] ?? '—'}</span></div>)}
              <div className="mt-1 text-xs text-muted-foreground"><div>Status Pengiriman: {r.shipping ?? '—'}</div>{dates(r)}</div>
            </TableCell><TableCell /><TableCell className="text-right align-top whitespace-nowrap">{r.amount == null ? '—' : fmtMoney(r.amount, r.currency)}</TableCell>
          </TableRow>)}
        </Fragment>)}</TableBody>
        <TableFooter><TableRow className="font-semibold"><TableCell colSpan={2}>Total {groups.length} toko{unknown > 0 && <small className="block font-normal">{unknown} pesanan belum ada estimasi dana</small>}</TableCell><TableCell className="text-right">{count}</TableCell><TableCell className="text-right whitespace-nowrap">{money(totals)}</TableCell></TableRow></TableFooter>
      </Table>
    </div>
    {!groups.length && <p className="text-sm text-muted-foreground">Tidak ada pesanan sesuai pencarian.</p>}
    <Paginasi halaman={current} totalHalaman={pages} onUbah={setPage} />
  </div>
}
