import { describe, expect, it } from 'vitest'
import { keTanggal } from '@/lib/rentang'
import { kali, kolomIklanHarian, kolomRingkasanIklan, persen } from '@/pages/iklan/kolom'

// The sort keys of the list are the API's (services.KUNCI_URUT_IKLAN_TOKO): a column with another key would 400.
const KUNCI_API = ['tanggal', 'toko', 'biaya', 'tayang', 'klik', 'pesanan', 'gmv', 'roas']

describe('iklan columns', () => {
  it('sort only by keys the API knows, and every API key has a column', () => {
    const kunci = kolomIklanHarian().flatMap((k) => (k.urut ? [k.urut.kunci] : []))
    expect(kunci.every((k) => KUNCI_API.includes(k))).toBe(true)
    expect([...kunci].sort()).toEqual([...KUNCI_API].sort())
  })

  it('freezes the date and hides the wide-attribution columns by default', () => {
    const kolom = kolomIklanHarian()
    expect(kolom.filter((k) => k.tetap).map((k) => k.kunci)).toEqual(['tanggal'])
    expect(kolom.filter((k) => k.bawaan === false).map((k) => k.kunci)).toEqual(['pesananLuas', 'gmvLuas', 'roasLuas'])
  })

  it('the per-shop summary sorts in the browser on every column', () => {
    expect(kolomRingkasanIklan().every((k) => typeof k.nilai === 'function')).toBe(true)
  })
})

describe('iklan formats', () => {
  it('shows a ratio as a percentage or a multiple, and a missing one as a dash', () => {
    expect(persen('0.0512')).toBe('5,12%')
    expect(persen(null)).toBe('—')
    expect(kali('4.25')).toBe('4,25×')
    expect(kali(null)).toBe('—')
  })

  it('turns an ISO time into the local YYYY-MM-DD the API takes', () => {
    expect(keTanggal(undefined)).toBeUndefined()
    expect(keTanggal(new Date(2026, 8, 5, 0, 0, 0).toISOString())).toBe('2026-09-05')
    expect(keTanggal(new Date(2026, 8, 5, 23, 59, 59).toISOString())).toBe('2026-09-05')
  })
})
