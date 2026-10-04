import type { ReactNode } from 'react'
import TableShell from '@/components/TableShell'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import KepalaUrut from './KepalaUrut'
import type { DefinisiKolom } from '@/lib/kolom'
import type { ArahUrut, Urut } from '@/lib/urut'

/**
 * One column, declared once. The same declaration drives the table (md and up) and the card list (phones),
 * so a new column or a changed cell shows up in both places.
 */
export interface KolomTabel<T> extends DefinisiKolom {
  sel: (item: T) => ReactNode
  /** Extra classes for the table cell (min width, no wrapping). */
  kelas?: string
  /** Identity column (order no., product name): stays in view while the table is scrolled sideways. At most one. */
  tetap?: boolean
  /** Right-align (numbers and amounts). */
  rata?: 'kanan'
  /** Value of this column for sorting in the browser (see TabelLokal). */
  nilai?: (item: T) => string | number | boolean | Date | null | undefined
  /** Makes the header clickable for sorting by this key (the page decides where sorting happens). */
  urut?: { kunci: string; arahAwal?: ArahUrut; label?: [naik: string, turun: string] }
  /** On phones: 'utama' = shown big at the top of the card, 'sembunyi' = left out. Default: a label/value row. */
  kartu?: 'utama' | 'sembunyi'
}

export interface PilihanTabel<T> {
  terpilih: (id: string) => boolean
  /** Rows that cannot be ticked (e.g. already finished) get no checkbox. */
  bisaDipilih?: (item: T) => boolean
  onUbah: (item: T, pilih: boolean) => void
  semuaDipilih: boolean
  adaYangBisaDipilih: boolean
  onUbahSemua: (pilih: boolean) => void
}

const LEBAR_CENTANG = '2.5rem' // keep in step with w-10 on the checkbox column

