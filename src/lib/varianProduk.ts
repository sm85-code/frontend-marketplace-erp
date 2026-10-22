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

/** A variant name with all its choices, as typed when adding a product: Jenis → Basah, Kering. */
export type GrupVarian = { nama: string; nilai: string[] }
/** Most products one form may create at once. */
export const MAKS_KOMBINASI = 60

const rapikan = (t: string) => t.replace(/\s+/g, ' ').trim()
const rapikanGrup = (grup: GrupVarian[]): GrupVarian[] =>
  grup
    .map((g) => ({ nama: rapikan(g.nama), nilai: [...new Set(g.nilai.map(rapikan).filter(Boolean))] }))
    .filter((g) => g.nama || g.nilai.length)

/**
 * Every combination of the choices: Jenis Basah/Kering and Ukuran 1 kg/5 kg give four, one product each. Without any
 * variant there is a single combination with no variants, which is a product without variants.
 */
export function kombinasiVarian(grup: GrupVarian[]): Varian[][] {
  const g = rapikanGrup(grup)
  if (!g.length) return [[]]
  return g.reduce<Varian[][]>((acc, satu) => acc.flatMap((awal) => satu.nilai.map((n) => [...awal, { nama: satu.nama, nilai: n }])), [[]])
}

/** What is wrong with the variants being typed, or null: an unnamed variant or one without choices, a repeated name, too many products. */
export function masalahGrup(grup: GrupVarian[]): string | null {
  const g = rapikanGrup(grup)
  if (g.length > MAKS_VARIAN) return `Maksimal ${MAKS_VARIAN} varian`
  if (g.some((x) => !x.nama)) return 'Beri nama pada setiap varian'
  if (g.some((x) => !x.nilai.length)) return 'Isi minimal satu pilihan pada setiap varian'
  const nama = g.map((x) => x.nama.toLocaleLowerCase('id'))
  const dobel = nama.find((n, i) => nama.indexOf(n) !== i)
  if (dobel) return `Nama varian "${g[nama.indexOf(dobel)].nama}" dipakai dua kali`
  const jumlah = kombinasiVarian(g).length
  if (jumlah > MAKS_KOMBINASI) return `Kombinasi terlalu banyak (${jumlah}). Maksimal ${MAKS_KOMBINASI} produk sekali buat`
  if (kombinasiVarian(g).some((k) => ringkasanVarian(k).length > 100)) return 'Nilai varian terlalu panjang'
  return null
}

/** A stable key for one combination, to keep what was typed for it (SKU, price) while the choices change. */
export const kunciKombinasi = (k: Varian[]) => k.map((v) => `${v.nama}=${v.nilai}`).join('|')
