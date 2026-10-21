/** Who the monthly net profit is shared with, and how much of it. The whole profit is paid out; none stays in the main cash. The shares add up to 100. */
export const PENERIMA_LABA = [
  { id: 'admin', nama: 'Admin', persen: 40 },
  { id: 'owner', nama: 'Owner', persen: 60 },
] as const

/** Title of the Arus Kas group the shares are filed under (its identity; the shown text can be changed on Kelola Aplikasi). */
export const GRUP_PEMBAGIAN = 'Pembagian laba'

/** Row key (and Arus Kas row id) of a receiver's share. */
export const keyPembagian = (id: string) => `pl_${id}`

/** Every row of the profit sharing group: the receivers' shares and their total. */
export const KEY_PEMBAGIAN: ReadonlySet<string> = new Set([...PENERIMA_LABA.map((p) => keyPembagian(p.id)), 'jml_pembagian'])

/** Splits a month's profit by the shares, whole rupiah; the last receiver takes the rounding so the parts add up exactly. */
export function bagiLaba(laba: number): { id: string; nama: string; persen: number; jumlah: number }[] {
  if (!(laba > 0)) return PENERIMA_LABA.map((p) => ({ ...p, jumlah: 0 }))
  let sisa = Math.round(laba)
  return PENERIMA_LABA.map((p, i) => {
    const jumlah = i === PENERIMA_LABA.length - 1 ? sisa : Math.round((laba * p.persen) / 100)
    sisa -= jumlah
    return { ...p, jumlah }
  })
}
