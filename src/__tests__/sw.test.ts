import { describe, expect, it, vi } from 'vitest'
import sw from '../../public/sw.js?raw'

type Handler = (event: Record<string, unknown>) => void

/** Runs public/sw.js against a fake service worker scope and returns its listeners and the fakes it calls. */
type Jendela = { url: string; navigate: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn>; postMessage: ReturnType<typeof vi.fn> }
function jalankan(jendela: Jendela[] = []) {
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

  describe('tapping with the app already open', () => {
    const ketuk = async (listeners: Record<string, Handler>, url = '/pesanan/o1') => {
      let selesai: Promise<unknown> = Promise.resolve()
      listeners.notificationclick({ notification: { close: vi.fn(), data: { url } }, waitUntil: (p: Promise<unknown>) => (selesai = p) })
      await selesai // a page that does not answer is waited for (about 0.7 s) before the window is moved directly
    }
    // A window that answers on the port like the app does.
    const menjawab = (url = 'https://erp.example.com/dashboard'): Jendela => ({
      url,
      navigate: vi.fn().mockResolvedValue({}),
      focus: vi.fn().mockResolvedValue(undefined),
      postMessage: vi.fn((_pesan: unknown, port: MessagePort[]) => port[0].postMessage('ok')),
    })
    const bisu = (url = 'https://erp.example.com/dashboard'): Jendela => ({ ...menjawab(url), postMessage: vi.fn() })

    it('brings the window forward and asks the page to go there, without reloading it', async () => {
      const w = menjawab()
      const { listeners, openWindow } = jalankan([w])
      await ketuk(listeners)
      expect(w.focus).toHaveBeenCalled()
      expect(w.postMessage).toHaveBeenCalledWith({ type: 'buka', url: 'https://erp.example.com/pesanan/o1' }, expect.any(Array))
      expect(w.navigate).not.toHaveBeenCalled()
      expect(openWindow).not.toHaveBeenCalled()
    })

    it('moves a page that does not answer (an older version of the app) directly', async () => {
      const w = bisu()
      const { listeners, openWindow } = jalankan([w])
      await ketuk(listeners)
      expect(w.navigate).toHaveBeenCalledWith('https://erp.example.com/pesanan/o1')
      expect(openWindow).not.toHaveBeenCalled()
    })

    it('still goes on when focusing is refused or the message cannot be sent', async () => {
      const w = bisu()
      w.focus.mockRejectedValue(new Error('ditolak'))
      w.postMessage.mockImplementation(() => {
        throw new Error('tidak bisa')
      })
      const { listeners } = jalankan([w])
      await ketuk(listeners)
      expect(w.navigate).toHaveBeenCalledWith('https://erp.example.com/pesanan/o1')
    })

    it('opens a new window when the open one cannot be moved (not controlled by this worker)', async () => {
      const w = bisu()
      w.navigate.mockRejectedValue(new TypeError('Cannot navigate'))
      const { listeners, openWindow } = jalankan([w])
      await ketuk(listeners, '/chat?toko=t1&percakapan=c1')
      expect(openWindow).toHaveBeenCalledWith('https://erp.example.com/chat?toko=t1&percakapan=c1')
    })

    it('tries the next window when the first one fails, and ignores windows of other sites', async () => {
      const lain = menjawab('https://lain.example.com/x')
      const rusak = bisu()
      rusak.navigate.mockRejectedValue(new TypeError('Cannot navigate'))
      const baik = menjawab('https://erp.example.com/chat')
      const { listeners, openWindow } = jalankan([lain, rusak, baik])
      await ketuk(listeners)
      expect(lain.postMessage).not.toHaveBeenCalled()
      expect(baik.postMessage).toHaveBeenCalled()
      expect(openWindow).not.toHaveBeenCalled()
    })
  })

  it('leaves data requests to the network', () => {
    const { listeners } = jalankan()
    const respondWith = vi.fn()
    listeners.fetch({ request: { method: 'GET', url: 'https://erp.example.com/api/v1/pesanan', mode: 'cors' }, respondWith })
    listeners.fetch({ request: { method: 'POST', url: 'https://erp.example.com/assets/x.js', mode: 'cors' }, respondWith })
    expect(respondWith).not.toHaveBeenCalled()
  })
})
