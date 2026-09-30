import type { StatusPesanan } from '@/api/types'

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
