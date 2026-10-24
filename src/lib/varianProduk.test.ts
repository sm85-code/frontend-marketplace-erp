import { describe, expect, it } from 'vitest'
import { bersihkanVarian, kombinasiVarian, kunciKombinasi, labelVarian, masalahGrup, masalahVarian, namaDenganVarian, ringkasanVarian, varianDari } from './varianProduk'

describe('variants of a manual product', () => {
  it('turns an older single size into one variant', () => {
    expect(varianDari({ ukuran: '10x20' })).toEqual([{ nama: 'Ukuran', nilai: '10x20' }])
    expect(varianDari({ ukuran: '' })).toEqual([])
    expect(varianDari({ ukuran: 'x', varian: [] })).toEqual([])
  })

  it('labels and summarises like the server does', () => {
    const p = { ukuran: '5 kg · Basah', varian: [{ nama: 'Ukuran', nilai: '5 kg' }, { nama: 'Jenis', nilai: 'Basah' }] }
    expect(labelVarian(p)).toBe('Ukuran: 5 kg · Jenis: Basah')
    expect(ringkasanVarian(p.varian)).toBe('5 kg · Basah')
    expect(labelVarian({ ukuran: 'XL' })).toBe('XL')
  })

  it('names the product for the supplier with its variants', () => {
    expect(namaDenganVarian({ produk: 'Pupuk' })).toBe('Pupuk')
    expect(namaDenganVarian({ produk: 'Pupuk', varian: [{ nama: 'Ukuran', nilai: '5 kg' }, { nama: 'Jenis', nilai: 'Basah' }] })).toBe('Pupuk (Ukuran: 5 kg, Jenis: Basah)')
  })

  it('trims rows and drops empty ones', () => {
    expect(bersihkanVarian([{ nama: ' Jenis ', nilai: ' Basah  ' }, { nama: '', nilai: '  ' }])).toEqual([{ nama: 'Jenis', nilai: 'Basah' }])
  })

  it('reports the problems the server would reject', () => {
    expect(masalahVarian([])).toBeNull()
    expect(masalahVarian([{ nama: 'Jenis', nilai: '' }])).toMatch(/Isi nama dan nilai/)
    expect(masalahVarian([{ nama: 'Jenis', nilai: 'a' }, { nama: 'jenis', nilai: 'b' }])).toBeNull()
    expect(masalahVarian([{ nama: 'Jenis', nilai: 'a' }, { nama: 'jenis', nilai: 'A' }])).toMatch(/dua kali/)
    expect(masalahVarian(Array.from({ length: 9 }, (_, i) => ({ nama: 'n' + i, nilai: 'v' })))).toMatch(/Maksimal/)
  })
})

describe('a variant with several choices', () => {
  it('makes one product per combination of the choices', () => {
    const grup = [{ nama: 'Jenis', nilai: ['Basah', 'Kering'] }, { nama: 'Ukuran', nilai: ['1 kg', '5 kg'] }]
    const hasil = kombinasiVarian(grup).map((k) => labelVarian({ varian: k, ukuran: '' }))
    expect(hasil).toEqual(['Jenis: Basah · Ukuran: 1 kg', 'Jenis: Basah · Ukuran: 5 kg', 'Jenis: Kering · Ukuran: 1 kg', 'Jenis: Kering · Ukuran: 5 kg'])
    expect(new Set(kombinasiVarian(grup).map(kunciKombinasi)).size).toBe(4)
  })

  it('is one product without variants when there are none, and ignores blanks and repeated choices', () => {
    expect(kombinasiVarian([])).toEqual([[]])
    expect(kombinasiVarian([{ nama: ' ', nilai: [] }])).toEqual([[]])
    expect(kombinasiVarian([{ nama: 'Jenis', nilai: ['Basah', ' Basah ', ''] }])).toEqual([[{ nama: 'Jenis', nilai: 'Basah' }]])
  })

  it('flags an unnamed variant, one without choices, a repeated name, and too many products', () => {
    expect(masalahGrup([{ nama: 'Jenis', nilai: ['Basah', 'Kering'] }])).toBeNull()
    expect(masalahGrup([])).toBeNull()
    expect(masalahGrup([{ nama: '', nilai: ['Basah'] }])).toMatch(/nama/i)
    expect(masalahGrup([{ nama: 'Jenis', nilai: [] }])).toMatch(/pilihan/i)
    expect(masalahGrup([{ nama: 'Jenis', nilai: ['A'] }, { nama: 'jenis', nilai: ['B'] }])).toBeNull()
    expect(kombinasiVarian([{ nama: 'Warna', nilai: ['Merah'] }, { nama: 'Ukuran', nilai: ['S'] }, { nama: 'warna', nilai: ['Hitam', 'merah'] }])).toEqual([
      [{ nama: 'Warna', nilai: 'Merah' }, { nama: 'Ukuran', nilai: 'S' }],
      [{ nama: 'Warna', nilai: 'Hitam' }, { nama: 'Ukuran', nilai: 'S' }],
    ])
    const banyak = Array.from({ length: 8 }, (_, i) => `n${i}`)
    expect(masalahGrup([{ nama: 'A', nilai: banyak }, { nama: 'B', nilai: banyak }])).toMatch(/terlalu banyak/i)
  })
})

import { kombinasiBaru } from './varianProduk'
describe('kombinasiBaru', () => {
  it('makes only the new combinations, leaving the product itself out', () => {
    expect(kombinasiBaru([{ nama: 'Ukuran', nilai: '80x40' }], [[]])).toEqual([])
    expect(kombinasiBaru([{ nama: 'Ukuran', nilai: '80x40' }], [['100x50', ' 80x40 ', '']])).toEqual([[{ nama: 'Ukuran', nilai: '100x50' }]])
    expect(kombinasiBaru([{ nama: 'Ukuran', nilai: 'S' }, { nama: 'Warna', nilai: 'Merah' }], [['M'], ['Hitam']])).toHaveLength(3)
  })
})
