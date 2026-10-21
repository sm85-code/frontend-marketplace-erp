import { describe, expect, it } from 'vitest'
import { bagiLaba } from '@/config/pembagianLaba'

describe('profit split', () => {
  it('gives admin 40% and owner 60%, adding up exactly', () => {
    expect(bagiLaba(1000000).map((p) => [p.id, p.jumlah])).toEqual([['admin', 400000], ['owner', 600000]])
    const rest = bagiLaba(1000001)
    expect(rest.reduce((a, p) => a + p.jumlah, 0)).toBe(1000001)
  })
  it('shares nothing when there is no profit', () => {
    expect(bagiLaba(0).every((p) => p.jumlah === 0)).toBe(true)
    expect(bagiLaba(-500).every((p) => p.jumlah === 0)).toBe(true)
  })
})
