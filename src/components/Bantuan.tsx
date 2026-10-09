import type { ReactNode } from 'react'

/** Secondary explanations stay available without displacing working data. */
export default function Bantuan({
  children,
  judul = 'Penjelasan',
}: {
  children: ReactNode
  judul?: string
}) {
  return (
    <details className="rounded-lg border bg-card/80 text-sm">
      <summary className="cursor-pointer px-3 py-2 font-medium text-muted-foreground">
        {judul}
      </summary>
      <div className="space-y-2 border-t p-3 leading-relaxed">{children}</div>
    </details>
  )
}
