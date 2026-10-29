import {
  inputLabels,
  type CloseInput,
  type Overview,
  type InputKey,
} from '@/api/financialReports'
import { sumAmounts } from './financialAmounts'

export const balanceInputs = [
  'piutang_pengiriman',
  'saldo_toko',
  'stok',
  'utang_usaha',
] as const
export const transactionInputs = Object.keys(inputLabels).filter(
  (k) => !balanceInputs.includes(k as (typeof balanceInputs)[number]),
) as (keyof typeof inputLabels)[]
export function emptyClose(tanggal: string): CloseInput {
  const values = Object.fromEntries(
    Object.keys(inputLabels).map((k) => [k, k === 'biaya_iklan' ? null : '0']),
  ) as Record<InputKey, string | null>
  return {
    ...values,
    tanggal,
    transaksi: [],
    settlement_ids: [],
    tanggal_settlement: {},
    catatan: '',
    sumber_diperiksa: true,
  }
}
export function closePayload(input: CloseInput): CloseInput {
  // The server derives transaction totals; never reuse normalized totals from a previous snapshot.
  return {
    ...input,
    ...Object.fromEntries(
      transactionInputs.map((k) => [k, k === 'biaya_iklan' ? null : '0']),
    ),
    preview_token: undefined,
    sumber_diperiksa: true,
  }
}
export function difference(live: string, saved: string) {
  return sumAmounts([
    live,
    saved.startsWith('-') ? saved.slice(1) : `-${saved}`,
  ])
}
export function exactRp(value: string) {
  const normalized = sumAmounts([value])
  const [whole, cents] = normalized.split('.')
  return `Rp ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`
}
/** This month's closing baseline: only the ERP's own monthly close, never Drive-imported weeks. */
export function latestMonthlyCutoff(data: Overview) {
  return data.patokan_bulanan ?? undefined
}
export function cutoffFinished(date: string, now = new Date()) {
  return date < new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 10)
}
