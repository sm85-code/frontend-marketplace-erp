import { describe, expect, it } from 'vitest'
import { bisaHapusManual } from './HapusPesananManual'

const base = { platform: 'manual', status: 'to_ship', nomor_resi: null, resi_dicetak_at: null, tanggal_kirim: null }
describe('bisaHapusManual', () => {
  it('manual belum dikirim, owner/admin', () => {
    expect(bisaHapusManual(base as never, 'owner')).toBe(true)
    expect(bisaHapusManual(base as never, 'admin')).toBe(true)
    expect(bisaHapusManual(base as never, 'staff')).toBe(false)
  })
  it('never for marketplace orders', () => expect(bisaHapusManual({ ...base, platform: 'shopee', status: 'unpaid' } as never, 'owner')).toBe(false))
  it('blocked once shipped or labelled, unless cancelled', () => {
    expect(bisaHapusManual({ ...base, nomor_resi: 'JX1' } as never, 'owner')).toBe(false)
    expect(bisaHapusManual({ ...base, status: 'shipped' } as never, 'owner')).toBe(false)
    expect(bisaHapusManual({ ...base, status: 'cancelled', nomor_resi: 'JX1' } as never, 'owner')).toBe(true)
  })
})
