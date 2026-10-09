import { describe, expect, it } from 'vitest'
import { tahapDariTautan, tautanPesanan } from './tautanPesanan'

describe('dashboard links to orders', () => {
  it('opens all stages for the selected shop with an explicit empty stage', () => {
    const query = new URL(tautanPesanan('toko-a'), 'https://erp.test').searchParams
    expect(query.get('toko')).toBe('toko-a')
    expect(query.has('tahap')).toBe(true)
    expect(query.get('tahap')).toBe('')
  })
  it('preserves a specific stage and dashboard period', () => {
    const query = new URL(tautanPesanan('toko-b', 'menunggu_kurir', '30'), 'https://erp.test').searchParams
    expect(query.get('tahap')).toBe('menunggu_kurir')
    expect(query.get('tanggal')).toBe('30')
  })
  it('accepts existing all-stage bookmarks without sending an invalid API stage', () => {
    expect(tahapDariTautan('semua') || undefined).toBeUndefined()
    expect(tahapDariTautan('perlu_diproses')).toBe('perlu_diproses')
  })
})
