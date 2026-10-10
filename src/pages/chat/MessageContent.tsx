import { ArrowUpRight } from 'lucide-react'
import { chatPresentation } from '@/lib/chat'

export default function MessageContent({
  content,
  type,
  shopId,
  sourceContent,
  outgoing,
}: {
  outgoing?: boolean
  content: unknown
  type: string
  shopId?: string
  sourceContent?: unknown
}) {
  const view = chatPresentation(sourceContent ? { content, source_content: sourceContent } : content, type, shopId, outgoing)
  return (
    <div className={`min-w-0 space-y-2 break-words text-sm ${view.label === 'Produk' ? 'rounded-xl border border-border/70 bg-muted/70 p-3' : ''}`}>
      {!['text', 'notification', 'system'].includes(type) && <p className="text-xs text-muted-foreground">{view.label}</p>}
      {view.text.map((text, i) => (
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" key={i}>
          {text}
        </p>
      ))}
      {view.image && (
        <a href={view.image} target="_blank" rel="noopener noreferrer">
          <img
            src={view.image}
            alt={view.label}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-64 max-w-full rounded-lg object-contain"
          />
        </a>
      )}
      {view.video && <video src={view.video} controls preload="metadata" className="max-h-64 max-w-full rounded-lg" />}
      {view.link && view.link !== view.image && view.link !== view.video && (
        <a href={view.link} target="_blank" rel="noopener noreferrer" className={view.label === 'Produk' ? 'ml-auto flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring' : 'block underline [overflow-wrap:anywhere]'} aria-label={view.label === 'Produk' ? 'Buka produk di Shopee pada tab baru' : undefined} title={view.label === 'Produk' ? 'Buka produk di tab baru' : undefined}>
          {view.label === 'Produk' ? <ArrowUpRight className="size-4" aria-hidden="true" /> : 'Buka lampiran'}
        </a>
      )}
    </div>
  )
}
