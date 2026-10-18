import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** One headline figure: icon, small caps label, big value, optional note. Shared by Dashboard and Laporan Keuangan. */
export default function KartuMetrik({
  label,
  nilai,
  icon: Icon,
  catatan,
  href,
  className,
}: {
  label: string
  nilai: ReactNode
  icon: ComponentType<{ className?: string }>
  catatan?: string
  href?: string
  className?: string
}) {
  const isi = (
    <CardContent className="flex h-full flex-col justify-between gap-1.5 p-3">
      <div className="flex items-center gap-1.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <p className="min-w-0 text-[0.6875rem] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="font-heading text-base font-bold tabular-nums [overflow-wrap:anywhere] sm:text-xl">{nilai}</p>
      {catatan && <p className="hidden text-xs text-muted-foreground sm:block">{catatan}</p>}
    </CardContent>
  )
  return (
    <Card className={cn('min-w-0', className)}>
      {href ? (
        <Link to={href} className="block h-full rounded-[inherit] transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary">
          {isi}
        </Link>
      ) : (
        isi
      )}
    </Card>
  )
}
