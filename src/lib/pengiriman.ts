import type { MetodePengiriman, OpsiMetodePengiriman, PengaturanPengiriman } from '@/api/types'
import { getApiError } from '@/api/client'
export const LABEL_METODE: Record<MetodePengiriman, string> = {
  dropoff: 'Drop Off — Serahkan ke Gerai', pickup: 'Pickup — Jemput Kurir',
}
export function awalPengiriman(o: OpsiMetodePengiriman): PengaturanPengiriman {
  const p: PengaturanPengiriman = { metode: o.metode }
  if (o.metode === 'pickup') {
    const eligible = o.alamat.filter((a) => !o.wajib.includes('pickup_time_id') || a.jadwal.length)
    const a = eligible.find((a) => a.rekomendasi) ?? eligible[0]
    if (a) {
      p.address_id = a.address_id
      if (o.wajib.includes('pickup_time_id')) p.pickup_time_id = (a.jadwal.find((t) => t.rekomendasi) ?? a.jadwal[0])?.pickup_time_id
    }
  } else {
    if (o.wajib.includes('branch_id')) p.branch_id = o.cabang[0]?.branch_id
    if (o.wajib.includes('sender_real_name')) p.sender_real_name = o.nama_pengirim
  }
  return p
}
export function galatPengiriman(o: OpsiMetodePengiriman | undefined, p: PengaturanPengiriman | undefined): string | null {
  if (!o || !o.tersedia) return o?.alasan ?? 'Metode ini tidak tersedia.'
  if (!p || p.metode !== o.metode) return 'Lengkapi pengaturan pengiriman.'
  if (p.metode === 'pickup') {
    const a = o.alamat.find((a) => a.address_id === p.address_id)
    if ((o.wajib.includes('address_id') || o.wajib.includes('pickup_time_id') || p.address_id != null) && !a) return 'Pilih alamat pickup.'
    if ((o.wajib.includes('pickup_time_id') || p.pickup_time_id != null)
      && !a?.jadwal.some((t) => t.pickup_time_id === p.pickup_time_id)) return 'Pilih jadwal pickup.'
  } else {
    if (o.wajib.includes('branch_id') && !o.cabang.some((b) => b.branch_id === p.branch_id)) return 'Pilih cabang drop-off.'
    if (o.wajib.includes('sender_real_name') && !p.sender_real_name?.trim()) return 'Isi nama pengirim.'
  }
  return null
}

/** Preserve confirmed successes if a later request times out; never retry ship_order automatically. */
export async function prosesBatchPengiriman(
  ids: string[], pengaturan: Record<string, PengaturanPengiriman>,
  submit: (ids: string[], settings: Record<string, PengaturanPengiriman>) => Promise<import('@/api/types').ProsesMassalResult>,
): Promise<import('@/api/types').ProsesMassalResult> {
  const hasil: import('@/api/types').ProsesMassalResult['hasil'] = []
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    try {
      const res = await submit(batch, Object.fromEntries(batch.map((id) => [id, pengaturan[id]])))
      hasil.push(...res.hasil)
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const pesan = status && status >= 400 && status < 500
        ? getApiError(error) : 'Hasil batch belum pasti. Sinkronkan status sebelum mencoba lagi.'
      hasil.push(...batch.map((id) => ({ id, id_eksternal: null, ok: false,
        pesan })))
      hasil.push(...ids.slice(i + 10).map((id) => ({ id, id_eksternal: null, ok: false,
        pesan: 'Belum diproses karena batch sebelumnya terputus.' })))
      break
    }
  }
  return { berhasil: hasil.filter((h) => h.ok).length, gagal: hasil.filter((h) => !h.ok).length, hasil }
}
