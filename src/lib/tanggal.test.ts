import { describe, expect, it } from 'vitest'
import { ddmm, periodeBerjalan, rentang } from './tanggal'

describe('tanggal', () => {
  it('formats dates and ranges as DD/MM', () => {
    expect(ddmm('2026-10-05')).toBe('05/10')
    expect(rentang('2026-09-28', '2026-10-03')).toBe('28/09 - 03/10')
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
