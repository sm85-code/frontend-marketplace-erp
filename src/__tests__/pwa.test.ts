import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import manifestRaw from '../../public/manifest.json?raw'
import sw from '../../public/sw.js?raw'

const berkas = Object.keys(import.meta.glob('../../public/*.png'))

describe('PWA', () => {
  const manifest = JSON.parse(manifestRaw)

  it('manifest names the app and can be installed (standalone, 192 and 512 icons that exist)', () => {
    expect(manifest.name).toBe('Ampel Kuning ERP System')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    for (const icon of manifest.icons) expect(berkas).toContain(`../../public${icon.src}`)
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
  })

  it('the page links the manifest', () => {
    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.json" />')
  })

  it('the service worker never handles data requests, non-GET requests or other origins', () => {
    expect(sw).toContain("request.method !== 'GET'")
    expect(sw).toContain("url.pathname.startsWith('/api')")
    expect(sw).toContain('url.origin !== self.location.origin')
    expect(sw).toContain("url.pathname.startsWith('/assets/')")
  })
})
