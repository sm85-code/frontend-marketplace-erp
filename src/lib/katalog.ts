import { fmtRp } from '@/api/client'
import type { KirimKatalogHasil } from '@/api/types'

/** "Rp 100.000" or, when variants differ in price, "Rp 100.000 – Rp 120.000". */
export function rentangHarga(min: string | null, max: string | null): string {
  if (min == null) return '—'
  if (max == null || Number(max) === Number(min)) return fmtRp(min)
  return `${fmtRp(min)} – ${fmtRp(max)}`
}

/** The API takes at most 20 products per call. */
export function bagiBatch<T>(items: T[], ukuran = 20): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += ukuran) out.push(items.slice(i, i + ukuran))
  return out
}

/** One-line toast for the outcome of "Kirim ke toko web". */
export function ringkasKirim(hasil: KirimKatalogHasil[]): string {
  const dibuat = hasil.filter((h) => h.hasil === 'dibuat').length
  const diperbarui = hasil.filter((h) => h.hasil === 'diperbarui').length
  const dilewati = hasil.filter((h) => h.hasil === 'dilewati').length
  const bagian = [
    dibuat && `${dibuat} produk baru`,
    diperbarui && `${diperbarui} diperbarui`,
    dilewati && `${dilewati} dilewati (sudah ada di toko web)`,
  ].filter(Boolean)
  return bagian.length ? `Terkirim ke toko web: ${bagian.join(', ')}` : 'Tidak ada produk yang dikirim'
}

export const URUTAN_KATALOG = [
  { value: 'toko', label: 'Toko' },
  { value: 'nama', label: 'Nama (judul sama berdekatan)' },
  { value: 'harga_naik', label: 'Harga termurah' },
  { value: 'harga_turun', label: 'Harga termahal' },
  { value: 'stok', label: 'Stok terbanyak' },
  { value: 'terbaru', label: 'Terakhir ditarik' },
] as const

/** "20×10×5" or "—" when the shop did not fill the package size. */
export function ukuranPaket(p: string, l: string, t: string): string {
  const [pp, ll, tt] = [p, l, t].map((v) => Number(v) || 0)
  return pp || ll || tt ? `${pp}×${ll}×${tt} cm` : '—'
}
