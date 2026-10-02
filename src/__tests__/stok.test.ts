import { describe, expect, it } from 'vitest'
import { hitungPerubahanStok } from '@/lib/stok'

describe('hitungPerubahanStok', () => {
  it('ubah: the typed number is the change', () => {
    expect(hitungPerubahanStok('ubah', 5, '10')).toBe(10)
    expect(hitungPerubahanStok('ubah', 5, '-3')).toBe(-3)
  })

  it('atur: works out the change from the current stock', () => {
    expect(hitungPerubahanStok('atur', 0, '25')).toBe(25)
    expect(hitungPerubahanStok('atur', 25, '10')).toBe(-15)
    expect(hitungPerubahanStok('atur', 7, '7')).toBe(0)
  })

  it('refuses empty, fractional and negative-result input', () => {
    expect(hitungPerubahanStok('ubah', 5, '')).toBeNull()
    expect(hitungPerubahanStok('ubah', 5, '2.5')).toBeNull()
    expect(hitungPerubahanStok('ubah', 5, 'abc')).toBeNull()
    expect(hitungPerubahanStok('ubah', 5, '-6')).toBeNull()
    expect(hitungPerubahanStok('atur', 5, '-1')).toBeNull()
  })
})
