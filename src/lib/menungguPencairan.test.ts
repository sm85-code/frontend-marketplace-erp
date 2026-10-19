import { describe, expect, it } from 'vitest'
import { kelasPesanan, putusan } from './menungguPencairan'

describe('Menunggu Pencairan = shipped orders', () => {
  it('does not count waiting for the courier, even if Shopee lists it', () => {
    expect(kelasPesanan({ order_status: 'READY_TO_SHIP' })).toBe('menunggu_kurir')
    expect(kelasPesanan({ order_status: 'PROCESSED', packages: [{ logistics_status: 'LOGISTICS_REQUEST_CREATED' }] })).toBe('menunggu_kurir')
    expect(putusan({ detail: { order_status: 'PROCESSED' }, dalamDaftarShopee: true })).toEqual({ baris: false, alasan: 'menunggu_kurir' })
  })

  it('counts an order once the courier has picked it up', () => {
    expect(kelasPesanan({ order_status: 'SHIPPED' })).toBe('dikirim')
    expect(kelasPesanan({ order_status: 'PROCESSED', pickup_done_time: 1790000000 })).toBe('dikirim')
    expect(kelasPesanan({ order_status: 'PROCESSED', packages: [{ logistics_status: 'LOGISTICS_PICKUP_DONE' }] })).toBe('dikirim')
    expect(kelasPesanan({ order_status: 'TO_CONFIRM_RECEIVE' })).toBe('dikirim')
  })

  it('leaves out cancelled, returned and unverifiable orders', () => {
    expect(kelasPesanan({ order_status: 'CANCELLED' })).toBe('batal_retur')
    expect(kelasPesanan({ order_status: 'TO_RETURN' })).toBe('batal_retur')
    expect(kelasPesanan(undefined)).toBe('tidak_diketahui')
  })

  it('adds a shipped order missing from Shopee’s list, unless it is already paid out', () => {
    expect(putusan({ detail: { order_status: 'SHIPPED' }, dalamDaftarShopee: false })).toEqual({ baris: true, dariDaftar: false })
    expect(putusan({ detail: { order_status: 'COMPLETED' }, dalamDaftarShopee: false })).toEqual({ baris: false, alasan: 'sudah_cair' })
    expect(putusan({ detail: { order_status: 'COMPLETED' }, dalamDaftarShopee: true })).toEqual({ baris: true, dariDaftar: true })
  })
})
