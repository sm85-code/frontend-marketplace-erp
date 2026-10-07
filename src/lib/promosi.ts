/** Shopee promotion schedules use WIB explicitly, independent of browser time zone. */
export function epochPromosi(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Isi tanggal dan jam promosi yang valid.')
  const d = new Date(`${value}:00+07:00`)
  if (!Number.isFinite(d.getTime())) throw new Error('Tanggal promosi tidak valid.')
  const roundtrip = new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16)
  if (roundtrip !== value) throw new Error('Tanggal promosi tidak valid.')
  return Math.floor(d.getTime() / 1000)
}
export function jadwalAwalPromosi(now = new Date()) {
  const format = (delta: number) => new Date(now.getTime() + delta + 7 * 3600000).toISOString().slice(0, 16)
  return { mulai: format(2 * 3600000), selesai: format(26 * 3600000) }
}
export function validasiJadwalPromosi(mulai: number, selesai: number, now = Date.now() / 1000) {
  if (mulai < now + 3600 || selesai - mulai < 3600 || selesai - mulai >= 180 * 86400)
    throw new Error('Mulai minimal 1 jam dari sekarang; durasi minimal 1 jam dan kurang dari 180 hari.')
}
const STATUS: Record<string, string> = { upcoming: 'Terjadwal', ongoing: 'Berjalan', expired: 'Berakhir' }
export const labelPromosi = (status: string) => STATUS[status] ?? status
export const hargaPromosi = (value: string | null) => value == null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(Number(value))
