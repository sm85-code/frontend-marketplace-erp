import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/api/management'
import { listAkun } from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { useTokoAktif } from '@/lib/tokoAktif'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import MoneyInput from '@/components/MoneyInput'
import QueryError from '@/components/QueryError'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
const field = 'w-full rounded-lg border bg-background p-2'
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const actions: Record<api.GmvAction, string> = { change_budget: 'Ubah anggaran', change_duration: 'Ubah jadwal', change_roas_target: 'Ubah target ROAS', pause: 'Jeda', resume: 'Lanjutkan', start: 'Mulai' }
export default function GmvMax() {
  const [akun, setAkun] = useTokoAktif(true)
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  return <div className="space-y-4"><div className="space-y-2"><Label htmlFor="gmv-shop">Toko Shopee</Label><select id="gmv-shop" className={field} value={akun} onChange={e => setAkun(e.target.value)}><option value="">Pilih toko</option>{shops.data?.filter(s=>s.platform==='shopee').map(s=><option key={s.id} value={s.id}>{s.nama_toko}</option>)}</select></div>{shops.error && <QueryError error={shops.error} retry={shops.refetch}/ >}{akun && <Manage key={akun} akun={akun}/>}</div>
}
function Manage({ akun }: { akun: string }) {
  const confirm = useConfirm()
  const [mode, setMode] = useState<'create'|'edit'|'items'|'report'>('report')
  const [id, setId] = useState('')
  const [budget, setBudget] = useState('')
  const [roas, setRoas] = useState('0')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [action, setAction] = useState<api.GmvAction>('change_budget')
  const [itemAction, setItemAction] = useState<'add'|'remove'>('add')
  const [items, setItems] = useState('')
  const [ref, setRef] = useState(()=>crypto.randomUUID())
  const [offset, setOffset] = useState(0)
  const [perItem, setPerItem] = useState(false)
  const [error, setError] = useState('')
  const eligible = useQuery({ queryKey: ['gmv-eligibility', akun], queryFn: () => api.eligibility(akun), retry: false })
  const mutation = useMutation({ retry:false, mutationFn: async () => {
    if(mode==='create')return api.createGmv(akun,{daily_budget:Number(budget),start_date:start,...(end?{end_date:end}:{}),roas_target:Number(roas),reference_id:ref})
    if(mode==='items')return api.gmvItems(akun,{campaign_id:id,edit_action:itemAction,item_id_list:items.split(/[\s,;]+/).filter(Boolean)})
    return api.editGmv(akun,{campaign_id:id,edit_action:action,reference_id:ref,...(action==='change_budget'?{daily_budget:Number(budget)}:{}),...(action==='change_roas_target'?{roas_target:Number(roas)}:{}),...(action==='change_duration'?{start_date:start,...(end?{end_date:end}:{})}: {})})
  }, onSuccess:r=>{setId(r.campaign_id);setRef(crypto.randomUUID());void eligible.refetch()} })
  const report = useMutation({ retry:false, mutationFn:(page:number)=>api.gmvPerformance(akun,id,start,end,perItem,page),onSuccess:(_r,page)=>setOffset(page) })
  async function submit() {
    setError('')
    if(mode!=='create'&&!/^[1-9][0-9]*$/.test(id)){setError('Isi ID kampanye yang valid.');return}
    if((mode==='create'||action==='change_budget')&&mode!=='items'&&(!Number.isFinite(Number(budget))||Number(budget)<=0)){setError('Isi anggaran lebih dari nol.');return}
    if(mode==='items'&&!items.trim()){setError('Pilih ID produk.');return}
    if(await confirm({ title:'Kirim perubahan GMV Max ke Shopee?',description:mode==='create'?`Buat kampanye dengan anggaran ${fmtRp(budget)} per hari.`:mode==='items'?`${itemAction==='add'?'Tambah':'Hapus'} produk dari kampanye ${id}.`:`${actions[action]} · Kampanye ${id}.` }))mutation.mutate()
  }
  const busy = mutation.isPending || report.isPending
  const data = report.data
  return <section className="space-y-4 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Shop GMV Max</h2><Button variant="outline" disabled={eligible.isFetching||busy} onClick={()=>void eligible.refetch()}>Periksa kelayakan</Button></div>{eligible.error&&<QueryError error={eligible.error} retry={eligible.refetch}/ >}{eligible.data&&<p className="text-sm">{eligible.data.is_eligible?'Toko memenuhi syarat untuk membuat kampanye.':`Belum memenuhi syarat pembuatan: ${eligible.data.reason ?? 'Tidak tersedia'}`}</p>}
    <div className="space-y-2"><Label htmlFor="gmv-mode">Tindakan</Label><select id="gmv-mode" className={field} value={mode} disabled={busy} onChange={e=>{setMode(e.target.value as typeof mode);mutation.reset();report.reset();setError('')}}><option value="report">Lihat performa</option><option value="create">Buat kampanye</option><option value="edit">Kelola kampanye</option><option value="items">Kelola produk kampanye</option></select></div>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();setError('');if(mode==='report'){if(!start||!end){setError('Isi periode laporan.');return}report.mutate(0)}else void submit()}}>
      {mode!=='create'&&<div className="space-y-2"><Label htmlFor="gmv-id">ID Kampanye{mode==='report'?' · opsional':''}</Label><Input id="gmv-id" inputMode="numeric" pattern="[1-9][0-9]*" required={mode!=='report'} placeholder={mode==='report'?'Otomatis dari Shopee':undefined} value={id} disabled={busy} onChange={e=>{setId(e.target.value);report.reset()}}/></div>}
      {mode==='edit'&&<div className="space-y-2"><Label htmlFor="gmv-action">Perubahan</Label><select id="gmv-action" className={field} disabled={busy} value={action} onChange={e=>setAction(e.target.value as api.GmvAction)}>{Object.entries(actions).map(([a,label])=><option key={a} value={a}>{label}</option>)}</select></div>}
      {(mode==='create'||(mode==='edit'&&action==='change_budget'))&&<div className="space-y-2"><Label htmlFor="gmv-budget">Anggaran harian (mata uang toko)</Label><MoneyInput id="gmv-budget" value={budget} onChange={e=>setBudget(e.target.value)} disabled={busy}/></div>}
      {(mode==='create'||(mode==='edit'&&action==='change_roas_target'))&&<div className="space-y-2"><Label htmlFor="gmv-roas">Target ROAS (0 = otomatis)</Label><Input id="gmv-roas" type="number" min="0" max="100" step="0.1" required value={roas} disabled={busy} onChange={e=>setRoas(e.target.value)}/></div>}
      {(mode==='create'||mode==='report'||(mode==='edit'&&action==='change_duration'))&&<><div className="space-y-2"><Label htmlFor="gmv-start">Tanggal mulai (WIB)</Label><Input id="gmv-start" type="date" required value={start} disabled={busy} onChange={e=>{setStart(e.target.value);report.reset()}}/></div><div className="space-y-2"><Label htmlFor="gmv-end">Tanggal selesai (WIB){mode!=='report'?' · opsional':''}</Label><Input id="gmv-end" type="date" required={mode==='report'} value={end} disabled={busy} onChange={e=>{setEnd(e.target.value);report.reset()}}/></div></>}
      {mode==='items'&&<><div className="space-y-2"><Label htmlFor="gmv-items-action">Produk</Label><select id="gmv-items-action" className={field} value={itemAction} disabled={busy} onChange={e=>setItemAction(e.target.value as 'add'|'remove')}><option value="add">Tambah</option><option value="remove">Hapus dari kampanye</option></select></div><div className="space-y-2"><Label htmlFor="gmv-items">ID produk Shopee (maksimal 30)</Label><Input id="gmv-items" required value={items} disabled={busy} onChange={e=>setItems(e.target.value)} placeholder="Pisahkan dengan koma"/></div></>}
      {mode==='report'&&<label className="flex items-center gap-2"><input type="checkbox" className="size-4 shrink-0" checked={perItem} disabled={busy} onChange={e=>{setPerItem(e.target.checked);report.reset()}}/>Per produk</label>}
      <div className="sm:col-span-2"><Button type="submit" disabled={busy||(mode==='create'&&(!eligible.data?.is_eligible||eligible.isFetching))}>{busy?'Memproses…':mode==='report'?'Tampilkan':'Kirim ke Shopee'}</Button></div>
    </form>
    {(error||mutation.error||report.error)&&<p role="alert" className="break-words text-sm text-destructive">{error||getApiError(mutation.error||report.error)}{mutation.error ? ' Periksa hasil di Shopee sebelum mengulang perubahan.' : ''}</p>}
    {mutation.data&&<p role="status">Perubahan dikonfirmasi · Kampanye {mutation.data.campaign_id}. {mutation.data.warnings.join(' ')}</p>}
    {data&&<div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Produk / Kampanye</TableHead><TableHead>Biaya</TableHead><TableHead>GMV (luas)</TableHead><TableHead>ROAS (luas)</TableHead><TableHead>Pesanan (luas)</TableHead></TableRow></TableHeader><TableBody>{(data.result_list??[{item_id:data.campaign_id,report:data.report??{}}]).map(r=><TableRow key={r.item_id}><TableCell className="whitespace-nowrap">{r.item_id}</TableCell><TableCell className="whitespace-nowrap">{r.report.expense==null?'—':fmtRp(r.report.expense)}</TableCell><TableCell className="whitespace-nowrap">{r.report.broad_gmv==null?'—':fmtRp(r.report.broad_gmv)}</TableCell><TableCell>{r.report.broad_roi??'—'}</TableCell><TableCell>{r.report.broad_order??'—'}</TableCell></TableRow>)}</TableBody></Table></div>}
    {data&&perItem&&<div className="flex justify-between"><Button variant="outline" disabled={busy||offset===0} onClick={()=>report.mutate(Math.max(0,offset-50))}>Sebelumnya</Button><Button variant="outline" disabled={busy||!data.has_next_page} onClick={()=>report.mutate(offset+50)}>Berikutnya</Button></div>}
  </section>
}
