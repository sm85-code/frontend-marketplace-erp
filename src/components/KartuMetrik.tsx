import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Headline figure card. Standard look = the siabumdes dashboard KPI card: inset icon tile, small caps label, big value.
 * Used by Dashboard and Laporan Keuangan.
 */
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
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>
  catatan?: string
  href?: string
  className?: string
}) {
  const isi = (
    <CardContent className="p-3 sm:p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-inset)' }}>
        <Icon className="size-4.5" style={{ color: 'var(--primary-dark, var(--primary))' }} />
      </div>
      <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="font-heading mt-1 text-lg font-bold tabular-nums [overflow-wrap:anywhere] sm:text-2xl">{nilai}</p>
      {catatan && <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{catatan}</p>}
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
