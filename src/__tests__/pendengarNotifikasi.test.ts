import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pasangPendengarNotifikasi } from '@/lib/pwa'

/** A stand-in for navigator.serviceWorker that lets the test deliver messages the way the worker does. */
function pasangWadah() {
  const wadah = new EventTarget() as EventTarget & { startMessages: ReturnType<typeof vi.fn> }
  wadah.startMessages = vi.fn()
  Object.defineProperty(navigator, 'serviceWorker', { value: wadah, configurable: true })
  const kirim = (data: unknown) => {
    const port = { postMessage: vi.fn() }
    wadah.dispatchEvent(Object.assign(new Event('message'), { data, ports: [port] }))
    return port
  }
  return { wadah, kirim }
}

describe('page listener for a tapped notification', () => {
  const asal = 'https://erp.example.com'
  beforeEach(() => vi.stubGlobal('window', { location: { origin: asal } }))
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('goes to the address inside the app and tells the worker it was handled', () => {
    const { kirim, wadah } = pasangWadah()
    const buka = vi.fn()
    pasangPendengarNotifikasi(buka)
    expect(wadah.startMessages).toHaveBeenCalled() // without it the messages stay queued
    const port = kirim({ type: 'buka', url: `${asal}/chat?toko=t1&percakapan=c1#x` })
    expect(buka).toHaveBeenCalledWith('/chat?toko=t1&percakapan=c1#x')
    expect(port.postMessage).toHaveBeenCalledWith('ok')
  })

  it('accepts a relative address too', () => {
    const { kirim } = pasangWadah()
    const buka = vi.fn()
    pasangPendengarNotifikasi(buka)
    kirim({ type: 'buka', url: '/pesanan/o1' })
    expect(buka).toHaveBeenCalledWith('/pesanan/o1')
  })

  it('ignores other messages and addresses of other sites (no answer, so the worker moves on)', () => {
    const { kirim } = pasangWadah()
    const buka = vi.fn()
    pasangPendengarNotifikasi(buka)
    const port = kirim({ type: 'buka', url: 'https://evil.example.com/x' })
    kirim({ type: 'lain', url: '/pesanan' })
    kirim({ type: 'buka', url: 42 })
    kirim(null)
    expect(buka).not.toHaveBeenCalled()
    expect(port.postMessage).not.toHaveBeenCalled()
  })

  it('stops listening when told to', () => {
    const { kirim } = pasangWadah()
    const buka = vi.fn()
    const berhenti = pasangPendengarNotifikasi(buka)
    berhenti()
    kirim({ type: 'buka', url: '/pesanan' })
    expect(buka).not.toHaveBeenCalled()
  })

  it('does nothing in a browser without service workers', () => {
    expect(() => pasangPendengarNotifikasi(vi.fn())()).not.toThrow()
  })
})
