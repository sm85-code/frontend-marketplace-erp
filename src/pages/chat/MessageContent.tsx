import { chatPresentation } from '@/lib/chat'

export default function MessageContent({
  content,
  type,
  shopId,
  sourceContent,
}: {
  content: unknown
  type: string
  shopId?: string
  sourceContent?: unknown
}) {
  const view = chatPresentation(sourceContent ? { content, source_content: sourceContent } : content, type, shopId)
  return (
    <div className="min-w-0 space-y-2 break-words text-sm">
      {type !== 'text' && <p className="text-xs text-muted-foreground">{view.label}</p>}
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
        <a href={view.link} target="_blank" rel="noopener noreferrer" className="block underline [overflow-wrap:anywhere]">
          {view.label === 'Produk' ? 'Lihat produk di Shopee' : 'Buka lampiran'}
        </a>
      )}
    </div>
  )
}
