import type { TahapPesanan } from '@/api/types'

/** All stages are represented by an empty filter, never the API value "semua". */
export function tahapDariTautan(value: string) {
  return value === 'semua' ? '' : value
}

export function tautanPesanan(toko: string, tahap: TahapPesanan | '' = '', tanggal?: string) {
  const query = new URLSearchParams({ toko, tahap })
  if (tanggal) query.set('tanggal', tanggal)
  return `/pesanan?${query}`
}
