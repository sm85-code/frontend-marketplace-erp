import type { AksesSaya, Tingkat } from '@/api/types'

/** The starting checkmarks of the built-in roles (mirror of akses.py in the backend). Admin has everything. */
const OWNER: Record<string, Tingkat> = {
  dashboard: 'baca', pesanan: 'tulis', pesanan_manual: 'tulis', chat: 'tulis', retur: 'tulis', katalog: 'tulis', produk: 'tulis', listing: 'tulis', gudang: 'tulis',
  promosi: 'tulis', publikasi: 'tulis', sinkron_shopee: 'tulis', laporan_ringkas: 'baca', push_shopee: 'tulis', operasional_umum: 'baca', operasional_packing: 'baca',
}
const STAFF: Record<string, Tingkat> = { dashboard: 'baca', pesanan: 'tulis', chat: 'tulis', retur: 'tulis', katalog: 'baca', arus_kas: 'tulis' }

export function aksesBawaan(role: 'admin' | 'owner' | 'staff'): AksesSaya {
  if (role === 'admin') return { role, nama: 'Admin', akses_toko: 'semua', halaman: {} }
  if (role === 'owner') return { role, nama: 'Owner', akses_toko: 'semua', halaman: OWNER }
  return { role, nama: 'Staff', akses_toko: 'ditugaskan', halaman: STAFF }
}
