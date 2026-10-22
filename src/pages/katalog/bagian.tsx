import type { ReactNode } from 'react'

/** One thing to do with a product: what it does on the left (a line of text under the title), its button on the right. Rows of a card are separated by a line. */
export function BarisAksi({ judul, ket, children }: { judul: string; ket?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{judul}</div>
        {ket && <p className="mt-0.5 text-xs text-muted-foreground">{ket}</p>}
      </div>
      <div className="shrink-0 [&_a]:min-h-9 [&_a]:min-w-[6.5rem] [&_button]:min-h-9 [&_button]:min-w-[6.5rem]">{children}</div>
    </div>
  )
}
