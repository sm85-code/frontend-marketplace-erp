import type { StatusPesanan } from '@/api/types'

/**
 * Mirror of services._TRANSISI_STATUS in sm85-arch (linear OMS pipeline, T2).
 * The BE is the source of truth; this only decides which buttons to show.
 */
export const TRANSISI_STATUS: Record<StatusPesanan, readonly StatusPesanan[]> = {
  unpaid: ['to_ship', 'cancelled'],
  to_ship: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
}

export interface PesananAction {
  target: StatusPesanan
  label: string
  description: string
  destructive?: boolean
}

const ACTION_BY_TARGET: Record<Exclude<StatusPesanan, 'unpaid'>, PesananAction> = {
  to_ship: {
    target: 'to_ship',
    label: 'Konfirmasi & Proses',
    description:
      'Pesanan dikonfirmasi dan diproses: stok SKU direservasi dan backend mencoba mendorong status ke marketplace (soft-fail).',
  },
  shipped: {
    target: 'shipped',
    label: 'Kirim',
    description: 'Tandai pesanan sudah dikirim. Reservasi stok dikonsumsi (stok tidak dikembalikan).',
  },
  completed: {
    target: 'completed',
    label: 'Selesaikan',
    description: 'Tandai pesanan selesai.',
  },
  cancelled: {
    target: 'cancelled',
    label: 'Batalkan',
    description: 'Batalkan pesanan. Jika stok sudah direservasi, reservasi dilepas dan stok dikembalikan.',
    destructive: true,
  },
}

export function isStatusPesanan(value: string): value is StatusPesanan {
  return value in TRANSISI_STATUS
}

export function allowedActions(status: string): PesananAction[] {
  if (!isStatusPesanan(status)) return []
  return TRANSISI_STATUS[status]
    .filter((t): t is Exclude<StatusPesanan, 'unpaid'> => t !== 'unpaid')
    .map((t) => ACTION_BY_TARGET[t])
}

/** BE: only `unpaid` orders can be hard-deleted. */
export function canDeletePesanan(status: string): boolean {
  return status === 'unpaid'
}
