import { describe, expect, it } from 'vitest'
import { fmtDateTime, fmtMoney, fmtRp } from './client'

describe('marketplace values visible to users', () => {
  it('preserves zero and distinguishes missing or invalid amounts', () => {
    expect(fmtRp(0)).toBe('Rp 0')
    expect(fmtRp(null)).toBe('—')
    expect(fmtRp('not-a-number')).toBe('—')
    expect(fmtMoney('0.25', 'USD')).toBe('USD 0,25')
    expect(fmtRp('1000.25')).toBe('Rp 1.000,25')
  })
  it('renders timestamps in WIB regardless of the browser timezone', () => {
    expect(fmtDateTime('2026-10-08T00:00:00Z')).toContain('07.00')
  })
})
