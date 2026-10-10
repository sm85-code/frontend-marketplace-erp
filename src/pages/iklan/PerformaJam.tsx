import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import * as api from '@/api/commerce'
import { fmtRp, getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import Spinner from '@/components/Spinner'
import QueryError from '@/components/QueryError'

export default function PerformaJam() {
  const [open, setOpen] = useState(false)
  return <details className="rounded-xl border p-3" onToggle={e => setOpen(e.currentTarget.open)}><summary className="cursor-pointer font-medium">Performa iklan per jam</summary>{open && <Report />}</details>
}
function Report() {
  const [shop, setShop] = useState('')
  const [day, setDay] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()))
  const [campaign, setCampaign] = useState('')
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  const m = useMutation({ retry: false, mutationFn: () => api.hourlyAds(shop, day, campaign) })
  const money = (n: number | null | undefined) => n == null ? '—' : fmtRp(n)
  return <div className="space-y-3 pt-3"><form className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); m.mutate() }}><div className="space-y-1"><Label htmlFor="hourly-shop">Toko</Label><select id="hourly-shop" required className="w-full rounded-lg border bg-background p-2" disabled={m.isPending} value={shop} onChange={e => { setShop(e.target.value); m.reset() }}><option value="">Pilih toko</option>{shops.data?.filter(a => a.platform === 'shopee' && a.id_toko_eksternal).map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select></div><div className="space-y-1"><Label htmlFor="hourly-day">Tanggal (WIB)</Label><Input id="hourly-day" required type="date" disabled={m.isPending} value={day} onChange={e => { setDay(e.target.value); m.reset() }} /></div><div className="space-y-1"><Label htmlFor="hourly-campaign">ID kampanye · opsional</Label><Input id="hourly-campaign" inputMode="numeric" pattern="[1-9][0-9]*" placeholder="Seluruh iklan CPC" disabled={m.isPending} value={campaign} onChange={e => { setCampaign(e.target.value); m.reset() }} /></div><Button type="submit" disabled={m.isPending || !shop}>Tampilkan</Button></form>{shops.error && <QueryError error={shops.error} retry={shops.refetch} />}{m.isPending && <Spinner column />}{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}{m.data && <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Jam (WIB)</TableHead><TableHead>Tayangan</TableHead><TableHead>Klik</TableHead><TableHead>Biaya</TableHead><TableHead>GMV luas</TableHead><TableHead>Pesanan luas</TableHead><TableHead>ROAS luas</TableHead></TableRow></TableHeader><TableBody>{m.data.items.map((r, i) => <TableRow key={`${r.hour}:${i}`}><TableCell>{String(r.hour).padStart(2, '0')}:00</TableCell><TableCell>{r.impression ?? '—'}</TableCell><TableCell>{r.clicks ?? '—'}</TableCell><TableCell className="whitespace-nowrap">{money(r.expense)}</TableCell><TableCell className="whitespace-nowrap">{money(r.broad_gmv)}</TableCell><TableCell>{r.broad_order ?? '—'}</TableCell><TableCell>{r.broad_roas ?? r.broad_roi ?? '—'}</TableCell></TableRow>)}{!m.data.items.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada performa iklan pada tanggal ini.</TableCell></TableRow>}</TableBody></Table></div>}</div>
}
