import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { getApiError, fmtDateTime } from '@/api/client'
import QueryError from '@/components/QueryError'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Rule = { akun_id:string; nama_toko:string; connected:boolean; enabled:boolean; enabled_at:string|null; branch_id:string|null; sender_real_name:string|null }
type Attempt = { pesanan_id:string; order_sn:string; nama_toko:string; status:string; message:string; created_at:string }
type Settings = { items:Rule[]; attempts:Attempt[]; worker_enabled:boolean }
const labels:Record<string,string> = {running:'Sedang diproses',succeeded:'Berhasil',blocked:'Perlu proses manual',unknown:'Hasil belum pasti',reviewed:'Sudah diperiksa'}

export default function AutoOrderSettings() {
  const qc=useQueryClient(), confirm=useConfirm()
  const [edits,setEdits]=useState<Record<string,Partial<Rule>>>({})
  const query=useQuery({queryKey:['auto-orders'],queryFn:()=>api.get<Settings>('/pesanan-otomatis').then(r=>r.data),refetchInterval:30000,retry:false})
  const mutation=useMutation({mutationFn:(items:Rule[])=>api.patch('/pesanan-otomatis',{items:items.map(r=>({akun_id:r.akun_id,enabled:r.enabled,branch_id:r.branch_id?.trim()||null,sender_real_name:r.sender_real_name?.trim()||null}))}),onSuccess:()=>{setEdits({});void qc.invalidateQueries({queryKey:['auto-orders']})}})
  const review=useMutation({mutationFn:(id:string)=>api.post(`/pesanan-otomatis/${encodeURIComponent(id)}/sudah-diperiksa`),onSuccess:()=>{void qc.invalidateQueries({queryKey:['auto-orders']});void qc.invalidateQueries({queryKey:['pesanan']})}})
  const items=(query.data?.items??[]).map(r=>({...r,...edits[r.akun_id]}))
  function edit(id:string,patch:Partial<Rule>){setEdits(old=>({...old,[id]:{...old[id],...patch}}))}
  return <section className="space-y-4 rounded-xl border bg-card p-4">
    <h2 className="font-semibold">Pesanan Shopee Otomatis · Drop Off</h2>
    <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">Ketentuan pemrosesan</summary><p className="mt-2"> Pesanan baru setelah toko diaktifkan akan diproses tanpa konfirmasi per pesanan saat siap dikirim. Pesanan lama tetap manual. Sistem memeriksa setiap menit setelah sinkronisasi pesanan; paket tetap perlu disiapkan dan diserahkan ke gerai.</p></details>
    {query.error&&<QueryError error={query.error} retry={query.refetch}/>}
    {query.data&&!query.data.worker_enabled&&<p role="alert" className="text-sm text-destructive">Shopee live sync belum aktif di backend; pemrosesan otomatis belum berjalan.</p>}
    <div className="divide-y rounded-lg border">{items.map(r=><div key={r.akun_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
      <label className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3"><input className="size-5" type="checkbox" checked={r.enabled} disabled={mutation.isPending||(!r.connected&&!r.enabled)} onChange={e=>edit(r.akun_id,{enabled:e.target.checked})}/><span className="font-medium">{r.nama_toko}</span></label>
      <p className="text-xs text-muted-foreground max-sm:w-full max-sm:pl-8">{r.connected?'Terhubung':'Hubungkan toko terlebih dahulu'}{r.enabled_at?` · Berlaku sejak ${fmtDateTime(r.enabled_at)} WIB`:''}</p>
      <details className="w-full pl-8"><summary className="cursor-pointer text-xs text-muted-foreground">Data drop off tambahan</summary><div className="mt-2 space-y-2"><label className="block text-sm">ID cabang gerai<Input value={r.branch_id??''} disabled={mutation.isPending} onChange={e=>edit(r.akun_id,{branch_id:e.target.value})}/></label><label className="block text-sm">Nama pengirim<Input value={r.sender_real_name??''} disabled={mutation.isPending} onChange={e=>edit(r.akun_id,{sender_real_name:e.target.value})}/></label></div></details>
    </div>)}</div>
    {query.data&&items.length===0&&<p className="text-sm">Belum ada toko Shopee.</p>}
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Syarat dan penghentian</summary><p className="mt-2">Tanpa drop off atau data wajib, pesanan berhenti untuk proses manual. Jika gudang aktif, SKU dan reservasi stok harus lengkap. Menonaktifkan toko menghentikan proses berikutnya; proses yang sudah berjalan tidak dibatalkan.</p></details>
    {mutation.error&&<p role="alert" className="text-sm text-destructive">{getApiError(mutation.error)}</p>}
    <Button disabled={!Object.keys(edits).length||mutation.isPending} onClick={async()=>{if(await confirm({title:'Simpan izin pemrosesan otomatis?',description:'Toko yang dicentang memberikan izin memproses pesanan baru melalui drop off tanpa konfirmasi satu per satu. Tidak mengaktifkan pickup otomatis.'}))mutation.mutate(items.filter(r=>r.akun_id in edits))}}>{mutation.isPending?'Menyimpan…':'Simpan Pengaturan Otomatis'}</Button>
    {!!query.data?.attempts.length&&<details><summary className="cursor-pointer font-medium">Aktivitas otomatis terbaru</summary><ul className="mt-3 space-y-2">{query.data.attempts.map(a=><li key={a.pesanan_id} className="space-y-2 rounded-lg border p-3 text-sm"><p className="font-medium">{a.nama_toko} · {a.order_sn} · {labels[a.status]??a.status}</p><p>{a.message}</p><p className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)} WIB</p>{a.status==='unknown'&&<Button size="sm" variant="outline" disabled={review.isPending} onClick={async()=>{if(await confirm({title:'Sudah memeriksa Seller Centre?',description:'Pastikan status pengiriman sebenarnya di Shopee. Ini hanya membuka proses manual; tidak mengirim ulang pesanan otomatis.'}))review.mutate(a.pesanan_id)}}>Sudah diperiksa di Seller Centre</Button>}</li>)}</ul></details>}
    {review.error&&<p role="alert" className="text-sm text-destructive">{getApiError(review.error)}</p>}
  </section>
}
