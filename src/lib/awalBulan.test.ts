import { describe, expect, it } from 'vitest'
import { kasUtamaBulan } from '@/lib/awalBulan'

/** The typed opening balance: September's closing figures, the books' starting point. */
const saldoAwal = { tanggal: '2026-09-30', saldo: { kas_utama: '5725000.00' } }
const dasar = { month: '2026-11', neraca: null, arusKas: null, awalBulan: null, saldoAwal }

describe('kas utama of the month (summary strip)', () => {
  it('uses the month\'s own figure: Neraca row first, then the Arus Kas closing', () => {
    expect(kasUtamaBulan({ ...dasar, neraca: 782000, arusKas: 700000 })).toBe(782000)
    expect(kasUtamaBulan({ ...dasar, arusKas: 700000 })).toBe(700000)
  })
  it('uses the position carried in from the month before when the month has no figure yet', () => {
    expect(kasUtamaBulan({ ...dasar, awalBulan: { akhir: 782000, n_kas: 782000 } })).toBe(782000)
    expect(kasUtamaBulan({ ...dasar, awalBulan: { n_kas: 500000 } })).toBe(500000)
  })
  it('never reports the opening balance as a later month\'s position', () => {
    expect(kasUtamaBulan(dasar)).toBeNull()
    expect(kasUtamaBulan({ ...dasar, month: '2026-10', awalBulan: undefined })).toBeNull()
    expect(kasUtamaBulan({ ...dasar, month: '2026-08' })).toBeNull()
  })
  it('answers with the opening balance for the books\' opening month itself (Akhir September)', () => {
    expect(kasUtamaBulan({ ...dasar, month: '2026-09' })).toBe(5725000)
  })
  it('shows nothing when the opening balance is missing or not a number', () => {
    expect(kasUtamaBulan({ ...dasar, month: '2026-09', saldoAwal: { tanggal: '2026-09-30', saldo: {} } })).toBeNull()
    expect(kasUtamaBulan({ ...dasar, month: '2026-09', saldoAwal: { tanggal: '2026-09-30', saldo: { kas_utama: '' } } })).toBeNull()
  })
  it('ignores an empty carry while the previous months are still loading', () => {
    expect(kasUtamaBulan({ ...dasar, awalBulan: undefined })).toBeNull()
    expect(kasUtamaBulan({ ...dasar, awalBulan: {} })).toBeNull()
  })
})
