import { describe, expect, it } from 'vitest'
import { alasanSelisih, bandingkan } from './selisihPesanan'

describe('selisih Pesanan vs Menunggu Pencairan', () => {
  it('names the reason from the Shopee status', () => {
    expect(alasanSelisih({ tokoDiDaftar: false })).toBe('toko_lain')
    expect(alasanSelisih({ tokoDiDaftar: true })).toBe('tidak_ditemukan')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'COMPLETED' })).toBe('selesai')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'IN_CANCEL' })).toBe('batal')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'TO_RETURN' })).toBe('retur')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'SHIPPED', estimasi: 125000 })).toBe('ada_estimasi')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'SHIPPED', estimasi: null })).toBe('tanpa_estimasi')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'SHIPPED', estimasi: 0 })).toBe('tanpa_estimasi')
  })

  it('finds the orders that are shipped but not pending, and the reverse', () => {
    const menunggu = new Map([['a', new Set(['1', '2', '9'])]])
    const dikirim = [
      { nomor: '1', akunId: 'a' },
      { nomor: '2', akunId: 'a' },
      { nomor: '3', akunId: 'a' },
      { nomor: '4', akunId: 'b' },
    ]
    const status = new Map([['a:3', 'COMPLETED']])
    const r = bandingkan(dikirim, menunggu, status)
    expect(r.selisih.map((s) => [s.nomor, s.alasan])).toEqual([['3', 'selesai'], ['4', 'toko_lain']])
    expect(r.jumlahMenunggu).toBe(3)
    expect(r.menungguTanpaDikirim).toBe(1)
  })
})

describe('shipped orders carry a payout estimate', () => {
  it('puts the estimate on the rows that are missing from the list', () => {
    const menunggu = new Map([['a', new Set(['1'])]])
    const dikirim = [
      { nomor: '1', akunId: 'a' },
      { nomor: '2', akunId: 'a' },
      { nomor: '3', akunId: 'a' },
    ]
    const status = new Map([['a:2', 'SHIPPED'], ['a:3', 'SHIPPED']])
    const r = bandingkan(dikirim, menunggu, status, new Map([['a:2', 150000]]))
    expect(r.selisih.map((s) => [s.nomor, s.alasan, s.estimasi])).toEqual([['2', 'ada_estimasi', 150000], ['3', 'tanpa_estimasi', null]])
    expect(r.estimasiTidakTampil).toEqual({ jumlah: 1, total: 150000 })
  })
})
