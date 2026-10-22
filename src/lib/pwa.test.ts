import { describe, expect, it } from 'vitest'
import { LAMA_PEMBUKA_MS, tundaanPembuka } from './pwa'

describe('opening screen', () => {
  it('waits out the rest of the minimum time, in the installed app and in a tab alike', () => {
    expect(tundaanPembuka(300)).toBe(LAMA_PEMBUKA_MS - 300)
    expect(tundaanPembuka(0)).toBe(LAMA_PEMBUKA_MS)
  })

  it('does not wait when the load already took that long', () => {
    expect(tundaanPembuka(LAMA_PEMBUKA_MS)).toBe(0)
    expect(tundaanPembuka(LAMA_PEMBUKA_MS + 500)).toBe(0)
  })
})
