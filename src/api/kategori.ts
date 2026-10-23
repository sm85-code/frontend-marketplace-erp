import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'

export type ArahKategori = 'masuk' | 'keluar'

export interface KategoriTransaksi {
  id: string
  arah: ArahKategori
  nama: string
  /** Name of the group the category lands in (Pemasukan / Pengeluaran tabs); empty for "not income / expense". Display only. */
  kelompok: string
  /** Id of that group: what the category really points at. */
  kelompok_id: string
  /** Operasional page that offers it, if any. */
  operasional: 'umum' | 'packing' | 'supplier' | null
  urut: number
  aktif: boolean
  sistem: boolean
  auto_sembunyi: boolean
  dipakai: number
  /** Arus Kas rows filed under it (built-in rows included), over all months. */
  dipakai_arus_kas?: number
}

export interface Kelompok {
  id: string
  nama: string
}
export type KelompokDaftar = Record<ArahKategori, Kelompok[]>

export interface KategoriDaftar {
  items: KategoriTransaksi[]
  kelompok_daftar: KelompokDaftar
  operasional: ('umum' | 'packing' | 'supplier')[]
}

export interface IsianKategori {
  nama: string
  /** Id of the group. */
  kelompok: string
  operasional: string | null
}

export const daftarKategori = () => api.get<KategoriDaftar>('/kategori-transaksi').then((r) => r.data)
export const buatKategori = (arah: ArahKategori, isian: IsianKategori) => api.post<KategoriTransaksi>('/kategori-transaksi', { arah, ...isian }).then((r) => r.data)
export const ubahKategori = (id: string, isian: IsianKategori & { aktif: boolean }) => api.put<KategoriTransaksi>(`/kategori-transaksi/${id}`, isian).then((r) => r.data)
export const buatKelompok = (arah: ArahKategori, nama: string) => api.post<Kelompok>('/kategori-transaksi/kelompok', { arah, nama }).then((r) => r.data)
export const ubahKelompok = (id: string, nama: string) => api.put<Kelompok>(`/kategori-transaksi/kelompok/${id}`, { nama }).then((r) => r.data)
export const urutkanKategori = (arah: ArahKategori, ids: string[]) => api.put('/kategori-transaksi/urutan', { arah, ids }).then((r) => r.data)

const m = (id: string, arah: ArahKategori, nama: string, kelompok: string, operasional: KategoriTransaksi['operasional'], auto: boolean): KategoriTransaksi => ({ id, arah, nama, kelompok: KELOMPOK_NAMA_BAWAAN[kelompok] ?? '', kelompok_id: kelompok, operasional, urut: 0, aktif: true, sistem: true, auto_sembunyi: auto, dipakai: 0 })
/** The groups a fresh installation starts with (mirrors the server); used while the list loads or if it cannot be had. */
export const KELOMPOK_BAWAAN: KelompokDaftar = {
  masuk: [{ id: 'pemasukan', nama: 'Pemasukan' }],
  keluar: [{ id: 'hpp', nama: 'Harga pokok penjualan' }, { id: 'beban', nama: 'Beban operasional' }],
}
const KELOMPOK_NAMA_BAWAAN: Record<string, string> = Object.fromEntries([...KELOMPOK_BAWAAN.masuk, ...KELOMPOK_BAWAAN.keluar].map((g) => [g.id, g.nama]))
const P = 'pemasukan'
const H = 'hpp'
const B = 'beban'
/** What a fresh installation starts with (mirrors the server); used while the list loads or if it cannot be had. */
export const KATEGORI_BAWAAN: KategoriTransaksi[] = [
  m('saldo_toko', 'masuk', 'Saldo toko', P, null, false),
  m('produk', 'masuk', 'Penjualan produk', P, null, false),
  m('cat', 'masuk', 'Jasa cat', P, null, false),
  m('packing', 'masuk', 'Jasa packing', P, null, false),
  m('proses', 'masuk', 'Jasa proses pesanan', P, null, false),
  m('produk_proses', 'masuk', 'Penjualan produk + proses', P, null, true),
  m('cat_packing', 'masuk', 'Jasa cat + packing', P, null, true),
  m('lain_masuk', 'masuk', 'Pemasukan lainnya', P, null, true),
  m('bukan_masuk', 'masuk', 'Bukan pemasukan', '', null, true),
  m('tukang', 'keluar', 'Tukang', H, null, false),
  m('non_kayu', 'keluar', 'Produk non kayu', H, null, false),
  m('bahan_cat', 'keluar', 'Bahan dan perlengkapan cat', H, 'umum', false),
  m('perl_packing', 'keluar', 'Bahan dan perlengkapan packing', H, 'packing', false),
  m('ongkir', 'keluar', 'Ongkir manual', H, 'umum', false),
  m('gaji', 'keluar', 'Gaji', B, 'umum', false),
  m('iklan', 'keluar', 'Iklan', B, 'umum', false),
  m('langganan', 'keluar', 'Langganan', B, 'umum', false),
  m('atk', 'keluar', 'Belanja ATK', B, 'umum', true),
  m('atk_eceran', 'keluar', 'Belanja ATK eceran', B, 'packing', true),
  m('lain_keluar', 'keluar', 'Operasional lainnya', B, 'umum', true),
  m('bukan_keluar', 'keluar', 'Bukan pengeluaran', '', null, true),
  m('belanja_supplier', 'keluar', 'Belanja supplier', H, 'supplier', false),
].map((k, i) => ({ ...k, urut: i + 1 }))

function useKategoriData() {
  return useQuery({ queryKey: ['kategori-transaksi'], queryFn: daftarKategori, staleTime: 60_000 }).data
}

/** The category list, never empty: the defaults stand in until the server's list arrives. */
export const useKategori = (): KategoriTransaksi[] => useKategoriData()?.items ?? KATEGORI_BAWAAN

/** The groups of the Pemasukan / Pengeluaran tabs, with the defaults standing in until the server's list arrives. */
export const useKelompok = (): KelompokDaftar => useKategoriData()?.kelompok_daftar ?? KELOMPOK_BAWAAN
