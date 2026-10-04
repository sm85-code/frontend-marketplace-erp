import { useMemo, useState } from 'react'

export type ArahUrut = 'asc' | 'desc'
export interface Urut {
  kunci: string
  arah: ArahUrut
}

/** "total:desc" <-> { kunci: 'total', arah: 'desc' }: the form used in the URL/API and in dropdowns. */
export const urutKeTeks = (u: Urut): string => `${u.kunci}:${u.arah}`

export function teksKeUrut(teks: string): Urut {
  const [kunci, arah] = teks.split(':')
  return { kunci, arah: arah === 'desc' ? 'desc' : 'asc' }
}

/**
 * Header click: a new column starts in its natural direction, the same column flips it.
 * (`arahAwal` is 'desc' for things like dates and amounts where the biggest/newest first is what people want.)
 */
export function ubahUrut(sekarang: Urut, kunci: string, arahAwal: ArahUrut = 'asc'): Urut {
  if (sekarang.kunci !== kunci) return { kunci, arah: arahAwal }
  return { kunci, arah: sekarang.arah === 'asc' ? 'desc' : 'asc' }
}

type Nilai = string | number | boolean | Date | null | undefined

const urutNilai = (a: Nilai, b: Nilai): number => {
  if (a == null && b == null) return 0
  if (a == null) return 1 // empty values go last, whichever way it is sorted
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' })
}

/** Sorts a copy of `items` in the browser by the column `u.kunci`; `nilaiDari` gives the value of that column. */
export function urutkanLokal<T>(items: T[], u: Urut | null, nilaiDari: (item: T, kunci: string) => Nilai): T[] {
  if (!u) return items
  const arah = u.arah === 'asc' ? 1 : -1
  return [...items].sort((x, y) => {
    const a = nilaiDari(x, u.kunci)
    const b = nilaiDari(y, u.kunci)
    if (a == null || b == null) return urutNilai(a, b) // empties last in both directions
    return arah * urutNilai(a, b)
  })
}

/** Client-side sorting for a list that is loaded in full (small tables). */
export function useUrutLokal<T>(items: T[] | undefined, nilaiDari: (item: T, kunci: string) => Nilai, awal: Urut | null = null) {
  const [urut, setUrut] = useState<Urut | null>(awal)
  const hasil = useMemo(() => urutkanLokal(items ?? [], urut, nilaiDari), [items, urut, nilaiDari])
  return {
    hasil,
    urut,
    /** Click on a column header. */
    ubah: (kunci: string, arahAwal: ArahUrut = 'asc') => setUrut((u) => ubahUrut(u ?? { kunci: '', arah: 'asc' }, kunci, arahAwal)),
  }
}

/**
 * Options of the "Urutan" dropdown, built from the sortable columns, so the card layout (phones, no column
 * headings) can sort too. A column's `urut.label` names its two directions, e.g. ['Terlama', 'Terbaru'].
 */
export function opsiUrutan<T extends { judul: string; urut?: { kunci: string; label?: [string, string] } }>(
  kolom: T[],
): { value: string; label: string }[] {
  return kolom.flatMap((k) =>
    k.urut
      ? [
          { value: `${k.urut.kunci}:asc`, label: `${k.judul}: ${k.urut.label?.[0] ?? 'A → Z'}` },
          { value: `${k.urut.kunci}:desc`, label: `${k.judul}: ${k.urut.label?.[1] ?? 'Z → A'}` },
        ]
      : [],
  )
}
