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
  return <div className="mx-auto max-w-4xl space-y-4">
    <h1 className="page-h1 text-2xl font-semibold">Pengaturan Toko</h1>
    <div className="space-y-2"><label htmlFor="settings-shop">Toko Shopee</label><select id="settings-shop" className="w-full rounded-xl border bg-background p-3 sm:max-w-md" value={selected?.id??''} onChange={e=>setShop(e.target.value)}><option value="">Pilih toko</option>{available.map(s=><option key={s.id} value={s.id}>{s.nama_toko}</option>)}</select></div>
    {shops.isPending && <Spinner column/>}{shops.error && <QueryError error={shops.error} retry={shops.refetch}/>}
    {selected && <section className="rounded-2xl border bg-card p-3 sm:p-5"><ShopSettingsContent key={selected.id} id={selected.id}/></section>}
    {shops.data && !available.length && <p className="rounded-xl border bg-card p-4">Belum ada toko Shopee terhubung.</p>}
  </div>
}
