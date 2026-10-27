import { describe, expect, it } from 'vitest'
import { hitungBagi, rugiBerjalan, bulanAntara } from '@/lib/labaBulan'

describe('profit split carries losses forward', () => {
  it('takes an open loss off this month first', () => {
    expect(hitungBagi(1000, rugiBerjalan([-300]))).toEqual({ dibagi: 700, rugiKeluar: 0 })
  })
  it('a profit already shared does not carry on', () => {
    expect(rugiBerjalan([500, -200])).toBe(200)
    expect(rugiBerjalan([-200, 500])).toBe(0)
  })
  it('a loss bigger than the profit carries to next month', () => {
    expect(hitungBagi(100, 300)).toEqual({ dibagi: 0, rugiKeluar: 200 })
    expect(rugiBerjalan([-100, -50, 120])).toBe(30)
  })
  it('lists months in between', () => {
    expect(bulanAntara('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01'])
    expect(bulanAntara('2026-10', '2026-10')).toEqual([])
  })
})
