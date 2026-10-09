import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ExternalLink, Package } from 'lucide-react'
import { mentionedProducts, type AssistantProduct } from '@/lib/assistantDisplay'
import type { AiAction } from '@/api/assistant'
import { getKatalog, listAkun } from '@/api/endpoints'
import { fmtRp } from '@/api/client'

function httpsPhoto(value: unknown): string|null {
  try { const url = new URL(String(value ?? '')); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
export default function AssistantProducts({ answer, actions }: { answer: string; actions: AiAction[] }) {
  const products = mentionedProducts(answer, actions)
  if (!products.length) return null
  return <section aria-label="Produk dalam jawaban" className="grid gap-2">{products.map(p => <ProductCard key={p.id} product={p}/>)}</section>
}
function ProductCard({ product: p }: { product: AssistantProduct }) {
  const [failedPhotos, setFailedPhotos] = useState<string[]>([])
  // Older tool receipts contain only identifiers. Hydrate media through the same
  // authenticated catalogue endpoint as ERP details, without another paid AI turn.
  const detail = useQuery({queryKey:['assistant-product-media',p.id],queryFn:()=>getKatalog(encodeURIComponent(p.id)),enabled:!p.foto || !p.url || failedPhotos.length > 0,staleTime:300000,retry:false})
  const accounts = useQuery({queryKey:['akun'],queryFn:()=>listAkun(),staleTime:300000})
  const current = detail.data?.id === p.id && String(detail.data.item_id) === p.item_id && (!p.akun_id || detail.data.akun_id === p.akun_id) ? detail.data : undefined
  const photo = [p.foto, httpsPhoto(current?.foto_utama), ...(current?.foto ?? []).map(httpsPhoto)].find((url): url is string => !!url && !failedPhotos.includes(url))
  const shop = accounts.data?.find(a=>a.id===(current?.akun_id || p.akun_id))?.id_toko_eksternal
  const url = p.url || (shop && /^[1-9]\d*$/.test(shop) && /^[1-9]\d*$/.test(p.item_id) ? `https://shopee.co.id/product/${shop}/${p.item_id}` : null)
  return <article className="flex min-w-0 gap-3 rounded-xl border bg-muted/20 p-3">
    {photo ? <img key={photo} src={photo} alt={p.nama} loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-lg object-cover" onError={()=>setFailedPhotos(previous => [...previous, photo])}/> : <span aria-label={detail.isFetching ? 'Memuat foto produk' : 'Foto produk belum tersedia'} className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted"><Package className="size-6 text-muted-foreground" aria-hidden="true"/></span>}
    <div className="min-w-0 space-y-1"><Link to={'/katalog/'+encodeURIComponent(p.id)} className="block text-sm font-semibold text-foreground hover:underline">{p.nama}</Link><p className="text-xs text-muted-foreground">{p.nama_toko}</p>{p.harga_min !== null && <p className="text-sm font-medium">{fmtRp(p.harga_min)}{p.harga_max !== null && p.harga_max !== p.harga_min ? ' – '+fmtRp(p.harga_max) : ''}</p>}{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4">Lihat di Shopee<ExternalLink className="size-3" aria-hidden="true"/></a>}</div>
  </article>
}
