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
    <CardContent className="flex h-full flex-col gap-2 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <p className="min-w-0 text-xs font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="font-heading text-xl font-bold tabular-nums [overflow-wrap:anywhere] sm:text-2xl">{nilai}</p>
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
