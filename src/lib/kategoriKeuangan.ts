import type { Lembar } from '@/lib/sheetEngine'
import { keyKategori, RINCI_TABEL } from '@/lib/arusKasRinci'
import { KATEGORI_BAWAAN, type KategoriTransaksi } from '@/api/kategori'

export type Kategori = { id: string; label: string }
export const GRUP_MASUK = 'Kas masuk'
export const GRUP_KELUAR = 'Kas keluar'
const arahDari = (grup: string) => (grup === GRUP_MASUK ? 'masuk' : grup === GRUP_KELUAR ? 'keluar' : undefined)

/** Older sheets saved "not income / expense" as `bukan` in both directions; the table keeps one per direction. */
const normal = (id: string | undefined, grup: string) => (id === 'bukan' ? `bukan_${arahDari(grup)}` : id)

/** Where a cash-in / cash-out row of Arus Kas lands in the summarized tabs: the active categories of the table, in its order. */
export const opsiKategori = (grup: string, daftar: KategoriTransaksi[] = KATEGORI_BAWAAN): Kategori[] | undefined => {
  const arah = arahDari(grup)
  return arah ? daftar.filter((k) => k.arah === arah && k.aktif).map((k) => ({ id: k.id, label: k.nama })) : undefined
}
/** Whether a saved choice still names a category (a hidden one stays valid: figures filed under it keep counting). */
const ada = (id: string | undefined, grup: string, daftar: KategoriTransaksi[]) => !!id && daftar.some((k) => k.arah === arahDari(grup) && k.id === id)

/** Rows that exist in the report from the start; rows added by hand default to "other". */
const AWAL: Record<string, string> = {
  k_toko: 'saldo_toko',
  k_prod: 'produk',
  k_cat: 'cat',
  k_lain: 'lain_masuk',
  k_tukang: 'tukang',
  k_pembelian: 'non_kayu',
  k_operasional: 'lain_keluar',
  k_langganan: 'langganan',
  k_gaji: 'gaji',
  k_topup: 'bukan_keluar',
  k_lain_keluar: 'lain_keluar',
}
export const kategoriAwal = (key: string, grup: string) => AWAL[key] ?? (key.startsWith('op:') ? key.slice(3) : undefined) ?? (grup === GRUP_MASUK ? 'lain_masuk' : 'lain_keluar')

export const kategoriDari = (lembar: Lembar, key: string, grup: string, daftar: KategoriTransaksi[] = KATEGORI_BAWAAN) => {
  const saved = normal(lembar.baris.find((b) => b.id === keyKategori(key))?.label, grup)
  return ada(saved, grup, daftar) ? saved! : kategoriAwal(key, grup)
}

/**
 * The category of a sub-row (rincian, numbered 1.1, 1.2, ...): its own when one was chosen, else the one of its row.
 * A row with sub-rows has no category of its own to act on: each sub-row decides where its figure goes.
 */
export const kategoriRincian = (lembar: Lembar, key: string, indukKey: string, grup: string, daftar: KategoriTransaksi[] = KATEGORI_BAWAAN) => {
  const saved = normal(lembar.baris.find((b) => b.id === keyKategori(key))?.label, grup)
  return ada(saved, grup, daftar) ? saved! : kategoriDari(lembar, indukKey, grup, daftar)
}

/** Choosing the category the row would have anyway (`bawaan`: its initial one, or its row's for a sub-row) clears the override. */
export const setKategori = (lembar: Lembar, key: string, grup: string, id: string, bawaan: string = kategoriAwal(key, grup)): Lembar => {
  const rest = lembar.baris.filter((b) => b.id !== keyKategori(key))
  return { ...lembar, baris: id === bawaan ? rest : [...rest, { id: keyKategori(key), tabel: RINCI_TABEL, grup: 'kategori', label: id }] }
}
