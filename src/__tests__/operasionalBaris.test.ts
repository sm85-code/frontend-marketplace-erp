import { describe, expect, it } from 'vitest'
import { alasanBelumBisa, barisBaruTerisi, jumlahTampil, sama, tanggalBawaan } from '@/lib/operasionalBaris'

describe('tanggalBawaan', () => {
  it('is today inside the shown month, otherwise the first day of it', () => {
    expect(tanggalBawaan('2026-10', '2026-10-21')).toBe('2026-10-21')
    expect(tanggalBawaan('2026-09', '2026-10-21')).toBe('2026-09-01')
    expect(tanggalBawaan('2026-11', '2026-10-21')).toBe('2026-11-01')
  })
})

describe('jumlahTampil', () => {
  it('drops the trailing zeros of a saved amount only', () => {
    expect(jumlahTampil('1500000.00')).toBe('1500000')
    expect(jumlahTampil('1500000.50')).toBe('1500000.5')
    expect(jumlahTampil('0.10')).toBe('0.1')
    expect(jumlahTampil('1000')).toBe('1000')
    expect(jumlahTampil('100.25')).toBe('100.25')
  })
})

describe('alasanBelumBisa', () => {
  const ok = { tanggal: '2026-10-05', uraian: 'Gaji', jumlah: '1000000' }
  it('accepts a dated row with a positive amount of at most two decimals', () => {
    expect(alasanBelumBisa(ok)).toBeNull()
    expect(alasanBelumBisa({ ...ok, jumlah: '0.1' })).toBeNull()
    expect(alasanBelumBisa({ ...ok, jumlah: '12.50', uraian: '' })).toBeNull()
  })
  it('refuses an empty, zero, negative or too precise amount', () => {
    for (const jumlah of ['', '0', '0.00', '-5', '1.234', '1.', 'abc']) expect(alasanBelumBisa({ ...ok, jumlah })).not.toBeNull()
  })
  it('refuses a missing or impossible date and a too long description', () => {
    expect(alasanBelumBisa({ ...ok, tanggal: '' })).not.toBeNull()
    expect(alasanBelumBisa({ ...ok, tanggal: '2026-13-40' })).not.toBeNull()
    expect(alasanBelumBisa({ ...ok, uraian: 'x'.repeat(256) })).not.toBeNull()
  })
})

describe('sama / barisBaruTerisi', () => {
  it('compares rows by value (trimmed text, same number)', () => {
    expect(sama({ tanggal: 'a', uraian: ' x ', jumlah: '100.0' }, { tanggal: 'a', uraian: 'x', jumlah: '100' })).toBe(true)
    expect(sama({ tanggal: 'a', uraian: 'x', jumlah: '100' }, { tanggal: 'b', uraian: 'x', jumlah: '100' })).toBe(false)
  })
  it('a new row counts as started only when an amount or a description is typed', () => {
    expect(barisBaruTerisi({ tanggal: '2026-10-21', uraian: '', jumlah: '' })).toBe(false)
    expect(barisBaruTerisi({ tanggal: '2026-10-21', uraian: 'Kardus', jumlah: '' })).toBe(true)
    expect(barisBaruTerisi({ tanggal: '2026-10-21', uraian: '', jumlah: '500' })).toBe(true)
  })
})
