import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { TableHead } from '@/components/ui/table'
import type { ArahUrut, Urut } from '@/lib/urut'

/**
 * A table header that sorts when clicked. Drop-in for <TableHead> in any table:
 *   <KepalaUrut kunci="total" urut={urut} onUrut={ubah} arahAwal="desc">Total</KepalaUrut>
 * Screen readers get aria-sort and a button that says what a click does.
 */
export default function KepalaUrut({
  kunci,
  urut,
  onUrut,
  arahAwal = 'asc',
  className = '',
  style,
  children,
}: {
  kunci: string
  urut: Urut | null
  onUrut: (kunci: string, arahAwal?: ArahUrut) => void
  /** Direction on the first click ('desc' for dates and amounts). */
  arahAwal?: ArahUrut
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const aktif = urut?.kunci === kunci
  const arah = aktif ? urut.arah : null
  const Ikon = arah === 'asc' ? ArrowUp : arah === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <TableHead className={className} style={style} aria-sort={arah === 'asc' ? 'ascending' : arah === 'desc' ? 'descending' : 'none'}>
      <button
        type="button"
        onClick={() => onUrut(kunci, arahAwal)}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-inherit uppercase tracking-wider hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        {children}
        <Ikon className={`size-3.5 shrink-0 ${aktif ? 'text-foreground' : 'opacity-50'}`} aria-hidden="true" />
        <span className="sr-only">, urutkan</span>
      </button>
    </TableHead>
  )
}
