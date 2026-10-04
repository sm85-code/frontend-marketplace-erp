import { describe, expect, it } from 'vitest'
import { bacaKolomTersimpan, kolomBawaan } from '@/lib/kolom'

const SEMUA = [
  { kunci: 'a', judul: 'A' },
  { kunci: 'b', judul: 'B', bawaan: false },
  { kunci: 'c', judul: 'C', bawaan: true },
]

describe('kolom', () => {
  it('defaults to the columns not marked hidden', () => {
    expect(kolomBawaan(SEMUA)).toEqual(['a', 'c'])
  })

  it('restores saved columns in the table order and ignores unknown or broken values', () => {
    expect(bacaKolomTersimpan('["c","b","x"]', SEMUA)).toEqual(['b', 'c'])
    expect(bacaKolomTersimpan(null, SEMUA)).toEqual(['a', 'c'])
    expect(bacaKolomTersimpan('{rusak', SEMUA)).toEqual(['a', 'c'])
    expect(bacaKolomTersimpan('[]', SEMUA)).toEqual(['a', 'c'])
  })
})
