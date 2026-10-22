import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * One row of a list of folding sections: the title on the left, a chevron on the right, a line between rows. `onBuka` tells
 * when it opens or closes, so a row can load its data only once it is opened.
 */
export default function Lipat({ judul, children, onBuka }: { judul: string; children: ReactNode; onBuka?: (terbuka: boolean) => void }) {
  return (
    <details className="group border-b last:border-b-0" onToggle={onBuka ? (e) => onBuka(e.currentTarget.open) : undefined}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{judul}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  )
}
