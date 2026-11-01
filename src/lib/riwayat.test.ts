import { describe, expect, it, vi } from 'vitest'
import { KUNCI_PENJAGA, langkahTutup, pasangPenjaga } from './riwayat'

const buat = (state: unknown, sudah = false) => {
  const simpan = new Map<string, string>(sudah ? [[KUNCI_PENJAGA, '1']] : [])
  return {
    riwayat: { state, replaceState: vi.fn(), pushState: vi.fn() },
    simpan: { getItem: (k: string) => simpan.get(k) ?? null, setItem: (k: string, v: string) => void simpan.set(k, v) },
  }
}

describe('guard entry for the Back button', () => {
  it('marks the current entry and puts a copy of the page on top, once per tab', () => {
    const { riwayat, simpan } = buat({ usr: null, key: 'abc', idx: 0 })
    expect(pasangPenjaga(riwayat, simpan, '/dashboard')).toBe(true)
    expect(simpan.getItem('ampel-penjaga-alamat')).toBe('/dashboard')
    expect(riwayat.replaceState).toHaveBeenCalledWith({ usr: null, key: 'abc', idx: 0, penjaga: true }, '')
    expect(riwayat.pushState).toHaveBeenCalledWith({ usr: null, key: 'abc', idx: 0 }, '')
    expect(pasangPenjaga(riwayat, simpan)).toBe(false)
    expect(riwayat.pushState).toHaveBeenCalledTimes(1)
  })

  it('does nothing after a reload in the same tab or without usable storage', () => {
    const baru = buat({ key: 'x' }, true)
    expect(pasangPenjaga(baru.riwayat, baru.simpan)).toBe(false)
    const rusak = { getItem: () => { throw new Error('diblokir') }, setItem: vi.fn() }
    const { riwayat } = buat({ key: 'x' })
    expect(pasangPenjaga(riwayat, rusak)).toBe(false)
    expect(riwayat.pushState).not.toHaveBeenCalled()
  })

  it('copes with a page that has no state yet', () => {
    const { riwayat, simpan } = buat(null)
    expect(pasangPenjaga(riwayat, simpan)).toBe(true)
    expect(riwayat.replaceState).toHaveBeenCalledWith({ penjaga: true }, '')
  })
})

describe('closing a sub-page', () => {
  it('goes back one step when the app has a step to go back to', () => {
    // Opened from the page it belongs to (the Katalog form's detail page): going back leaves no extra entry behind, so
    // the phone's Back button cannot land on the sub-page again.
    expect(langkahTutup('langkah-2', '/katalog/x?tab=kelola')).toEqual({ mundur: true })
  })

  it('opens the page it belongs to in place when it was opened straight (link or refresh)', () => {
    expect(langkahTutup('default', '/katalog/x?tab=kelola')).toEqual({ mundur: false, alamat: '/katalog/x?tab=kelola' })
  })
})
