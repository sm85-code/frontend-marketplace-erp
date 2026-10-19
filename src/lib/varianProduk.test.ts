import { describe, expect, it } from 'vitest'
import { bersihkanVarian, labelVarian, masalahVarian, namaDenganVarian, ringkasanVarian, varianDari } from './varianProduk'

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
    expect(masalahVarian([{ nama: 'Jenis', nilai: 'a' }, { nama: 'jenis', nilai: 'b' }])).toMatch(/dipakai dua kali/)
    expect(masalahVarian(Array.from({ length: 9 }, (_, i) => ({ nama: 'n' + i, nilai: 'v' })))).toMatch(/Maksimal/)
  })
})