export default function TabelData<T>({
  label,
  items,
  kolom,
  idDari,
  namaDari,
  pilihan,
  aksi,
  judulAksi = 'Aksi',
  minWidth = 720,
  urut,
  onUrut,
  hp = 'kartu',
  footer,
}: {
  /** Names the table for screen readers (caption and scroll region). */
  label: string
  items: T[]
  kolom: KolomTabel<T>[]
  idDari: (item: T) => string
  /** Text for the checkbox's accessible name, e.g. the order number. */
  namaDari: (item: T) => string
  pilihan?: PilihanTabel<T>
  aksi?: (item: T) => ReactNode
  judulAksi?: string
  minWidth?: number
  /** Current sort and what a header click does; omit for an unsortable table. */
  urut?: Urut | null
  onUrut?: (kunci: string, arahAwal?: ArahUrut) => void
  /** On phones: 'kartu' (default, one card per row) or 'tabel' (keep the table and let it scroll sideways). */
  hp?: 'kartu' | 'tabel'
  /** Rows below the table body, e.g. a totals row (<TableRow>…). */
  footer?: ReactNode
}) {
  const bisaCentang = (item: T) => !!pilihan && (pilihan.bisaDipilih?.(item) ?? true)
  // Frozen columns (checkbox + the identity column) need an opaque background so scrolled cells slide under them.
  const kiriTetap = pilihan ? LEBAR_CENTANG : '0px'
  const gayaTetap = (k: KolomTabel<T>) => (k.tetap ? { position: 'sticky' as const, left: kiriTetap, zIndex: 1 } : undefined)
  const kelasTetap = (k: KolomTabel<T>) => (k.tetap ? 'bg-card shadow-[1px_0_0_var(--border)]' : '')
  const utama = kolom.filter((k) => k.kartu === 'utama')
  const baris = kolom.filter((k) => !k.kartu)

  return (
    <>
      <div className={hp === 'tabel' ? '' : 'hidden md:block'}>
        <TableShell minWidth={minWidth} label={`${label}, geser ke samping untuk kolom lain`}>
          <Table>
            <caption className="sr-only">{label}</caption>
            <TableHeader>
              <TableRow>
                {pilihan && (
                  <TableHead className="sticky left-0 z-[1] w-10 bg-card">
                    <Checkbox
                      checked={pilihan.semuaDipilih}
                      disabled={!pilihan.adaYangBisaDipilih}
                      onCheckedChange={(v) => pilihan.onUbahSemua(v === true)}
                      aria-label="Pilih semua di halaman ini"
                    />
                  </TableHead>
                )}
                {kolom.map((k) => {
                  const rata = k.rata === 'kanan' ? 'text-right' : ''
                  return k.urut && onUrut ? (
                    <KepalaUrut key={k.kunci} kunci={k.urut.kunci} urut={urut ?? null} onUrut={onUrut} arahAwal={k.urut.arahAwal} className={`whitespace-nowrap ${rata} ${kelasTetap(k)}`} style={gayaTetap(k)}>
                      {k.judul}
                    </KepalaUrut>
                  ) : (
                    <TableHead key={k.kunci} className={`whitespace-nowrap ${rata} ${kelasTetap(k)}`} style={gayaTetap(k)}>
                      {k.judul}
                    </TableHead>
                  )
                })}
                {aksi && <TableHead className="sticky right-0 bg-card text-right">{judulAksi}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const id = idDari(item)
                const dipilih = !!pilihan?.terpilih(id)
                return (
                  <TableRow key={id} data-state={dipilih ? 'selected' : undefined} className={dipilih ? 'bg-primary/5' : ''}>
                    {pilihan && (
                      <TableCell className="sticky left-0 z-[1] bg-card">
                        {bisaCentang(item) && (
                          <Checkbox
                            checked={dipilih}
                            onCheckedChange={(v) => pilihan.onUbah(item, v === true)}
                            aria-label={`Pilih ${namaDari(item)}`}
                          />
                        )}
                      </TableCell>
                    )}
                    {kolom.map((k) => (
                      <TableCell key={k.kunci} className={`${k.rata === 'kanan' ? 'text-right' : ''} ${k.kelas ?? ''} ${kelasTetap(k)}`} style={gayaTetap(k)}>
                        {k.sel(item)}
                      </TableCell>
                    ))}
                    {aksi && <TableCell className="sticky right-0 bg-card text-right">{aksi(item)}</TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
            {footer && <TableFooter>{footer}</TableFooter>}
          </Table>
        </TableShell>
      </div>

      <ul className={`space-y-3 md:hidden ${hp === 'tabel' ? 'hidden' : ''}`} aria-label={label}>
        {items.map((item) => {
          const id = idDari(item)
          const dipilih = !!pilihan?.terpilih(id)
          return (
            <li key={id} className={`rounded-xl border bg-card p-3 ${dipilih ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-start gap-3">
                {pilihan &&
                  (bisaCentang(item) ? (
                    <Checkbox
                      className="mt-1"
                      checked={dipilih}
                      onCheckedChange={(v) => pilihan.onUbah(item, v === true)}
                      aria-label={`Pilih ${namaDari(item)}`}
                    />
                  ) : (
                    // keeps the cards of one list aligned when only some rows can be ticked
                    <span className="size-4 shrink-0" aria-hidden="true" />
                  ))}
                <div className="min-w-0 flex-1 space-y-1.5 text-[length:var(--teks-data)]">
                  {utama.map((k) => (
                    <div key={k.kunci}>{k.sel(item)}</div>
                  ))}
                </div>
              </div>
              {baris.length > 0 && (
                <dl className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[length:var(--teks-data)]">
                  {baris.map((k) => (
                    <div key={k.kunci} className="contents">
                      <dt className="text-muted-foreground">{k.judul}</dt>
                      <dd className="min-w-0 break-words">{k.sel(item)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {aksi && <div className="mt-2 flex flex-wrap gap-2">{aksi(item)}</div>}
            </li>
          )
        })}
      </ul>
    </>
  )
}
