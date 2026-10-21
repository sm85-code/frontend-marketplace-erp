import type { Tingkat } from '@/api/types'

/**
 * What a page's access becomes when one of its two checkboxes (Baca / Tulis) is clicked.
 * Write includes read, so ticking Tulis ticks Baca too and unticking Baca clears both. A page that has only one level
 * (only read, or only an action) has a single box. `undefined` = no access.
 */
export function ubahCentang(tersedia: Tingkat[], sekarang: Tingkat | undefined, kolom: Tingkat, nilai: boolean): Tingkat | undefined {
  if (!tersedia.includes(kolom)) return sekarang
  if (kolom === 'tulis') return nilai ? 'tulis' : tersedia.includes('baca') ? 'baca' : undefined
  if (!nilai) return undefined
  return sekarang === 'tulis' ? 'tulis' : 'baca'
}

/** Whether a box shows ticked: Baca is ticked for read and for write; Tulis only for write. */
export function tercentang(sekarang: Tingkat | undefined, kolom: Tingkat): boolean {
  return kolom === 'baca' ? sekarang !== undefined : sekarang === 'tulis'
}

/** Two sets of page access are the same (order and missing keys do not matter). */
export function samaAkses(a: Record<string, Tingkat>, b: Record<string, Tingkat>): boolean {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}
