import { describe, expect, it } from 'vitest'
import { samaAkses, tercentang, ubahCentang } from '@/lib/centangAkses'
import { bisa } from '@/lib/akses'
import type { AksesSaya } from '@/api/types'

const dua = ['baca', 'tulis'] as const
const BT = [...dua]

describe('ubahCentang', () => {
  it('ticking Tulis ticks Baca too; unticking Tulis keeps Baca', () => {
    expect(ubahCentang(BT, undefined, 'tulis', true)).toBe('tulis')
    expect(ubahCentang(BT, 'tulis', 'tulis', false)).toBe('baca')
  })
  it('ticking Baca gives read, and never lowers write', () => {
    expect(ubahCentang(BT, undefined, 'baca', true)).toBe('baca')
    expect(ubahCentang(BT, 'tulis', 'baca', true)).toBe('tulis')
  })
  it('unticking Baca clears the page, write included', () => {
    expect(ubahCentang(BT, 'baca', 'baca', false)).toBeUndefined()
    expect(ubahCentang(BT, 'tulis', 'baca', false)).toBeUndefined()
  })
  it('a page with one level has one box', () => {
    expect(ubahCentang(['baca'], undefined, 'baca', true)).toBe('baca')
    expect(ubahCentang(['baca'], 'baca', 'tulis', true)).toBe('baca') // no such box
    expect(ubahCentang(['tulis'], undefined, 'tulis', true)).toBe('tulis')
    expect(ubahCentang(['tulis'], 'tulis', 'tulis', false)).toBeUndefined()
  })
})

describe('tercentang', () => {
  it('Baca shows for read and write, Tulis only for write', () => {
    expect([undefined, 'baca', 'tulis'].map((n) => tercentang(n as never, 'baca'))).toEqual([false, true, true])
    expect([undefined, 'baca', 'tulis'].map((n) => tercentang(n as never, 'tulis'))).toEqual([false, false, true])
  })
})

describe('samaAkses', () => {
  it('compares page access regardless of order', () => {
    expect(samaAkses({ a: 'baca', b: 'tulis' }, { b: 'tulis', a: 'baca' })).toBe(true)
    expect(samaAkses({ a: 'baca' }, { a: 'tulis' })).toBe(false)
    expect(samaAkses({ a: 'baca' }, {})).toBe(false)
  })
})

describe('bisa', () => {
  const staf: AksesSaya = { role: 'staf_keuangan', nama: 'Staf Keuangan', akses_toko: 'semua', halaman: { arus_kas: 'tulis', laporan_keuangan: 'baca' } }
  it('read is true for read and write, write only for write', () => {
    expect(bisa(staf, 'arus_kas', 'tulis')).toBe(true)
    expect(bisa(staf, 'laporan_keuangan')).toBe(true)
    expect(bisa(staf, 'laporan_keuangan', 'tulis')).toBe(false)
    expect(bisa(staf, 'iklan')).toBe(false)
  })
  it('everybody has "*", nobody without settings has anything, admin has everything', () => {
    expect(bisa(staf, '*')).toBe(true)
    expect(bisa(null, '*')).toBe(false)
    expect(bisa({ ...staf, role: 'admin', halaman: {} }, 'kelola_pengguna', 'tulis')).toBe(true)
  })
})
