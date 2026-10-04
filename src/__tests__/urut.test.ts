import { describe, expect, it } from 'vitest'
import { teksKeUrut, ubahUrut, urutkanLokal, urutKeTeks } from '@/lib/urut'

type Baris = { nama: string; total: number | null }
const nilai = (b: Baris, k: string) => (k === 'nama' ? b.nama : b.total)
const DATA: Baris[] = [
  { nama: 'b10', total: 5 },
  { nama: 'a', total: null },
  { nama: 'b2', total: 30 },
]

describe('urut', () => {
  it('converts to and from the text form', () => {
    expect(urutKeTeks({ kunci: 'total', arah: 'desc' })).toBe('total:desc')
    expect(teksKeUrut('total:desc')).toEqual({ kunci: 'total', arah: 'desc' })
    expect(teksKeUrut('nama')).toEqual({ kunci: 'nama', arah: 'asc' })
  })

  it('starts a new column in its natural direction and flips the same one', () => {
    const awal = { kunci: 'nama', arah: 'asc' as const }
    expect(ubahUrut(awal, 'total', 'desc')).toEqual({ kunci: 'total', arah: 'desc' })
    expect(ubahUrut(awal, 'nama')).toEqual({ kunci: 'nama', arah: 'desc' })
  })

  it('sorts text naturally and numbers numerically', () => {
    expect(urutkanLokal(DATA, { kunci: 'nama', arah: 'asc' }, nilai).map((b) => b.nama)).toEqual(['a', 'b2', 'b10'])
    expect(urutkanLokal(DATA, { kunci: 'total', arah: 'asc' }, nilai).map((b) => b.total)).toEqual([5, 30, null])
  })

  it('keeps empty values last in both directions and does not touch the input', () => {
    expect(urutkanLokal(DATA, { kunci: 'total', arah: 'desc' }, nilai).map((b) => b.total)).toEqual([30, 5, null])
    expect(DATA.map((b) => b.nama)).toEqual(['b10', 'a', 'b2'])
    expect(urutkanLokal(DATA, null, nilai)).toBe(DATA)
  })
})
