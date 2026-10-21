import type { Lembar } from '@/lib/sheetEngine'
import { keyKategori, RINCI_TABEL } from '@/lib/arusKasRinci'

export type Kategori = { id: string; label: string }
/** Where a cash-in / cash-out row of Arus Kas lands in the summarized tabs (Pemasukan, Pengeluaran). `bukan` = not income / expense. */
export const KATEGORI_MASUK: Kategori[] = [
  { id: 'saldo_toko', label: 'Saldo toko' },
  { id: 'produk', label: 'Penjualan produk' },
  { id: 'cat', label: 'Jasa cat' },
  { id: 'packing', label: 'Jasa packing' },
  { id: 'proses', label: 'Jasa proses pesanan' },
  { id: 'lain_masuk', label: 'Pemasukan lainnya' },
  { id: 'bukan', label: 'Bukan pemasukan' },
]
export const KATEGORI_KELUAR: Kategori[] = [
  { id: 'tukang', label: 'Tukang' },
  { id: 'non_kayu', label: 'Produk non kayu' },
  { id: 'bahan_cat', label: 'Bahan dan perlengkapan cat' },
  { id: 'perl_packing', label: 'Perlengkapan packing' },
  { id: 'ongkir', label: 'Ongkir manual' },
  { id: 'gaji', label: 'Gaji' },
  { id: 'iklan', label: 'Iklan' },
  { id: 'langganan', label: 'Langganan' },
  { id: 'lain_keluar', label: 'Operasional lainnya' },
  { id: 'bukan', label: 'Bukan pengeluaran' },
]
export const GRUP_MASUK = 'Kas masuk'
export const GRUP_KELUAR = 'Kas keluar'
export const opsiKategori = (grup: string): Kategori[] | undefined => (grup === GRUP_MASUK ? KATEGORI_MASUK : grup === GRUP_KELUAR ? KATEGORI_KELUAR : undefined)

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
  k_topup: 'bukan',
  k_lain_keluar: 'lain_keluar',
}
export const kategoriAwal = (key: string, grup: string) => AWAL[key] ?? (grup === GRUP_MASUK ? 'lain_masuk' : 'lain_keluar')

export const kategoriDari = (lembar: Lembar, key: string, grup: string) => {
  const opsi = opsiKategori(grup)
  const saved = lembar.baris.find((b) => b.id === keyKategori(key))?.label
  return saved && opsi?.some((o) => o.id === saved) ? saved : kategoriAwal(key, grup)
}

/**
 * The category of a sub-row (rincian, numbered 1.1, 1.2, ...): its own when one was chosen, else the one of its row.
 * A row with sub-rows has no category of its own to act on: each sub-row decides where its figure goes.
 */
export const kategoriRincian = (lembar: Lembar, key: string, indukKey: string, grup: string) => {
  const opsi = opsiKategori(grup)
  const saved = lembar.baris.find((b) => b.id === keyKategori(key))?.label
  return saved && opsi?.some((o) => o.id === saved) ? saved : kategoriDari(lembar, indukKey, grup)
}

/** Choosing the category the row would have anyway (`bawaan`: its initial one, or its row's for a sub-row) clears the override. */
export const setKategori = (lembar: Lembar, key: string, grup: string, id: string, bawaan: string = kategoriAwal(key, grup)): Lembar => {
  const rest = lembar.baris.filter((b) => b.id !== keyKategori(key))
  return { ...lembar, baris: id === bawaan ? rest : [...rest, { id: keyKategori(key), tabel: RINCI_TABEL, grup: 'kategori', label: id }] }
}
