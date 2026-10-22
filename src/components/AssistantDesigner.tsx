import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, PackagePlus } from 'lucide-react'
import { aiImage, type AiAction } from '@/api/assistant'
import { Button } from '@/components/ui/button'

type Sumber = { judul: string; url: string }
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

/** One AI photo, loaded through the authenticated API client. */
export function FotoAI({ id, className = '' }: { id: string; className?: string }) {
  // Cached for the session: the same photo appears in the chat and the draft card.
  const { data: url } = useQuery({ queryKey: ['assistant-image', id], queryFn: async () => URL.createObjectURL(await aiImage(id)), staleTime: Infinity, gcTime: Infinity, retry: false })
  return url
    ? <img src={url} alt="Foto produk AI" className={`aspect-square rounded-lg border object-cover ${className}`} />
    : <div className={`aspect-square animate-pulse rounded-lg bg-muted ${className}`} aria-label="Memuat foto" />
}

function safeUrl(u: string) { try { return ['https:', 'http:'].includes(new URL(u).protocol) ? u : '' } catch { return '' } }

/** Research sources, photo previews and the product-draft card of one assistant turn. */
export default function AssistantDesigner({ actions }: { actions: AiAction[] }) {
  const ok = actions.filter((a) => a.status === 'succeeded')
  const sumber = new Map<string, string>()
  for (const a of ok.filter((a) => a.tool === 'riset_web')) for (const s of (obj(a.result).sumber as Sumber[] | undefined) ?? []) if (safeUrl(s.url)) sumber.set(s.url, s.judul || s.url)
  const foto = ok.filter((a) => a.tool === 'buat_gambar_produk').flatMap((a) => (obj(a.result).gambar_ids as string[] | undefined) ?? [])
  const draf = ok.filter((a) => a.tool === 'buat_draf_produk').map((a): Record<string, unknown> & { args: Record<string, unknown> } => ({ ...obj(a.result), args: obj(a.arguments) }))
  if (!sumber.size && !foto.length && !draf.length) return null
  return <div className="space-y-3">
    {foto.length > 0 && !draf.length && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{foto.map((id) => <FotoAI key={id} id={id} />)}</div>}
    {draf.map((d) => {
      const gambar = (d.gambar_ids as string[] | undefined) ?? []
      return <div key={String(d.draf_id)} className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <div className="flex gap-3">
          {gambar[0] ? <FotoAI id={gambar[0]} className="w-20 shrink-0" /> : <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted"><PackagePlus className="size-6 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Draf produk · belum dipublikasikan</p>
            <p className="line-clamp-2 font-medium">{String(d.nama ?? '')}</p>
            <p className="text-sm">Rp {Number(d.harga_saran ?? 0).toLocaleString('id-ID')} · stok {String(d.args.stok ?? 0)} · {String(d.args.berat_kg ?? '')} kg</p>
          </div>
        </div>
        {gambar.length > 1 && <div className="grid grid-cols-4 gap-2">{gambar.slice(1).map((id) => <FotoAI key={id} id={id} />)}</div>}
        <Button asChild className="w-full sm:w-auto"><Link to={String(d.tautan ?? '/publikasi')}>Buka draf</Link></Button>
      </div>
    })}
    {sumber.size > 0 && <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">Sumber riset ({sumber.size})</summary>
      <ul className="mt-2 space-y-1">{[...sumber].map(([url, judul]) => <li key={url}><a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 text-primary underline-offset-2 hover:underline"><ExternalLink className="size-3 shrink-0" /><span className="truncate">{judul}</span></a></li>)}</ul>
    </details>}
  </div>
}
