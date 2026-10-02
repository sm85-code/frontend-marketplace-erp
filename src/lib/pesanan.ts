import type { Pesanan, StatusPesanan } from '@/api/types'

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
export function labelStatus(p: Pick<Pesanan, 'status' | 'status_marketplace'>): string {
  return p.status === 'to_ship' && sudahDiproses(p) ? 'Menunggu Kurir' : STATUS_LABELS[p.status]
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
  return ikutMarketplace(p) && p.status === 'to_ship' && !sudahDiproses(p)
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
