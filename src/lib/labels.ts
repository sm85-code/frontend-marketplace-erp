import type { Platform, StatusPesanan } from '@/api/types'

export const PLATFORM_LABEL: Record<Platform, string> = {
  shopee: 'Shopee',
  tiktokshop: 'TikTok Shop',
  lazada: 'Lazada',
  blibli: 'Blibli',
}

export function platformLabel(p: string | null | undefined): string {
  if (!p) return '-'
  return PLATFORM_LABEL[p as Platform] ?? p
}

/** AkunMarketplace.status values used by the BE (free-form string column). */
export const AKUN_STATUS_OPTIONS = [
  { value: 'belum_terhubung', label: 'Belum terhubung' },
  { value: 'terhubung', label: 'Terhubung' },
  { value: 'nonaktif', label: 'Nonaktif' },
] as const

export function akunStatusLabel(s: string | null | undefined): string {
  return AKUN_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? (s || '-')
}

export type Tone = 'default' | 'success' | 'warning' | 'info' | 'danger' | 'muted'

export function akunStatusTone(s: string | null | undefined): Tone {
  if (s === 'terhubung') return 'success'
  if (s === 'nonaktif') return 'muted'
  return 'warning'
}

export const STATUS_PESANAN_LABEL: Record<StatusPesanan, string> = {
  unpaid: 'Belum Bayar',
  to_ship: 'Perlu Dikirim',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export function statusPesananLabel(s: string | null | undefined): string {
  if (!s) return '-'
  return STATUS_PESANAN_LABEL[s as StatusPesanan] ?? s
}

export function statusPesananTone(s: string | null | undefined): Tone {
  switch (s) {
    case 'unpaid':
      return 'warning'
    case 'to_ship':
      return 'info'
    case 'shipped':
      return 'default'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    default:
      return 'muted'
  }
}

export const REASON_LABEL: Record<string, string> = {
  adjust: 'Penyesuaian',
  reserve: 'Reservasi',
  release: 'Lepas reservasi',
  ship: 'Dikirim',
  return: 'Retur',
  sync_in: 'Sinkron masuk',
}

export function reasonLabel(r: string | null | undefined): string {
  if (!r) return '-'
  return REASON_LABEL[r] ?? r
}
