import { Link } from 'react-router-dom'
import { ExternalLink, Package } from 'lucide-react'
import { mentionedProducts } from '@/lib/assistantDisplay'
import type { AiAction } from '@/api/assistant'
import { fmtRp } from '@/api/client'
export default function AssistantProducts({ answer, actions }: { answer: string; actions: AiAction[] }) {
  const products = mentionedProducts(answer, actions)
  if (!products.length) return null
  return <section aria-label="Produk dalam jawaban" className="grid gap-2">{products.map(p => <article key={p.id} className="flex min-w-0 gap-3 rounded-xl border bg-muted/20 p-3">
    {p.foto ? <img src={p.foto} alt={p.nama} loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-lg object-cover" onError={e=>{e.currentTarget.hidden=true}}/> : <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted"><Package className="size-6 text-muted-foreground" aria-hidden="true"/></span>}
    <div className="min-w-0 space-y-1"><Link to={'/katalog/'+encodeURIComponent(p.id)} className="block text-sm font-semibold text-primary hover:underline">{p.nama}</Link><p className="text-xs text-muted-foreground">{p.nama_toko}</p>{p.harga_min !== null && <p className="text-sm font-medium">{fmtRp(p.harga_min)}{p.harga_max !== null && p.harga_max !== p.harga_min ? ' – '+fmtRp(p.harga_max) : ''}</p>}{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary">Lihat di Shopee<ExternalLink className="size-3" aria-hidden="true"/></a>}</div>
  </article>)}</section>
}
