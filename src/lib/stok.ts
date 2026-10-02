export type ModeStok = 'ubah' | 'atur'

/**
 * Signed stock change the backend expects (qty_delta), from what the user typed.
 * - 'ubah': the number is the change itself (+10 in, -3 out).
 * - 'atur': the number is the quantity that should be left; the change is worked out from the current stock.
 * Returns null when the input is empty / not a whole number / would leave negative stock.
 */
export function hitungPerubahanStok(mode: ModeStok, stokSekarang: number, input: string): number | null {
  if (input.trim() === '') return null
  const angka = Number(input)
  if (!Number.isInteger(angka)) return null
  const delta = mode === 'atur' ? angka - stokSekarang : angka
  return stokSekarang + delta < 0 ? null : delta
}
