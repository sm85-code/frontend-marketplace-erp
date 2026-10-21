import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'

export type JenisToko = 'internal' | 'reseller'

/** A shop that sells through the business without a marketplace connection: its own shops and its resellers. */
export interface TokoPenjualan {
  id: string
  nama: string
  jenis: JenisToko
  platform: string
  /** Two letters; goes into production order codes. Empty for an own shop that has none yet. */
  kode: string
  keterangan: string
  aktif: boolean
}

export interface TokoPenjualanDaftar {
  items: TokoPenjualan[]
  platform: { id: string; label: string }[]
  jenis: JenisToko[]
}

export interface IsianToko {
  nama: string
  jenis: JenisToko
  platform: string
  kode: string | null
  keterangan: string
}

export const NAMA_JENIS: Record<JenisToko, string> = { internal: 'Internal', reseller: 'Reseller' }
/** The platforms of these shops (the server sends them too; this is what shows while it loads). */
export const PLATFORM_TOKO = [
  { id: 'shopee', label: 'Shopee' },
  { id: 'tiktokshop', label: 'TikTok' },
  { id: 'lazada', label: 'Lazada' },
  { id: 'blibli', label: 'Blibli' },
  { id: 'webapp', label: 'Web App' },
]

const KUNCI = ['toko-penjualan']
export const daftarTokoPenjualan = () => api.get<TokoPenjualanDaftar>('/toko-penjualan').then((r) => r.data)
export const buatTokoPenjualan = (isian: IsianToko) => api.post<TokoPenjualan>('/toko-penjualan', isian).then((r) => r.data)
export const ubahTokoPenjualan = (id: string, isian: IsianToko & { aktif: boolean }) => api.put<TokoPenjualan>(`/toko-penjualan/${id}`, isian).then((r) => r.data)
export const useTokoPenjualan = () => useQuery({ queryKey: KUNCI, queryFn: daftarTokoPenjualan })
export const kunciTokoPenjualan = KUNCI
