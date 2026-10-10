import api from './client'
export interface OrderNotice {key:string;id:string;order_sn:string;akun_id:string|null;nama_toko:string|null;kind:string;created_at:string;read:boolean;title:string;href:string}
export interface NotificationPage {items:OrderNotice[];unread:number;halaman:number;ada_lagi:boolean}
export const notifications=(halaman=1)=>api.get<NotificationPage>('/notifikasi',{params:{halaman}}).then(r=>r.data)
export async function notificationReadStatus(keys:string[]) {
  const batches=Array.from({length:Math.ceil(keys.length/500)},(_,i)=>keys.slice(i*500,(i+1)*500))
  const results=await Promise.all(batches.map(keys=>api.post<{keys:string[]}>('/notifikasi/status-dibaca',{keys}).then(r=>r.data)))
  return {keys:results.flatMap(r=>r.keys)}
}
export async function acknowledgeNotifications(keys:string[],semua_pesanan=false) {
  for(let i=0;i<Math.max(keys.length,1);i+=500)await api.post('/notifikasi/dibaca',{keys:keys.slice(i,i+500),semua_pesanan:semua_pesanan&&i===0})
}
