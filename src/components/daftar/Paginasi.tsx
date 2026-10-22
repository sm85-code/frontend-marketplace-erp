import { Button } from '@/components/ui/button'
import { nomorHalaman } from '@/lib/paginasi'

/** Numbered pager with previous / next. Hidden when everything fits on one page. */
export default function Paginasi({
  halaman,
  totalHalaman,
  onUbah,
  nama = 'Halaman',
}: {
  halaman: number
  totalHalaman: number
  onUbah: (h: number) => void
  nama?: string
}) {
  if (totalHalaman <= 1) return null
  return (
    <nav aria-label={nama} className="paginasi">
      <Button variant="outline" disabled={halaman <= 1} onClick={() => onUbah(halaman - 1)}>
        Sebelumnya
      </Button>
      {nomorHalaman(halaman, totalHalaman).map((n, i) =>
        n === null ? (
          <span key={`g${i}`} aria-hidden="true" className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={n}
            variant={n === halaman ? 'default' : 'outline'}
            aria-current={n === halaman ? 'page' : undefined}
            aria-label={`Halaman ${n}`}
            onClick={() => onUbah(n)}
          >
            {n}
          </Button>
        ),
      )}
      <Button variant="outline" disabled={halaman >= totalHalaman} onClick={() => onUbah(halaman + 1)}>
        Berikutnya
      </Button>
    </nav>
  )
}

/**
 * Pager for lists that only know "is there a next page" (Shopee cursor lists): same look as Paginasi,
 * previous · page label · next.
 */
export function PaginasiLanjut({ halaman, bisaMundur, bisaMaju, onMundur, onMaju, nama = 'Halaman' }: { halaman?: number; bisaMundur: boolean; bisaMaju: boolean; onMundur: () => void; onMaju: () => void; nama?: string }) {
  return (
    <nav aria-label={nama} className="paginasi">
      <Button variant="outline" disabled={!bisaMundur} onClick={onMundur}>Sebelumnya</Button>
      {halaman !== undefined && <span className="px-2 text-sm text-muted-foreground">Halaman {halaman}</span>}
      <Button variant="outline" disabled={!bisaMaju} onClick={onMaju}>Berikutnya</Button>
    </nav>
  )
}
