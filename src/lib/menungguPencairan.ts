/**
 * What counts as "Menunggu Pencairan": only orders that have been shipped (picked up by the courier) and whose
 * money Shopee has not released yet. Waiting for the courier, cancelled and returned orders are not.
 */
export type Kelas = 'dikirim' | 'menunggu_kurir' | 'batal_retur' | 'tidak_diketahui'

const BATAL_RETUR = new Set(['CANCELLED', 'IN_CANCEL', 'TO_RETURN'])
const SUDAH_DIKIRIM = new Set(['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'])
const PAKET_DIKIRIM = new Set(['LOGISTICS_PICKUP_DONE', 'LOGISTICS_DELIVERY_DONE'])

export function kelasPesanan(detail: { order_status?: string; pickup_done_time?: number | null; packages?: { logistics_status?: string }[] } | undefined): Kelas {
  if (!detail || !detail.order_status) return 'tidak_diketahui'
  if (BATAL_RETUR.has(detail.order_status)) return 'batal_retur'
  const pickup = typeof detail.pickup_done_time === 'number' && detail.pickup_done_time > 0
  const paket = (detail.packages ?? []).some((p) => PAKET_DIKIRIM.has(p.logistics_status ?? ''))
  if (pickup || paket || SUDAH_DIKIRIM.has(detail.order_status)) return 'dikirim'
  return 'menunggu_kurir'
}

export type Ringkasan = { menunggu_kurir: number; batal_retur: number; sudah_cair: number; tidak_diketahui: number }
export const ringkasanKosong = (): Ringkasan => ({ menunggu_kurir: 0, batal_retur: 0, sudah_cair: 0, tidak_diketahui: 0 })

/** Decides for one order whether it is a row of the table, and why not when it is not. */
export function putusan(input: {
  detail: Parameters<typeof kelasPesanan>[0]
  dalamDaftarShopee: boolean
}): { baris: true; dariDaftar: boolean } | { baris: false; alasan: keyof Ringkasan } {
  const kelas = kelasPesanan(input.detail)
  if (kelas !== 'dikirim') return { baris: false, alasan: kelas }
  if (input.dalamDaftarShopee) return { baris: true, dariDaftar: true }
  // Shipped but not in Shopee's pending list: a completed order has been paid out, a running one still waits.
  if (input.detail?.order_status === 'COMPLETED') return { baris: false, alasan: 'sudah_cair' }
  return { baris: true, dariDaftar: false }
}
