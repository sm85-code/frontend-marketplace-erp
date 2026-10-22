import { Info } from 'lucide-react'

/** A small info icon whose text shows on hover/long-press and is read by screen readers: explanations stay available without filling the screen. */
export default function InfoTip({ teks, className = '' }: { teks: string; className?: string }) {
  return (
    <span role="img" aria-label={teks} title={teks} className={`inline-flex shrink-0 cursor-help align-middle text-muted-foreground ${className}`}>
      <Info className="size-3.5" aria-hidden="true" />
    </span>
  )
}
