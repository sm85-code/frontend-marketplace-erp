import tokoAktif from '../lib/tokoAktif.ts?raw'
import chatPage from '../pages/ChatPage.tsx?raw'
import { describe, expect, it } from 'vitest'

describe('store filter changes only when the user picks it', () => {
  it('a ?toko= link never writes the saved filter; only change() does', () => {
    const code = tokoAktif
    expect(code.match(/tulisSimpan\(/g)).toHaveLength(1)
    const change = code.slice(code.indexOf('const change'))
    expect(change).toContain('tulisSimpan(key, next)')
  })
  it('chat actions (send, sync, load more) do not persist the filter', () => {
    const code = chatPage
    const calls = code.match(/setShop\(/g) ?? []
    expect(calls).toHaveLength(1)
    expect(code).toMatch(/aria-label="Toko Chat"[\s\S]{0,300}onChange=\{\(e\) => \{\s*setShop\(e\.target\.value\)/)
  })
})
