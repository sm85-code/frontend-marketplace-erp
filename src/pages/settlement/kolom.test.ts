import { describe, expect, it } from 'vitest'
import { komponenLainNeto } from './kolom'

describe('reconciliation with Shopee released funds', () => {
  it('includes undisplayed deductions and adds signed shipping once', () => {
    expect(komponenLainNeto({ penjualan: '100000', komisi: '8000', layanan: '3000', ongkir: '-2500', jumlah_cair: '79000.50' })).toBe(-7499.5)
  })
  it('keeps positive shipping credits and fractional amounts', () => {
    expect(komponenLainNeto({ penjualan: '100.10', komisi: '8.10', layanan: '3', ongkir: '2.50', jumlah_cair: '91.50' })).toBe(0)
  })
  it('does not claim reconciliation when a component is unavailable', () => {
    expect(komponenLainNeto({ penjualan: null, komisi: '8', layanan: '3', ongkir: '0', jumlah_cair: '79' })).toBeNull()
  })
})
