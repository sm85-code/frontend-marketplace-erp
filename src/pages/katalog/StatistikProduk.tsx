import { useQuery } from '@tanstack/react-query'
import { getProductStats } from '@/api/endpoints'
import QueryError from '@/components/QueryError'
export default function StatistikProduk({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['statistik-produk', id], queryFn: () => getProductStats(id), retry: false })
  return <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Statistik Produk Shopee</h2>{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.isPending && <p>Memuat statistik…</p>}{q.data && <><dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">{([['Dilihat (30 hari)', q.data.views], ['Disukai', q.data.likes], ['Terjual (kumulatif)', q.data.sale], ['Rating', q.data.rating_star], ['Ulasan', q.data.comment_count]] as const).map(([name, value]) => <div key={name}><dt className="text-sm text-muted-foreground">{name}</dt><dd className="mt-1 text-lg font-semibold">{value == null ? '—' : value.toLocaleString('id-ID')}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Rating pembeli, bukan skor kualitas listing.</p></>}</section>
}
