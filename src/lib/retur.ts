/** Dates submitted to the returns API are whole calendar days in WIB. */
export function rentangAwalRetur(now = new Date()): { dari: string; sampai: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (name: string) => parts.find((p) => p.type === name)!.value
  const sampai = `${part('year')}-${part('month')}-${part('day')}`
  const first = new Date(`${sampai}T00:00:00Z`)
  first.setUTCDate(first.getUTCDate() - 14)
  return { dari: first.toISOString().slice(0, 10), sampai }
}
export function validasiRentangRetur(dari: string, sampai: string): string | null {
  const day = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
  if (!day(dari) || !day(sampai)) return 'Isi tanggal awal dan akhir yang valid.'
  const days = (Date.parse(sampai) - Date.parse(dari)) / 86400000
  return days < 0 || days >= 15 ? 'Rentang harus berurutan dan maksimal 15 hari kalender.' : null
}
export function nominalRetur(value: string | null, currency: string | null): string {
  if (value == null) return '—'
  if (!currency) return `${value} (mata uang belum tersedia)`
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number(value))
  } catch {
    return `${currency} ${value}`
  }
}
export function waktuRetur(value: number | null): string {
  if (!value || !Number.isFinite(value)) return '—'
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value * 1000)) + ' WIB'
}
const STATUS: Record<string, string> = { REQUESTED: 'Diajukan', ACCEPTED: 'Disetujui', CANCELLED: 'Dibatalkan', CLOSED: 'Ditutup', PROCESSING: 'Diproses', JUDGING: 'Ditinjau Shopee' }
export const labelRetur = (status: string) => STATUS[status] ?? status
export const solusiRetur = (solusi: number | null) => solusi === 0 ? 'Retur barang dan refund' : solusi === 1 ? 'Refund saja' : solusi == null ? '—' : `Solusi Shopee: ${solusi}`
