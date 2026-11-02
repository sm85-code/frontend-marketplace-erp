import { describe, expect, it } from 'vitest'
import { ddmm, mingguBulan, periodeBerjalan, rentang, weekRange } from './tanggal'

describe('tanggal', () => {
  it('formats dates and ranges as DD/MM', () => {
    expect(ddmm('2026-10-05')).toBe('05/10')
    expect(rentang('2026-09-28', '2026-10-03')).toBe('28/09 - 03/10')
  })

  it('labels the complete Monday-Sunday weeks at November 2026 boundaries', () => {
    expect(weekRange('2026-11', 0)).toBe('26/10 - 01/11')
    expect(weekRange('2026-11', 5)).toBe('30/11 - 06/12')
    expect(periodeBerjalan('2026-11', 6, '2026-11-01')).toBe(0)
    expect(periodeBerjalan('2026-11', 6, '2026-11-30')).toBe(5)
  })

  it('picks the period that contains today (Monday-Sunday weeks from the week of the 1st)', () => {
    // October 2026 starts on Thursday: weeks start 28/09, 05/10, 12/10, 19/10, 26/10.
    expect(periodeBerjalan('2026-10', 5, '2026-10-01')).toBe(0)
    expect(periodeBerjalan('2026-10', 5, '2026-10-04')).toBe(0) // Sunday still belongs to the week that ends on it
    expect(periodeBerjalan('2026-10', 5, '2026-10-05')).toBe(1)
    expect(periodeBerjalan('2026-10', 5, '2026-10-19')).toBe(3)
    expect(periodeBerjalan('2026-10', 5, '2026-10-31')).toBe(4)
  })

  it('falls back to the last period of a past month and the first of a future month', () => {
    expect(periodeBerjalan('2026-09', 5, '2026-10-19')).toBe(4)
    expect(periodeBerjalan('2026-11', 5, '2026-10-19')).toBe(0)
    expect(periodeBerjalan('2026-10', 3, '2026-10-31')).toBe(2) // never beyond the columns shown
  })
})


describe('mingguBulan', () => {
  it('lists the Monday-Sunday periods of a month, clipped to the month, labelled like the report tables', () => {
    const w = mingguBulan('2026-10')
    expect(w.map((x) => [x.mulai, x.akhir])).toEqual([['2026-10-01', '2026-10-04'], ['2026-10-05', '2026-10-11'], ['2026-10-12', '2026-10-18'], ['2026-10-19', '2026-10-25'], ['2026-10-26', '2026-10-31']])
    expect(w[0].label).toBe('28/09 - 04/10')
    expect(w.at(-1)?.label).toBe('26/10 - 01/11')
    expect(mingguBulan('2026-02').at(-1)?.akhir).toBe('2026-02-28')
  })

  it('keeps November boundary dates clipped to the month while labelling full weeks', () => {
    const w = mingguBulan('2026-11')
    expect(w).toHaveLength(6)
    expect(w[0]).toEqual({ mulai: '2026-11-01', akhir: '2026-11-01', label: '26/10 - 01/11' })
    expect(w[5]).toEqual({ mulai: '2026-11-30', akhir: '2026-11-30', label: '30/11 - 06/12' })
  })
})
