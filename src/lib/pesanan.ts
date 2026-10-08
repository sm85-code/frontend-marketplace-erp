import type { Pesanan, StatusPesanan, TahapPesanan } from '@/api/types'

/** Mirrors backend services._TRANSISI_STATUS (tenants/marketplace_erp). */
export const TRANSISI_STATUS: Record<StatusPesanan, StatusPesanan[]> = {
  unpaid: ['to_ship', 'cancelled'],
  to_ship: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
}

export const STATUS_LABELS: Record<StatusPesanan, string> = {
  unpaid: 'Belum Bayar',
  to_ship: 'Perlu Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const STATUS_ORDER: StatusPesanan[] = ['unpaid', 'to_ship', 'shipped', 'completed', 'cancelled']

export function nextActionLabel(status: StatusPesanan): { to: StatusPesanan; label: string } | null {
  if (status === 'unpaid') return { to: 'to_ship', label: 'Konfirmasi & Proses' }
  if (status === 'to_ship') return { to: 'shipped', label: 'Kirim' }
  if (status === 'shipped') return { to: 'completed', label: 'Selesaikan' }
  return null
}

/** Shopee statuses after "arrange shipment": the order has a tracking number and waits for / is with the courier. */
const SUDAH_DIPROSES = ['PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED']

/** Orders pulled from the marketplace carry its raw status, and their status follows the marketplace. */
export function ikutMarketplace(p: Pick<Pesanan, 'status_marketplace'>): boolean {
  return p.status_marketplace != null
}

export function sudahDiproses(p: Pick<Pesanan, 'status_marketplace'>): boolean {
  return p.status_marketplace != null && SUDAH_DIPROSES.includes(p.status_marketplace)
}

/** Status label; a processed to_ship order is waiting for the courier, not "needs processing". */
export function labelStatus(p: Pick<Pesanan, 'status' | 'status_marketplace' | 'metode_pengiriman'>): string {
  if (p.status_marketplace === 'IN_CANCEL') return 'Permintaan Pembatalan Pembeli'
  if (p.status === 'to_ship' && p.status_marketplace === 'RETRY_SHIP') return 'Perlu Jadwal Ulang Pickup'
  if (p.status !== 'to_ship' || !sudahDiproses(p)) return STATUS_LABELS[p.status]
  return p.metode_pengiriman === 'dropoff' ? 'Drop Off · Menunggu Penyerahan ke Gerai'
    : p.metode_pengiriman === 'pickup' ? 'Pickup · Menunggu Penjemputan Kurir' : 'Menunggu Penyerahan · Metode belum diketahui'
}

/** Raw Shopee statuses from which a seller can still cancel (before the courier has the parcel). */
const BISA_DIBATALKAN = ['UNPAID', 'READY_TO_SHIP', 'PROCESSED', 'RETRY_SHIP']

export const ALASAN_BATAL = [
  { value: 'CUSTOMER_REQUEST', label: 'Permintaan pembeli' },
  { value: 'OUT_OF_STOCK', label: 'Stok habis' },
  { value: 'COD_NOT_SUPPORTED', label: 'COD tidak didukung' },
] as const

/** A pulled order that still needs "arrange shipment" on the marketplace. */
export function bisaDiproses(p: Pick<Pesanan, 'status' | 'status_marketplace'>): boolean {
  return ikutMarketplace(p) && p.status === 'to_ship' && ['READY_TO_SHIP', 'RETRY_SHIP'].includes(p.status_marketplace ?? '')
}

export function adaPembatalanPembeli(p: Pick<Pesanan, 'platform' | 'status' | 'status_marketplace'>): boolean {
  return p.platform === 'shopee' && p.status_marketplace === 'IN_CANCEL' && (p.status === 'unpaid' || p.status === 'to_ship')
}

export function labelProses(p: Pick<Pesanan, 'status_marketplace'>): string {
  return p.status_marketplace === 'RETRY_SHIP' ? 'Jadwalkan Ulang Pickup' : 'Proses Pesanan'
}

export function bisaDibatalkan(p: Pick<Pesanan, 'status' | 'status_marketplace'>): boolean {
  return (
    ikutMarketplace(p) &&
    (p.status === 'unpaid' || p.status === 'to_ship') &&
    BISA_DIBATALKAN.includes(p.status_marketplace ?? '')
  )
}

export function pecahBatch<T>(items: T[], ukuran: number): T[][] {
  const batch: T[][] = []
  for (let i = 0; i < items.length; i += ukuran) batch.push(items.slice(i, i + ukuran))
  return batch
}

/** A pulled order that is arranged on Shopee and still waits for the courier: its label can be printed. */
export function bisaDicetak(p: Pick<Pesanan, 'status' | 'status_marketplace'>): boolean {
  return ikutMarketplace(p) && p.status === 'to_ship' && p.status_marketplace === 'PROCESSED'
}

/** The joined label file the server sends as base64, as a PDF blob ready for a tab. */
export function pdfDariBase64(base64: string, mime = 'application/pdf'): Blob {
  const biner = atob(base64)
  const byte = new Uint8Array(biner.length)
  for (let i = 0; i < biner.length; i++) byte[i] = biner.charCodeAt(i)
  return new Blob([byte], { type: mime })
}

/** PDF opens in the reserved tab; HTML/ZIP download without executing label HTML in the app. */
export function bukaDokumenResi(blob: Blob, nama: string, tab: Window | null): void {
  const url = URL.createObjectURL(blob)
  if (blob.type.split(';')[0] === 'application/pdf') {
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
  } else {
    tab?.close()
    const link = document.createElement('a')
    link.href = url
    link.download = nama
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function sudahDicetak(p: Pick<Pesanan, 'resi_dicetak_at'>): boolean {
  return Boolean(p.resi_dicetak_at)
}

export type FilterResi = 'semua' | 'belum' | 'sudah'

/** Label filter for the order list: only orders whose label can be printed take part ('belum' / 'sudah'). */
export function cocokFilterResi(p: Pick<Pesanan, 'status' | 'status_marketplace' | 'resi_dicetak_at'>, f: FilterResi): boolean {
  if (f === 'semua') return true
  return bisaDicetak(p) && sudahDicetak(p) === (f === 'sudah')
}

export const TAHAP_LABELS: Record<TahapPesanan, string> = {
  belum_bayar: 'Belum Bayar',
  perlu_diproses: 'Perlu Diproses',
  menunggu_kurir: 'Menunggu Penyerahan',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

export const TAHAP_ORDER: TahapPesanan[] = ['belum_bayar', 'perlu_diproses', 'menunggu_kurir', 'dikirim', 'selesai', 'dibatalkan']

export const URUTAN_PESANAN = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'terlama', label: 'Terlama' },
  { value: 'total_besar', label: 'Total terbesar' },
  { value: 'total_kecil', label: 'Total terkecil' },
] as const

/** "Kursi Rotan ×2, Meja ×1 (+2 lainnya)" for the order list. */
export function ringkasItem(p: Pick<Pesanan, 'items'>, maks = 2): string {
  if (!p.items.length) return '—'
  const bagian = p.items.slice(0, maks).map((i) => `${i.nama_produk} ×${i.qty}`)
  const sisa = p.items.length - maks
  return sisa > 0 ? `${bagian.join(', ')} (+${sisa} lainnya)` : bagian.join(', ')
}
