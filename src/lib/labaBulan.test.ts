import { describe, expect, it } from 'vitest'
import { catatanSaldoAwal } from '@/lib/labaBulan'

const awal = { bulan: '2026-09', nilai: -170000 }

describe('opening figure typed by hand (profit split note)', () => {
  it('shows in the month that reads it as last month\'s balance', () => {
    expect(catatanSaldoAwal(awal, '2026-10')).toBe(awal)
  })
  it('does not show in later months, which carry it inside the loss brought in', () => {
    expect(catatanSaldoAwal(awal, '2026-11')).toBeNull()
    expect(catatanSaldoAwal(awal, '2026-12')).toBeNull()
    expect(catatanSaldoAwal(awal, '2027-01')).toBeNull()
  })
  it('never shows in the month it closes or earlier', () => {
    expect(catatanSaldoAwal(awal, '2026-09')).toBeNull()
    expect(catatanSaldoAwal(awal, '2026-08')).toBeNull()
  })
  it('has nothing to show when there is no opening figure', () => {
    expect(catatanSaldoAwal(null, '2026-10')).toBeNull()
  })
})
