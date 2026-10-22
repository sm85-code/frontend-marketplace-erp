import { PaginasiLanjut } from '@/components/daftar/Paginasi'
import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, {getApiError} from '@/api/client'
import {listAkun} from '@/api/endpoints'
import * as notifications from '@/api/notifications'
import {chatNotices,type ChatNoticeSource} from '@/lib/notifications'
import {useAuth} from '@/lib/auth'
import QueryError from './QueryError'
import Spinner from './Spinner'
import {Button} from './ui/button'
import {Popover,PopoverContent,PopoverTrigger} from './ui/popover'

export default function NotificationsBell() {
  const {user}=useAuth()
  const [open,setOpen]=useState(false)
  const [page,setPage]=useState(1)
  const qc=useQueryClient()
  const shops=useQuery({queryKey:['akun'],queryFn:()=>listAkun()})
  const orders=useQuery({queryKey:['notifications',user?.id,page],queryFn:()=>notifications.notifications(page),refetchInterval:60000,retry:false})
  const targets=(shops.data??[]).filter(s=>s.platform==='shopee'&&s.id_toko_eksternal)
  const chats=useQuery({queryKey:['notification-chats',user?.id,targets.map(s=>s.id).join(',')],queryFn:async()=>Promise.all(targets.map(async shop=>{
    try{const r=await api.get<{conversations:ChatNoticeSource[];page_result?:{more?:boolean}}>(`/akun/${shop.id}/chat`,{timeout:15000});return {items:chatNotices(shop.id,shop.nama_toko,r.data.conversations),error:'',more:!!r.data.page_result?.more}}
    catch(e){return {items:[],error:`${shop.nama_toko}: ${getApiError(e)}`,more:false}}
  })),enabled:targets.length>0,refetchInterval:60000,retry:false})
  const chatItems=(chats.data??[]).flatMap(s=>s.items).sort((a,b)=>b.timestamp-a.timestamp)
  const chatKeys=chatItems.map(s=>s.key)
  const reads=useQuery({queryKey:['notification-read-status',user?.id,chatKeys.join('|')],queryFn:()=>notifications.notificationReadStatus(chatKeys),enabled:chatKeys.length>0,retry:false,refetchInterval:60000})
  const readKeys=new Set(reads.data?.keys??[])
  const unreadChats=chatItems.filter(i=>!readKeys.has(i.key))
  const count=(orders.data?.unread??0)+(reads.data?unreadChats.length:0)
  const mark=useMutation({mutationFn:({keys,all=false}:{keys:string[];all?:boolean})=>notifications.acknowledgeNotifications(keys,all),onSuccess:()=>{void qc.invalidateQueries({queryKey:['notifications']});void qc.invalidateQueries({queryKey:['notification-read-status']})}})
  function visit(key:string){mark.mutate({keys:[key]});setOpen(false)}
  return <Popover open={open} onOpenChange={v=>{setOpen(v);if(v)setPage(1)}}><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative shrink-0 rounded-full" aria-label={`Notifikasi ERP${count?` · ${count} belum dibaca`:''}`}><Bell className="size-5"/>{count>0&&<span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">{count>99?'99+':count}</span>}</Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(25rem,calc(100vw-1.5rem))] p-0"><header className="flex items-center justify-between gap-2 border-b p-3"><h2 className="font-semibold">Notifikasi ERP</h2><Button size="sm" variant="ghost" disabled={mark.isPending||!orders.data||!!orders.error||!!reads.error||(chatKeys.length>0&&!reads.data)||count===0} onClick={()=>mark.mutate({keys:chatKeys,all:true})}><CheckCheck className="size-4"/><span>Tandai semua dibaca</span></Button></header>
      <div className="max-h-[min(65dvh,32rem)] overflow-y-auto p-2">
        {(orders.isPending || (chats.isPending&&targets.length>0))&&<Spinner column/>}
        {orders.error&&<QueryError error={orders.error} retry={orders.refetch}/>}{shops.error&&<QueryError error={shops.error} retry={shops.refetch}/>}{reads.error&&<QueryError error={reads.error} retry={reads.refetch}/>}
        {mark.error&&<p role="alert" className="p-2 text-sm text-destructive">{getApiError(mark.error)}</p>}
        {orders.data?.items.map(n=><Link key={n.key} to={n.href} onClick={()=>visit(n.key)} className={`mb-1 block rounded-xl p-3 hover:bg-muted ${n.read?'':'bg-primary/10'}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{n.title}</strong>{!n.read&&<span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca"/>}</div><p className="mt-1 break-words text-sm">{n.order_sn}</p><p className="text-xs text-muted-foreground">{n.nama_toko??'Pesanan ERP'}</p></Link>)}
        {!!chatItems.length&&<h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground">Chat terbaru</h3>}
        {chatItems.map(n=><Link key={n.key} to={n.href} onClick={()=>visit(n.key)} className={`mb-1 block rounded-xl p-3 hover:bg-muted ${readKeys.has(n.key)?'':'bg-primary/10'}`}><p className="break-words text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.shopName}</p></Link>)}
        {(chats.data??[]).filter(s=>s.error).map(s=><p key={s.error} role="alert" className="p-2 text-xs text-destructive">{s.error}</p>)}
        {chats.data?.some(s=>s.more)&&<Link className="block p-3 text-sm underline" to="/chat" onClick={()=>setOpen(false)}>Lihat percakapan lainnya</Link>}
        {orders.data&&!orders.data.items.length&&!chatItems.length&&!chats.isPending&&!chats.data?.some(s=>s.error)&&<p className="p-6 text-center text-sm text-muted-foreground">Tidak ada pekerjaan tertunda pada data yang dimuat.</p>}
      </div>
      {(orders.data?.ada_lagi||page>1)&&<footer className="flex items-center justify-between border-t p-2"><PaginasiLanjut halaman={page} bisaMundur={!(page===1)} bisaMaju={!(!orders.data?.ada_lagi)} onMundur={()=>setPage(p=>p-1)} onMaju={()=>setPage(p=>p+1)} /></footer>}
    </PopoverContent>
  </Popover>
}
