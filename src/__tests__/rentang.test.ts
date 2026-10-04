import { describe, expect, it } from 'vitest'
import { rentangTanggal } from '@/lib/rentang'

const SEKARANG = new Date(2026, 9, 4, 15, 30) // 4 Oct 2026, local time

describe('rentangTanggal', () => {
  it('has no bounds for all dates', () => {
    expect(rentangTanggal('semua')).toEqual({})
  })

  it('covers whole local days, today included', () => {
    const hariIni = rentangTanggal('hari_ini', undefined, SEKARANG)
    expect(new Date(hariIni.dari!)).toEqual(new Date(2026, 9, 4, 0, 0, 0, 0))
    expect(new Date(hariIni.sampai!)).toEqual(new Date(2026, 9, 4, 23, 59, 59, 999))
    const tujuh = rentangTanggal('7', undefined, SEKARANG)
    expect(new Date(tujuh.dari!)).toEqual(new Date(2026, 8, 28, 0, 0, 0, 0)) // 28 Sep .. 4 Oct = 7 days
  })

  it('starts the month on the 1st', () => {
    expect(new Date(rentangTanggal('bulan_ini', undefined, SEKARANG).dari!)).toEqual(new Date(2026, 9, 1))
  })

  it('takes a custom range from date inputs and tolerates empty sides', () => {
    const r = rentangTanggal('kustom', { dari: '2026-09-01', sampai: '2026-09-30' }, SEKARANG)
    expect(new Date(r.dari!)).toEqual(new Date(2026, 8, 1))
    expect(new Date(r.sampai!)).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999))
    expect(rentangTanggal('kustom', { dari: '', sampai: 'rusak' }, SEKARANG)).toEqual({ dari: undefined, sampai: undefined })
  })
})
