import { describe, expect, it } from 'vitest'
import { formatNominal, parseNominal } from './nominal'

describe('nominal rupiah', () => {
  it('groups digits while preserving decimal input and zero', () => {
    expect(formatNominal('1234567.50')).toBe('1.234.567,50')
    expect(formatNominal('0')).toBe('0')
    expect(formatNominal('')).toBe('')
  })
  it('returns the canonical API value, including negative values', () => {
    expect(parseNominal('-1.234.567,50')).toBe('-1234567.50')
    expect(parseNominal(formatNominal('9000000'))).toBe('9000000')
  })
})
