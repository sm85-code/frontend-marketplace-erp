import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Card wrapper with horizontal scroll so wide tables stay usable on phones. */
export default function TableCard({ toolbar, children, className }: { toolbar?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {toolbar ? <div className="flex flex-wrap items-end gap-3 border-b p-3 sm:p-4">{toolbar}</div> : null}
      <div className="overflow-x-auto">{children}</div>
    </Card>
  )
}
