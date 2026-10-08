export type ChatCard = {
  id: string
  nama: string
  foto: string | null
  order_sn?: string
  status?: string
  total?: string
  harga?: string | null
  items?: { nama: string; varian: string; qty: number; foto: string | null }[]
}
export type ChatContext = {
  kota: string | null
  kota_sumber: string | null
  pesanan: ChatCard[]
  produk: ChatCard[]
  produk_ada_lagi: boolean
  produk_offset: number
}
export type ChatAttachment = { type: 'item' | 'order'; card: ChatCard }
/** Normalize the seconds/ms/ns timestamps returned by Chat before comparing shops. */
export function chatTimestamp(value: number | string | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n > 1e15 ? n / 1e6 : n > 1e12 ? n : n * 1000
}
