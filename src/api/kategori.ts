import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'

export type ArahKategori = 'masuk' | 'keluar'

export interface KategoriTransaksi {
  id: string
  arah: ArahKategori
  nama: string
  /** Where the category lands in the Pemasukan / Pengeluaran tabs; empty for "not income / expense". */
  kelompok: string
  /** Operasional page that offers it, if any. */
  operasional: 'umum' | 'packing' | null
  urut: number
  aktif: boolean
  sistem: boolean
  auto_sembunyi: boolean
  dipakai: number
}

export interface KategoriDaftar {
  items: KategoriTransaksi[]
  kelompok: Record<ArahKategori, string[]>
  operasional: ('umum' | 'packing')[]
}

export interface IsianKategori {
  nama: string
  kelompok: string
  operasional: string | null
}

export const daftarKategori = () => api.get<KategoriDaftar>('/kategori-transaksi').then((r) => r.data)
export const buatKategori = (arah: ArahKategori, isian: IsianKategori) => api.post<KategoriTransaksi>('/kategori-transaksi', { arah, ...isian }).then((r) => r.data)
export const ubahKategori = (id: string, isian: IsianKategori & { aktif: boolean }) => api.put<KategoriTransaksi>(`/kategori-transaksi/${id}`, isian).then((r) => r.data)
export const urutkanKategori = (arah: ArahKategori, ids: string[]) => api.put('/kategori-transaksi/urutan', { arah, ids }).then((r) => r.data)

const m = (id: string, arah: ArahKategori, nama: string, kelompok: string, operasional: KategoriTransaksi['operasional'], auto: boolean): KategoriTransaksi => ({ id, arah, nama, kelompok, operasional, urut: 0, aktif: true, sistem: true, auto_sembunyi: auto, dipakai: 0 })
const P = 'Pemasukan'
const H = 'Harga pokok penjualan'
const B = 'Beban operasional'
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
].map((k, i) => ({ ...k, urut: i + 1 }))

/** The category list, never empty: the defaults stand in until the server's list arrives. */
export function useKategori(): KategoriTransaksi[] {
  const q = useQuery({ queryKey: ['kategori-transaksi'], queryFn: daftarKategori, staleTime: 60_000 })
  return q.data?.items ?? KATEGORI_BAWAAN
}
