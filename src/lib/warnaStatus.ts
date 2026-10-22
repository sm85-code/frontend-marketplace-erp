/** One colour rule for status badges across the app: good = success, needs attention = warning, broken = destructive. */
export type VarianStatus = 'success' | 'warning' | 'destructive' | 'secondary'
const BAIK = new Set(['aktif', 'terhubung', 'matched', 'paid', 'selesai', 'berhasil', 'succeeded', 'completed', 'lunas'])
const PERHATIAN = new Set(['pending', 'menunggu', 'diproses', 'running', 'unknown', 'perlu_diproses', 'draft'])
const BURUK = new Set(['token_kadaluarsa', 'nonaktif', 'discrepancy', 'gagal', 'failed', 'blocked', 'dibatalkan', 'cancelled'])
export function varianStatus(status: string | null | undefined): VarianStatus {
  const s = (status ?? '').toLowerCase()
  if (BAIK.has(s)) return 'success'
  if (BURUK.has(s)) return 'destructive'
  if (PERHATIAN.has(s)) return 'warning'
  return 'secondary'
}
