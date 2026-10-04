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

export type KolomKatalog =
  | 'foto'
  | 'semuaFoto'
  | 'toko'
  | 'nama'
  | 'sku'
  | 'harga'
  | 'stok'
  | 'varian'
  | 'berat'
  | 'ukuran'
  | 'deskripsi'
  | 'status'
  | 'dikirim'
  | 'diambil'
  | 'itemId'

export const KOLOM_KATALOG: { key: KolomKatalog; label: string; bawaan: boolean }[] = [
  { key: 'foto', label: 'Foto utama', bawaan: true },
  { key: 'semuaFoto', label: 'Semua foto (maks. 5)', bawaan: false },
  { key: 'toko', label: 'Toko', bawaan: true },
  { key: 'nama', label: 'Nama produk', bawaan: true },
  { key: 'sku', label: 'SKU', bawaan: true },
  { key: 'harga', label: 'Harga', bawaan: true },
  { key: 'stok', label: 'Stok Shopee', bawaan: true },
  { key: 'varian', label: 'Jumlah varian', bawaan: true },
  { key: 'berat', label: 'Berat', bawaan: true },
  { key: 'ukuran', label: 'Ukuran (P×L×T)', bawaan: false },
  { key: 'deskripsi', label: 'Deskripsi (ringkas)', bawaan: false },
  { key: 'status', label: 'Status tayang', bawaan: true },
  { key: 'dikirim', label: 'Sudah di toko web', bawaan: true },
  { key: 'diambil', label: 'Terakhir ditarik', bawaan: false },
  { key: 'itemId', label: 'ID produk Shopee', bawaan: false },
]

export const KOLOM_BAWAAN: KolomKatalog[] = KOLOM_KATALOG.filter((k) => k.bawaan).map((k) => k.key)

export const URUTAN_KATALOG = [
  { value: 'toko', label: 'Toko' },
  { value: 'nama', label: 'Nama (judul sama berdekatan)' },
  { value: 'harga_naik', label: 'Harga termurah' },
  { value: 'harga_turun', label: 'Harga termahal' },
  { value: 'stok', label: 'Stok terbanyak' },
  { value: 'terbaru', label: 'Terakhir ditarik' },
] as const

/** Saved column choice -> valid keys in display order; anything unknown or unreadable falls back to the defaults. */
export function bacaKolom(raw: string | null): KolomKatalog[] {
  try {
    const arr = JSON.parse(raw ?? 'null')
    if (!Array.isArray(arr)) return KOLOM_BAWAAN
    const sah = new Set(KOLOM_KATALOG.map((k) => k.key))
    const dipilih = new Set(arr.filter((k): k is KolomKatalog => sah.has(k)))
    return dipilih.size ? KOLOM_KATALOG.map((k) => k.key).filter((k) => dipilih.has(k)) : KOLOM_BAWAAN
  } catch {
    return KOLOM_BAWAAN
  }
}

/** "20×10×5" or "—" when the shop did not fill the package size. */
export function ukuranPaket(p: string, l: string, t: string): string {
  const [pp, ll, tt] = [p, l, t].map((v) => Number(v) || 0)
  return pp || ll || tt ? `${pp}×${ll}×${tt} cm` : '—'
}
