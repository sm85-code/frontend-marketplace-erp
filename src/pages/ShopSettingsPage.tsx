import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarHalaman } from '@/components/daftar'
import { useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import { useTokoAktif } from '@/lib/tokoAktif'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { ShopSettingsContent } from './ShopSettings'

export default function ShopSettingsPage() {
  const [shop,setShop] = useTokoAktif(true)
  const shops = useQuery({queryKey:['akun'],queryFn:()=>listAkun()})
  const available = shops.data?.filter(s=>s.platform==='shopee' && s.id_toko_eksternal) ?? []
  const selected = available.find(s=>s.id===shop)
  return <div className="space-y-4">
    <BarHalaman judul="Pengaturan Toko" />
    <div className="space-y-2"><label htmlFor="settings-shop">Toko Shopee</label><Select value={selected?.id??''} onValueChange={v=>setShop(v)}><SelectTrigger id="settings-shop" className="w-full sm:max-w-md"><SelectValue placeholder="Pilih toko" /></SelectTrigger><SelectContent>{available.map(s=><SelectItem key={s.id} value={s.id}>{s.nama_toko}</SelectItem>)}</SelectContent></Select></div>
    {shops.isPending && <Spinner column/>}{shops.error && <QueryError error={shops.error} retry={shops.refetch}/>}
    {selected && <section className="rounded-2xl border bg-card p-3 sm:p-5"><ShopSettingsContent key={selected.id} id={selected.id}/></section>}
    {shops.data && !available.length && <p className="rounded-xl border bg-card p-4">Belum ada toko Shopee terhubung.</p>}
  </div>
}
