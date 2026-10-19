/** Variants of a manual (non-wood) catalog product: any number of name/value pairs, e.g. Ukuran 5 kg + Jenis Basah. */
export type Varian = { nama: string; nilai: string }

export const SARAN_NAMA_VARIAN = ['Ukuran', 'Jenis', 'Warna', 'Model', 'Bahan']
export const MAKS_VARIAN = 8

/** Variants of a stored product; an older product that only has a size becomes one variant named Ukuran. */
export const varianDari = (p: { varian?: Varian[]; ukuran: string }): Varian[] =>
  p.varian ?? (p.ukuran ? [{ nama: 'Ukuran', nilai: p.ukuran }] : [])

/** "Ukuran: 5 kg · Jenis: Basah" (the older single size when there are no variants). */
export const labelVarian = (p: { varian?: Varian[]; ukuran: string }) =>
  p.varian?.length ? p.varian.map((v) => `${v.nama}: ${v.nilai}`).join(' · ') : p.ukuran

/** Rows the user filled in, trimmed; half-filled rows are kept so the form can flag them. */
export const bersihkanVarian = (varian: Varian[]): Varian[] =>
  varian
    .map((v) => ({ nama: v.nama.replace(/\s+/g, ' ').trim(), nilai: v.nilai.replace(/\s+/g, ' ').trim() }))
    .filter((v) => v.nama || v.nilai)

/** Same one-line summary the server keeps in `ukuran`: the values joined by " · ". */
export const ringkasanVarian = (varian: Varian[]) =>
  bersihkanVarian(varian)
    .map((v) => v.nilai)
    .join(' · ')

/** What is wrong with the variant rows, or null: a half-filled row, a repeated name, too many rows. */
export function masalahVarian(varian: Varian[]): string | null {
  const rows = bersihkanVarian(varian)
  if (rows.length > MAKS_VARIAN) return `Maksimal ${MAKS_VARIAN} varian`
  if (rows.some((v) => !v.nama || !v.nilai)) return 'Isi nama dan nilai pada setiap varian'
  const names = rows.map((v) => v.nama.toLocaleLowerCase('id'))
  const dobel = names.find((n, i) => names.indexOf(n) !== i)
  if (dobel) return `Nama varian "${rows[names.indexOf(dobel)].nama}" dipakai dua kali`
  if (ringkasanVarian(rows).length > 100) return 'Nilai varian terlalu panjang'
  return null
}

/** Product name as it goes to the supplier: "Pupuk (Ukuran: 5 kg, Jenis: Basah)"; the plain name without variants. */
export const namaDenganVarian = (p: { produk: string; varian?: Varian[] }) =>
  p.varian?.length ? `${p.produk} (${p.varian.map((v) => `${v.nama}: ${v.nilai}`).join(', ')})` : p.produk
