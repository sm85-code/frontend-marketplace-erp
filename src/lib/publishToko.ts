import type { PublishTokoResult } from '@/api/types'

/** One-line toast text for the outcome of "Publish ke toko". */
export function publishMessage(r: PublishTokoResult): string {
  const aksi = r.dibuat ? 'Ditambahkan ke toko' : 'Diperbarui di toko'
  const foto = r.foto_disalin ? ', foto disalin' : ''
  return `${aksi}${foto}`
}

/** Starting values for the publish dialog: store price/stock default to the ERP ones. */
export function publishDefaults(p: { harga_dasar: string; stok: number }) {
  return { harga: String(p.harga_dasar), stok: String(p.stok), aktif: true, salinFoto: true }
}
