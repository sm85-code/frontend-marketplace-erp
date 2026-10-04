import { describe, expect, it } from 'vitest'
import { kolomRingkasanToko, kolomSettlementPesanan } from '@/pages/settlement/kolom'

// The sort keys of the list are the API's (services.KUNCI_URUT_SETTLEMENT): a column with another key would 400.
const KUNCI_API = ['dirilis', 'pesanan', 'toko', 'penjualan', 'komisi', 'layanan', 'ongkir', 'cair']

describe('settlement columns', () => {
  it('sort only by keys the API knows, and every API key has a column', () => {
    const kunci = kolomSettlementPesanan().flatMap((k) => (k.urut ? [k.urut.kunci] : []))
    expect(kunci.every((k) => KUNCI_API.includes(k))).toBe(true)
    expect([...kunci].sort()).toEqual([...KUNCI_API].sort())
  })

  it('has one frozen identity column and hides the rarely used columns by default', () => {
    const kolom = kolomSettlementPesanan()
    expect(kolom.filter((k) => k.tetap).map((k) => k.kunci)).toEqual(['pesanan'])
    expect(kolom.filter((k) => k.bawaan === false).map((k) => k.kunci)).toEqual(['voucher', 'transaksi', 'subsidi', 'penyesuaian'])
  })

  it('the per-shop summary sorts in the browser on every column', () => {
    expect(kolomRingkasanToko().every((k) => typeof k.nilai === 'function')).toBe(true)
  })
})
