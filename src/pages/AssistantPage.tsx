import { useEffect, useRef, useState } from 'react'
import AssistantActionDraft from '@/components/AssistantActionDraft'
import AssistantInternalData from '@/components/AssistantInternalData'
import AssistantProducts from '@/components/AssistantProducts'
import AssistantAnswer from '@/components/AssistantAnswer'
import { NAV } from '@/config/nav'
import { aiMoney, aiIncomplete, definiteRejection } from '@/lib/assistantDisplay'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Send, MessageSquarePlus, Bot, ChevronDown } from 'lucide-react'
import * as ai from '@/api/assistant'
import { listAkun } from '@/api/endpoints'
import { getApiError } from '@/api/client'
import api from '@/api/client'
import { useTokoAktif } from '@/lib/tokoAktif'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import QueryError from '@/components/QueryError'
import FormDialog from '@/components/FormDialog'
import { DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog'

const COMMAND_GROUPS: {label:string;commands:{label:string;prompt:string;agent:ai.AiAgent;mode:ai.AiMode}[]}[] = [
 {label:'Laporan internal · tanpa token',commands:[
  {label:'Penjualan',prompt:'ringkasan penjualan bulan ini',agent:'operasional',mode:'tanya'},
  {label:'Pesanan diproses',prompt:'pesanan perlu diproses',agent:'operasional',mode:'tanya'},
  {label:'Stok kritis',prompt:'stok kritis',agent:'operasional',mode:'tanya'},
  {label:'Chat pembeli',prompt:'kotak masuk chat',agent:'operasional',mode:'tanya'},
  {label:'Saldo toko',prompt:'saldo toko',agent:'operasional',mode:'tanya'},
  {label:'Bantuan',prompt:'bantuan',agent:'auto',mode:'tanya'}]},
 {label:'Operasional · draf sebelum eksekusi',commands:[
  {label:'Sinkron katalog',prompt:'sinkron katalog',agent:'operasional',mode:'perintah'},
  {label:'Balas pembeli',prompt:'Baca chat pembeli dan bantu susun balasan. Tanyakan percakapan yang saya pilih dahulu; jangan langsung mengirim.',agent:'operasional',mode:'perintah'},
  {label:'Proses pesanan',prompt:'Bantu proses pesanan; tanyakan nomor pesanan yang akan diproses dahulu.',agent:'operasional',mode:'perintah'},
  {label:'Modal produk',prompt:'Bantu isi modal produk; tanyakan produk dan nilai modal dahulu.',agent:'operasional',mode:'perintah'}]},
 {label:'Iklan · laporan dan strategi',commands:[
  {label:'Daftar iklan',prompt:'daftar iklan',agent:'iklan',mode:'tanya'},
  {label:'Evaluasi iklan',prompt:'Evaluasi biaya dan hasil iklan 7 hari terakhir. Beri rekomendasi tanpa mengubah data.',agent:'iklan',mode:'tanya'},
  {label:'Atur iklan',prompt:'Bantu mengatur iklan; tanyakan kampanye, tindakan dan nilai yang saya inginkan dahulu.',agent:'iklan',mode:'perintah'}]},
 {label:'Coding · persiapan pekerjaan',commands:[
  {label:'Laporkan masalah',prompt:'Bantu susun perbaikan fitur ERP. Tanyakan masalah, langkah reproduksi dan hasil yang saya inginkan.',agent:'coding',mode:'tanya'}]}
]

const selectClass = 'w-full rounded-xl border bg-background px-3 py-2 text-sm'
const statusLabels: Record<ai.AiTurn['status'],string> = {queued:'Dalam antrean',running:'AI sedang bekerja…',completed:'Selesai',partial:'Belum lengkap',failed:'Gagal',unknown:'Perlu diperiksa'}
const actionLabels: Record<ai.AiAction['status'],string> = {draft:'Menunggu persetujuan',confirmed:'Dikonfirmasi',cancelled:'Dibatalkan',running:'Memproses',succeeded:'Berhasil',rejected:'Ditolak',failed:'Gagal',unknown:'Belum pasti',reviewed:'Diperiksa admin'}
const toolLabels: Record<string,string> = {kotak_masuk_chat:'Kotak masuk chat',riwayat_chat:'Riwayat chat',balas_chat:'Balas chat',saldo_toko:'Saldo toko',mutasi_dana:'Mutasi dana',daftar_pesanan:'Daftar pesanan',stok_kritis:'Stok kritis',produk_terlaris:'Produk terlaris',proses_pesanan:'Proses pesanan',keputusan_pembatalan:'Keputusan pembatalan',visibilitas_produk:'Visibilitas produk',modal_produk:'Modal produk',sinkron_katalog:'Sinkron katalog',pengaturan_toko:'Pengaturan toko',detail_pesanan:'Detail pesanan',ringkasan_pendapatan:'Ringkasan pendapatan',daftar_toko:'Daftar toko',cari_produk:'Cari produk',metadata_produk:'Metadata produk',statistik_produk:'Statistik produk',diagnosis_produk:'Diagnosis produk',pengaturan_produk:'Pengaturan produk',performa_toko:'Performa toko',riwayat_penalti:'Riwayat penalti',ringkasan_usaha:'Ringkasan usaha',daftar_iklan:'Baca iklan',kelayakan_gmv:'Kelayakan GMV Max',laporan_gmv:'Laporan GMV Max',daftar_promosi:'Daftar promosi',detail_promosi:'Detail promosi',ubah_produk:'Edit produk',ubah_model:'Edit varian',ubah_pilihan_varian:'Edit pilihan varian',ubah_iklan:'Edit iklan',ubah_kata_kunci:'Edit kata kunci',buat_gmv:'Buat GMV Max',ubah_gmv:'Edit GMV Max',produk_gmv:'Produk GMV Max',buat_promosi:'Buat promosi',ubah_promosi:'Edit promosi',produk_promosi:'Produk promosi',buat_iklan:'Buat iklan produk'}
function JsonData({value}:{value:unknown}) { return <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">{JSON.stringify(value,null,2)}</pre> }
function ResolveAction({id}:{id:string}) {
  const qc=useQueryClient()
  const [open,setOpen]=useState(false),[note,setNote]=useState('')
  const mutation=useMutation({mutationFn:()=>ai.resolveAction(id,note.trim()),onSuccess:()=>{setOpen(false);setNote('');void qc.invalidateQueries({queryKey:['assistant-history']});void qc.invalidateQueries({queryKey:['assistant-status']})}})
  return <><Button type="button" size="sm" variant="outline" className="mt-2" onClick={()=>setOpen(true)}>Catat pemeriksaan</Button><FormDialog open={open} onOpenChange={setOpen} values={{note}} busy={mutation.isPending}><DialogContent><DialogHeader><DialogTitle>Hasil Pemeriksaan</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Periksa hasil di ERP atau Shopee terlebih dahulu. Catatan ini membuka kembali perintah AI untuk toko terkait; tidak mengulang perubahan.</p><form className="space-y-3" onSubmit={e=>{e.preventDefault();mutation.mutate()}}><Label htmlFor={'review-'+id}>Hasil yang Anda periksa</Label><Textarea id={'review-'+id} value={note} required minLength={5} maxLength={500} onChange={e=>setNote(e.target.value)} disabled={mutation.isPending}/>{mutation.error&&<p role="alert" className="text-sm text-destructive">{getApiError(mutation.error)}</p>}<Button disabled={note.trim().length<5||mutation.isPending}>Simpan pemeriksaan</Button></form></DialogContent></FormDialog></>
}
function Turn({turn,shop,rate}:{turn:ai.AiTurn;shop:string;rate?:string}) {
  return <article className="assistant-turn space-y-4 rounded-2xl border bg-card p-4 sm:p-5"><div className="ml-auto max-w-[95%] rounded-xl bg-primary/10 p-3"><div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Anda · {turn.mode==='perintah'?'Perintah':'Tanya'} · {shop}</span><time>{new Date(turn.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB</time></div><p className="whitespace-pre-wrap break-words text-sm">{turn.prompt}</p></div><div className="flex items-center gap-2 text-sm font-medium"><Bot className="size-4 shrink-0"/>Asisten AI<span className={'ml-auto text-xs '+(turn.status==='unknown'?'text-destructive':'text-muted-foreground')}>{aiIncomplete(turn.status,turn.answer)?'Belum lengkap':statusLabels[turn.status]}</span></div>{turn.answer&&<><AssistantAnswer text={turn.answer}/><AssistantProducts answer={turn.answer} actions={turn.actions}/></>}{turn.actions.length>0&&<details open={turn.status==='unknown'||turn.actions.some(a=>a.status==='draft')||turn.model==='internal-v1'} className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">Catatan {turn.actions.filter(a=>a.is_write).length} perubahan · {turn.actions.filter(a=>!a.is_write).length} pembacaan</summary><ul className="mt-3 space-y-2">{turn.actions.map(a=><li key={a.id} className="rounded-lg bg-muted/50 p-3"><div className="flex items-start justify-between gap-2 text-sm"><span>{toolLabels[a.tool]??a.tool}</span><strong className={'shrink-0 text-xs '+(a.status==='unknown'||a.status==='rejected'?'text-destructive':'')}>{actionLabels[a.status]}</strong></div>{a.is_write&&<p className="mt-1 text-xs text-muted-foreground">{a.status==='draft'?'Usulan perubahan':a.status==='confirmed'?'Diajukan ke antrean eksekusi':'Tindakan operasional'}</p>}{a.status==='draft'&&<AssistantActionDraft action={a} shop={shop} busy={ai.activeTurn(turn)}/>} {!a.is_write&&a.status==='succeeded'&&turn.model==='internal-v1'&&<AssistantInternalData value={a.result}/>} <details className="mt-2 text-xs"><summary className="cursor-pointer">Rincian data dan hasil</summary><div className="mt-2 space-y-2"><JsonData value={a.arguments}/><JsonData value={a.result}/>{a.is_write&&a.status==='unknown'&&!ai.activeTurn(turn)&&<ResolveAction id={a.id}/>}</div></details></li>)}</ul></details>}{!ai.activeTurn(turn)&&<p className="text-xs text-muted-foreground">{turn.model} · {turn.input_tokens.toLocaleString('id-ID')} token masuk · {turn.output_tokens.toLocaleString('id-ID')} keluar · Estimasi {aiMoney(turn.cost_usd,rate)}</p>}</article>
}
export default function AssistantPage({embedded=false}:{embedded?:boolean}) {
 const {user}=useAuth()
 return <AssistantWorkspace key={user?.id??'anonymous'} embedded={embedded}/>
}
function AssistantWorkspace({embedded}:{embedded:boolean}) {
  const qc=useQueryClient(),{user}=useAuth()
  const [params,setParams]=useSearchParams()
  const [floatingConversation,setFloatingConversation]=useState('')
  const conversation=embedded?floatingConversation:params.get('percakapan')??''
  const {pathname}=useLocation()
  const [activeShop,setActiveShop]=useTokoAktif()
  const match=pathname.match(/^\/(pesanan|katalog)\/([a-zA-Z0-9_-]+)$/)
  const resource=match&&!['retur','publikasi','promosi'].includes(match[2])?match:null
  const detail=useQuery({queryKey:['assistant-page-context',pathname],queryFn:async()=>{const endpoint=resource?.[1]==='pesanan'?'pesanan':'katalog-shopee';return (await api.get<{akun_id:string}>(`/${endpoint}/${resource![2]}`)).data},enabled:embedded&&!!resource,retry:false})
  const [prompt,setPrompt]=useState('')
  const [mode,setMode]=useState<ai.AiMode>('tanya')
  const [agent,setAgent]=useState<ai.AiAgent>('auto')
  const refreshed=useRef(new Set<string>())
  const [akun,setAkun]=useState('')
  const [page,setPage]=useState(1)
  const [historyPage,setHistoryPage]=useState(1)
  const selectedShop=embedded?(detail.data?.akun_id??activeShop):akun
  const storageKey=(embedded?'erp-ai-floating-pending-':'erp-ai-pending-')+(user?.id??'')
  const [pending,setPending]=useState<ai.AiRequest|null>(()=>{try {return JSON.parse(sessionStorage.getItem(storageKey)??'null') as ai.AiRequest|null}catch{return null}})
  const [recovering,setRecovering]=useState(!!pending)
  const status=useQuery({queryKey:['assistant-status'],queryFn:ai.assistantStatus,refetchInterval:30000,retry:false})
  const shops=useQuery({queryKey:['akun'],queryFn:()=>listAkun()})
  const list=useQuery({queryKey:['assistant-conversations',user?.id,page],queryFn:()=>ai.conversations(page)})
  const history=useQuery({queryKey:['assistant-history',user?.id,conversation,historyPage],queryFn:()=>ai.history(conversation,historyPage),enabled:!!conversation,retry:false,refetchInterval:q=>q.state.data?.items.some(ai.activeTurn)?2000:false})
  const busy=history.data?.items.some(ai.activeTurn)??false
  useEffect(()=>{
    for(const turn of history.data?.items??[]) {
      if(ai.activeTurn(turn)||refreshed.current.has(turn.id)||!turn.actions.some(a=>a.is_write&&a.status==='succeeded'))continue
      refreshed.current.add(turn.id)
      void qc.invalidateQueries({predicate:q=>!String(q.queryKey[0]).startsWith('assistant-')})
    }
  },[history.data,qc])
  const mutation=useMutation({mutationFn:ai.sendMessage,retry:false,onError:error=>{
    if(definiteRejection(error)){setPending(null);try{sessionStorage.removeItem(storageKey)}catch{/* storage unavailable */}setRecovering(false)}
    else setRecovering(true)
  },onSuccess:r=>{
    setPending(null);try{sessionStorage.removeItem(storageKey)}catch{/* storage unavailable */};setRecovering(false);setPrompt('');setHistoryPage(1)
    if(embedded)setFloatingConversation(r.conversation_id);else setParams({percakapan:r.conversation_id},{replace:true})
    qc.setQueryData(['assistant-history',user?.id,r.conversation_id,1],(old:{items:ai.AiTurn[];ada_lagi:boolean}|undefined)=>({items:[...(old?.items.filter(t=>t.id!==r.id)??[]),r],ada_lagi:old?.ada_lagi??false}))
    void qc.invalidateQueries({queryKey:['assistant-conversations']});void qc.invalidateQueries({queryKey:['assistant-status']})
  }})
  const locked=busy||mutation.isPending||recovering
  function send() {
    const body=pending??{operation_id:crypto.randomUUID(),conversation_id:conversation||null,akun_id:selectedShop||null,mode,agent,prompt:prompt.trim(),...(embedded?{context:{path:pathname,...(resource?{resource_id:resource[2]}:{})}}:{})}
    if(!pending&&(!body.prompt||(mode==='perintah'&&!selectedShop)))return
    setPending(body);try{sessionStorage.setItem(storageKey,JSON.stringify(body))}catch{/* in-memory recovery still works */};mutation.mutate(body)
  }
  function selectConversation(id:string){if(embedded)setFloatingConversation(id);else setParams(id?{percakapan:id}:{},{replace:true});setHistoryPage(1);mutation.reset()}
  return <div className={`mx-auto max-w-5xl space-y-4 ${embedded?'':'pb-24'}`}><div className="flex flex-wrap items-center justify-between gap-3">{!embedded&&<h1 className="page-h1 text-2xl font-semibold">Asisten AI</h1>}<Button variant="outline" disabled={mutation.isPending||recovering} onClick={()=>selectConversation('')}><MessageSquarePlus className="mr-2 size-4"/>Percakapan baru</Button></div>
    {!embedded&&<Button variant="ghost" size="sm" onClick={()=>window.dispatchEvent(new Event('erp-restore-ai'))}>Tampilkan tombol AI mengambang</Button>}
    {embedded&&<p className="truncate text-xs text-muted-foreground">Konteks: {resource?(resource[1]==='pesanan'?'Detail pesanan':'Detail produk'):NAV.find(n=>n.to===pathname)?.label??'ERP'} · {shops.data?.find(s=>s.id===selectedShop)?.nama_toko??'Seluruh toko'}</p>}
    {embedded&&detail.error&&<QueryError error={detail.error} retry={detail.refetch}/>}
    {status.error&&<QueryError error={status.error} retry={status.refetch}/>}{shops.error&&<QueryError error={shops.error} retry={shops.refetch}/>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{status.data?.model??'Memuat model…'} · Khusus admin</span>{status.data&&<span>Sonnet hari ini {aiMoney(status.data.spent_usd,status.data.usd_idr)} / {aiMoney(status.data.daily_usd,status.data.usd_idr)} · {status.data.used_turns}/{status.data.daily_turns} pesan</span>}</div>
    {status.data&&!status.data.available&&<p role="alert" className="rounded-xl border border-destructive/40 p-3 text-sm">Asisten belum tersedia.</p>}
    {status.data?.llm_available===false&&<p className="rounded-xl border p-3 text-sm">Sonnet belum tersedia. Perintah rutin internal tetap bisa digunakan; ketik bantuan untuk melihat daftar.</p>}
    {!!status.data?.unresolved?.length&&<details open className="rounded-xl border border-destructive/40 p-3 text-sm"><summary className="cursor-pointer font-medium">Tindakan perlu pemeriksaan</summary><ul className="mt-3 space-y-3">{status.data.unresolved.map(a=><li key={a.id}>{toolLabels[a.tool]??a.tool} · {shops.data?.find(s=>s.id===a.akun_id)?.nama_toko??'Toko terkait'}<ResolveAction id={a.id}/></li>)}</ul></details>}
    <details className="rounded-xl border bg-card p-3"><summary className="cursor-pointer text-sm">Riwayat percakapan</summary><div className="mt-3 space-y-2">{list.error&&<QueryError error={list.error} retry={list.refetch}/>}<label className="sr-only" htmlFor={`${embedded?'floating-':''}assistant-conversation`}>Percakapan</label><select id={`${embedded?'floating-':''}assistant-conversation`} className={selectClass} value={conversation} disabled={mutation.isPending||recovering} onChange={e=>selectConversation(e.target.value)}><option value="">Percakapan baru</option>{conversation&&!list.data?.items.some(c=>c.id===conversation)&&<option value={conversation}>Percakapan terpilih</option>}{list.data?.items.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Sebelumnya</Button><Button size="sm" variant="outline" disabled={!list.data?.ada_lagi} onClick={()=>setPage(p=>p+1)}>Berikutnya</Button></div></div></details>
    {history.error&&<QueryError error={history.error} retry={history.refetch}/>}
    {history.data?.ada_lagi&&<Button variant="outline" disabled={busy} onClick={()=>setHistoryPage(p=>p+1)}>Pesan lebih lama</Button>}{historyPage>1&&<Button variant="outline" onClick={()=>setHistoryPage(1)}>Pesan terbaru</Button>}
    <div aria-live="polite" className="space-y-4">{history.data?.items.map(t=><Turn key={t.id} turn={t} rate={status.data?.usd_idr} shop={shops.data?.find(s=>s.id===t.akun_id)?.nama_toko??(t.akun_id?'Toko terpilih':'Seluruh toko')}/>)}{!embedded&&!conversation&&<div className="rounded-2xl border bg-card p-5"><p className="font-medium">Tanyakan kondisi toko atau berikan perintah yang jelas.</p><div className="mt-4 flex flex-wrap gap-2">{['ringkasan penjualan bulan ini','Periksa kualitas produk saya','Evaluasi biaya dan hasil iklan 7 hari terakhir'].map(s=><Button key={s} variant="outline" size="sm" disabled={locked} onClick={()=>{setMode('tanya');setPrompt(s)}}>{s}</Button>)}</div></div>}</div>
    <div className="space-y-3 rounded-2xl border bg-card p-3">
      <Label htmlFor={`${embedded?'floating-':''}assistant-agent`}>Bidang bantuan</Label>
      <select id={`${embedded?'floating-':''}assistant-agent`} className={selectClass} value={agent} disabled={locked} onChange={e=>setAgent(e.target.value as ai.AiAgent)}><option value="auto">Otomatis · internal / Sonnet</option><option value="operasional">Operasional</option><option value="iklan">Iklan</option><option value="coding">Coding · susun rencana perbaikan</option></select>
      {COMMAND_GROUPS.map(group=><div key={group.label}><p className="mb-2 text-xs font-medium text-muted-foreground">{group.label}</p><div className="flex gap-2 overflow-x-auto pb-2">{group.commands.map(command=><Button key={command.label} type="button" variant="outline" size="sm" className="min-h-10 shrink-0" disabled={locked} onClick={()=>{setAgent(command.agent);setMode(command.mode);setPrompt(command.prompt)}}>{command.label}</Button>)}</div></div>)}
      <p className="text-xs text-muted-foreground">Pintasan mengisi pesan agar bisa Anda periksa sebelum dikirim.</p>
    </div>
    <form className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm" onSubmit={e=>{e.preventDefault();send()}}><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor={`${embedded?'floating-':''}assistant-shop`}>Toko</Label><select id={`${embedded?'floating-':''}assistant-shop`} className={selectClass} value={selectedShop} disabled={locked||!!(embedded&&detail.data?.akun_id)} onChange={e=>embedded?setActiveShop(e.target.value):setAkun(e.target.value)}><option value="">Seluruh toko · ringkasan saja</option>{shops.data?.filter(s=>s.platform==='shopee').map(s=><option key={s.id} value={s.id}>{s.nama_toko}</option>)}</select></div><div className="space-y-1"><Label htmlFor={`${embedded?'floating-':''}assistant-mode`}>Mode</Label><select id={`${embedded?'floating-':''}assistant-mode`} className={selectClass} value={mode} disabled={locked} onChange={e=>setMode(e.target.value as ai.AiMode)}><option value="tanya">Tanya · baca data</option><option value="perintah">Jalankan perintah · boleh mengubah data</option></select></div></div>{mode==='perintah'&&<p className="text-xs text-muted-foreground">Perintah menghasilkan draf pada toko terpilih. Periksa sasaran dan nilai, lalu konfirmasi sebelum data diubah.</p>}<Label className="sr-only" htmlFor={`${embedded?'floating-':''}assistant-prompt`}>Pertanyaan atau perintah</Label><Textarea id={`${embedded?'floating-':''}assistant-prompt`} className="min-h-24 max-h-48 resize-y" placeholder="Tulis pertanyaan atau perintah…" maxLength={4000} value={prompt} disabled={locked} onChange={e=>setPrompt(e.target.value)}/>
      {mutation.error&&<p role="alert" className="text-sm text-destructive">{getApiError(mutation.error)} {recovering?'Pemeriksaan/kirim ulang memakai ID permintaan yang sama.':'Perbaiki pesan atau pilihan toko, lalu kirim kembali.'}</p>}{recovering&&<p className="text-sm">Pesan: {pending?.prompt}. Ada permintaan sebelumnya yang belum terkonfirmasi. Periksa dengan ID yang sama agar tidak membuat tindakan ganda.</p>}
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{busy?'Proses tetap berjalan meski halaman ditutup.':`${prompt.length}/4.000`}</span><Button type="submit" disabled={!!(embedded&&resource&&!detail.data)||mutation.isPending||busy||!status.data?.available||(!pending&&(!prompt.trim()||(mode==='perintah'&&!selectedShop)))}><Send className="mr-2 size-4"/>{mutation.isPending?'Mengirim…':pending?'Periksa / kirim ulang':mode==='perintah'?'Jalankan':'Kirim'}</Button></div>
    </form>
    <details className="rounded-xl border p-3 text-sm"><summary className="flex cursor-pointer items-center gap-2"><ChevronDown className="size-4"/>Kemampuan dan batas penggunaan</summary><div className="mt-3 space-y-3 text-muted-foreground"><p>Kode internal membaca laporan, pesanan, stok, saldo dan iklan tanpa token untuk perintah rutin. Sonnet membantu bahasa bebas, analisis dan penyusunan draf. Mode Tanya tidak menjalankan perubahan; mode Perintah tetap memerlukan persetujuan draf.</p><p>Estimasi rupiah mengikuti kurs server; batas dan tagihan tetap USD. Biaya mengikuti token dan tarif model, bukan mengubah tarif Anthropic. Maksimal {status.data?.max_writes??5} perubahan dan cadangan {status.data?aiMoney(status.data.turn_usd,status.data.usd_idr):'—'} per pesan. Hasil belum pasti harus diperiksa sebelum mengulang.</p><p>Coding saat ini membantu menyusun kebutuhan dan rencana perbaikan yang tersimpan dalam percakapan. Belum ada worker untuk mengubah repo, migrasi atau deploy. GPT manajer, otomasi terjadwal, riset kompetitor, penarikan dana dan Flash Sale/Bundle Deal belum tersedia.</p></div></details>
  </div>
}
