import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/api/commerce'
import { listAkun } from '@/api/endpoints'
import { fmtDateTime, fmtMoney } from '@/api/client'
import { useTokoAktif } from '@/lib/tokoAktif'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableHead, TableBody, TableCell, TableRow } from '@/components/ui/table'
const field = 'w-full rounded-lg border bg-background p-2'

export default function PendapatanShopee() {
  const [shop, setShop] = useTokoAktif(true)
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  return <div className="space-y-4"><Label htmlFor="income-shop">Toko Shopee</Label><select id="income-shop" className={field} value={shop} onChange={e => setShop(e.target.value)}><option value="">Pilih toko</option>{shops.data?.filter(a => a.platform === 'shopee' && a.id_toko_eksternal).map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select>{shops.error && <QueryError error={shops.error} retry={shops.refetch} />}{shop && <Income key={shop} id={shop} />}</div>
}
function Income({ id }: { id: string }) {
  const wibDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)
  const [start, setStart] = useState(() => wibDate(new Date(Date.now() - 13 * 86400000)))
  const [end, setEnd] = useState(() => wibDate(new Date()))
  const [status, setStatus] = useState<1 | 2>(2)
  const [cursors, setCursors] = useState([''])
  const cursor = cursors[cursors.length - 1]
  const q = useQuery({ queryKey: ['income-shopee', id, start, end, status, cursor], queryFn: () => api.income(id, { dari: start, sampai: end, income_status: status, cursor }), enabled: !!start && !!end, retry: false })
  const money = (v: number | null | undefined, currency?: string) => v == null ? '—' : fmtMoney(v, currency)
  const time = (v?: number) => v ? fmtDateTime(new Date(v * 1000).toISOString()) : '—'
  return <div className="space-y-4"><div className="grid items-end gap-3 sm:grid-cols-3"><div className="space-y-1"><Label htmlFor="income-status">Status pendapatan</Label><select id="income-status" className={field} value={status} onChange={e => { setStatus(Number(e.target.value) as 1 | 2); setCursors(['']) }}><option value={2}>Belum cair</option><option value={1}>Sudah dirilis</option></select></div>{status === 1 && <><div className="space-y-1"><Label htmlFor="income-start">Dari (WIB)</Label><Input id="income-start" type="date" value={start} onChange={e => { setStart(e.target.value); setCursors(['']) }} /></div><div className="space-y-1"><Label htmlFor="income-end">Sampai (WIB)</Label><Input id="income-end" type="date" value={end} onChange={e => { setEnd(e.target.value); setCursors(['']) }} /></div></>}</div>{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data && <><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Pesanan</TableHead><TableHead>Status</TableHead><TableHead>Estimasi dana</TableHead><TableHead>Dana dirilis</TableHead><TableHead>{status === 2 ? 'Estimasi cair (WIB)' : 'Tanggal cair (WIB)'}</TableHead></TableRow></TableHeader><TableBody>{q.data.items.map((r, i) => <TableRow key={`${r.order_sn}:${i}`}><TableCell className="min-w-36"><div className="font-mono font-medium">{r.order_sn || '—'}</div><div className="text-xs text-muted-foreground">{r.description}</div></TableCell><TableCell>{r.status || '—'}</TableCell><TableCell className="whitespace-nowrap">{money(r.estimated_escrow_amount, r.currency)}</TableCell><TableCell className="whitespace-nowrap">{money(r.released_amount, r.currency)}</TableCell><TableCell className="whitespace-nowrap">{time(status === 2 ? r.estimated_payout_time : r.actual_payout_time)}</TableCell></TableRow>)}{!q.data.items.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Tidak ada pendapatan pada status ini.</TableCell></TableRow>}</TableBody></Table></div><div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={q.isFetching || cursors.length === 1} onClick={() => setCursors(c => c.slice(0, -1))}>Sebelumnya</Button><span className="text-sm text-muted-foreground">Halaman {cursors.length}</span><Button variant="outline" disabled={q.isFetching || !q.data.ada_lagi} onClick={() => setCursors(c => [...c, q.data!.next_cursor])}>Berikutnya</Button></div></>}</div>
}
