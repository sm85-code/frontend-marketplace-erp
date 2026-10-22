import { afterEach, describe, expect, it, vi } from 'vitest'
import { LAMA_PEMBUKA_MS, tundaanPembuka } from './pwa'

function lingkungan(terpasang: boolean) {
  const simpan = new Map<string, string>()
  vi.stubGlobal('window', { matchMedia: () => ({ matches: terpasang }) })
  vi.stubGlobal('navigator', {})
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => simpan.get(k) ?? null, setItem: (k: string, v: string) => simpan.set(k, v) })
}

afterEach(() => vi.unstubAllGlobals())

describe('opening screen of the installed app', () => {
  it('waits out the rest of the time on the first start of a session', () => {
    lingkungan(true)
    expect(tundaanPembuka(300)).toBe(LAMA_PEMBUKA_MS - 300)
    expect(tundaanPembuka(300)).toBe(0) // later in the same session: no wait
  })

  it('does not wait when the load already took longer', () => {
    lingkungan(true)
    expect(tundaanPembuka(LAMA_PEMBUKA_MS + 500)).toBe(0)
  })

  it('never waits in an ordinary browser tab', () => {
    lingkungan(false)
    expect(tundaanPembuka(100)).toBe(0)
  })
})
