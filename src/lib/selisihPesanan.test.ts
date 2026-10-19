import { describe, expect, it } from 'vitest'
import { alasanSelisih, bandingkan } from './selisihPesanan'

describe('selisih Pesanan vs Menunggu Pencairan', () => {
  it('names the reason from the Shopee status', () => {
    expect(alasanSelisih({ tokoDiDaftar: false })).toBe('toko_lain')
    expect(alasanSelisih({ tokoDiDaftar: true })).toBe('tidak_ditemukan')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'COMPLETED' })).toBe('selesai')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'IN_CANCEL' })).toBe('batal')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'TO_RETURN' })).toBe('retur')
    expect(alasanSelisih({ tokoDiDaftar: true, statusShopee: 'SHIPPED' })).toBe('belum_ada')
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
