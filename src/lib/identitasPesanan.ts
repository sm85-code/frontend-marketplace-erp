import type { Pesanan } from '@/api/types'
import { PLATFORM_LABELS } from '@/config/roles'

export function nomorPesanan(p: Pick<Pesanan, 'id_eksternal' | 'nomor_pesanan_asli'>): string {
  return p.nomor_pesanan_asli || p.id_eksternal
}

export function platformPesanan(p: Pick<Pesanan, 'platform' | 'platform_sumber'>): string {
  const platform = p.platform_sumber || p.platform
  return platform === 'tiktokshop' ? 'TikTok Shop' : PLATFORM_LABELS[platform] || platform
}

export function halamanPesanan(p: Pick<Pesanan, 'platform_sumber'>): string {
  return p.platform_sumber === 'lazada' || p.platform_sumber === 'tiktokshop' ? '/pesanan-easyboss' : '/pesanan'
}
export function detailPesanan(p: Pick<Pesanan, 'id' | 'platform_sumber'>): string {
  return `${halamanPesanan(p)}/${encodeURIComponent(p.id)}`
}
