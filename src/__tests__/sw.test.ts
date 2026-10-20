import { describe, expect, it, vi } from 'vitest'
import sw from '../../public/sw.js?raw'

type Handler = (event: Record<string, unknown>) => void

/** Runs public/sw.js against a fake service worker scope and returns its listeners and the fakes it calls. */
function jalankan(jendela: { url: string; navigate: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> }[] = []) {
  const listeners: Record<string, Handler> = {}
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  const scope = {
    location: { origin: 'https://erp.example.com' },
    addEventListener: (type: string, fn: Handler) => (listeners[type] = fn),
    registration: { showNotification },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(), matchAll: vi.fn().mockResolvedValue(jendela), openWindow },
  }
  new Function('self', 'caches', 'fetch', sw)(scope, {}, vi.fn())
  return { listeners, showNotification, openWindow }
}

const tunggu = async (promise: unknown) => promise

describe('service worker push', () => {
  it('shows the notification the server sent, with the app icon and the address to open', async () => {
    const { listeners, showNotification } = jalankan()
    let selesai: Promise<unknown> = Promise.resolve()
    listeners.push({ data: { json: () => ({ title: '2 pesanan baru perlu diproses', body: 'Toko Satu, Toko Dua', url: '/pesanan', tag: '/pesanan' }) }, waitUntil: (p: Promise<unknown>) => (selesai = p) })
    await tunggu(selesai)
    expect(showNotification).toHaveBeenCalledWith('2 pesanan baru perlu diproses', expect.objectContaining({ body: 'Toko Satu, Toko Dua', tag: '/pesanan', icon: '/icon-192.png', data: { url: '/pesanan' } }))
  })

  it('still shows something when the payload is not JSON', async () => {
    const { listeners, showNotification } = jalankan()
    let selesai: Promise<unknown> = Promise.resolve()
    listeners.push({ data: { json: () => { throw new Error('bukan json') }, text: () => 'halo' }, waitUntil: (p: Promise<unknown>) => (selesai = p) })
    await tunggu(selesai)
    expect(showNotification).toHaveBeenCalledWith('Ampel Kuning ERP System', expect.objectContaining({ body: 'halo' }))
  })

  it('opens the app address when tapped, never an address of another site', async () => {
    const { listeners, openWindow } = jalankan()
    const ketuk = async (url: string) => {
      let selesai: Promise<unknown> = Promise.resolve()
      listeners.notificationclick({ notification: { close: vi.fn(), data: { url } }, waitUntil: (p: Promise<unknown>) => (selesai = p) })
      await selesai
    }
    await ketuk('/chat?toko=t1&percakapan=c1')
    expect(openWindow).toHaveBeenLastCalledWith('https://erp.example.com/chat?toko=t1&percakapan=c1')
    await ketuk('https://evil.example.com/x')
    expect(openWindow).toHaveBeenLastCalledWith('https://erp.example.com/dashboard')
    await ketuk('//evil.example.com/x')
    expect(openWindow).toHaveBeenLastCalledWith('https://erp.example.com/dashboard')
  })

  it('reuses an open window of the app instead of opening another', async () => {
    const jendela = { url: 'https://erp.example.com/dashboard', navigate: vi.fn().mockResolvedValue(undefined), focus: vi.fn().mockResolvedValue(undefined) }
    const { listeners, openWindow } = jalankan([jendela])
    let selesai: Promise<unknown> = Promise.resolve()
    listeners.notificationclick({ notification: { close: vi.fn(), data: { url: '/pesanan/o1' } }, waitUntil: (p: Promise<unknown>) => (selesai = p) })
    await selesai
    expect(jendela.navigate).toHaveBeenCalledWith('https://erp.example.com/pesanan/o1')
    expect(jendela.focus).toHaveBeenCalled()
    expect(openWindow).not.toHaveBeenCalled()
  })

  it('leaves data requests to the network', () => {
    const { listeners } = jalankan()
    const respondWith = vi.fn()
    listeners.fetch({ request: { method: 'GET', url: 'https://erp.example.com/api/v1/pesanan', mode: 'cors' }, respondWith })
    listeners.fetch({ request: { method: 'POST', url: 'https://erp.example.com/assets/x.js', mode: 'cors' }, respondWith })
    expect(respondWith).not.toHaveBeenCalled()
  })
})
