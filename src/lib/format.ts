import type { MoneyInput } from '@/api/types'

export function parseMoney(value: MoneyInput | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isFinite(n) ? n : Number.NaN
}

export function fmtRp(value: MoneyInput | null | undefined): string {
  const v = parseMoney(value)
  if (Number.isNaN(v)) return 'Rp 0'
  const sign = v < 0 ? '-' : ''
  return `${sign}Rp ${Math.round(Math.abs(v)).toLocaleString('id-ID')}`
}

export function fmtNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return value.toLocaleString('id-ID')
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtSignedQty(delta: number): string {
  if (delta > 0) return `+${delta.toLocaleString('id-ID')}`
  return delta.toLocaleString('id-ID')
}

export function shortId(id: string | null | undefined): string {
  if (!id) return '-'
  return id.length > 8 ? id.slice(0, 8) : id
}
