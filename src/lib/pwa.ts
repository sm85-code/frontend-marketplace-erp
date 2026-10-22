/**
 * Registers the service worker (public/sw.js) in the production build only. It caches the app files, never the data
 * (/api), and `updateViaCache: 'none'` makes the browser look for a new sw.js on every visit, so a deploy is picked up at once.
 */
export function daftarkanServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // Without it the app simply works as before.
    })
  })
}

/**
 * Listens for the service worker asking an open window to go somewhere (a tapped notification: new order, new chat). The
 * page moves there inside the app, without reloading, and answers on the port so the worker knows it was handled.
 * Only addresses of this app are followed. Returns the function that stops listening.
 */
export function pasangPendengarNotifikasi(buka: (alamat: string) => void): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}
  const wadah = navigator.serviceWorker
  const pesan = (event: MessageEvent) => {
    const isi = event.data as { type?: string; url?: unknown } | null
    if (isi?.type !== 'buka' || typeof isi.url !== 'string') return
    let alamat: URL
    try {
      alamat = new URL(isi.url, window.location.origin)
    } catch {
      return
    }
    if (alamat.origin !== window.location.origin) return
    event.ports?.[0]?.postMessage('ok')
    buka(alamat.pathname + alamat.search + alamat.hash)
  }
  wadah.addEventListener('message', pesan)
  wadah.startMessages?.() // messages wait in a queue until this is called (setting onmessage would do it, addEventListener does not)
  return () => wadah.removeEventListener('message', pesan)
}

export const LAMA_PEMBUKA_MS = 1100

/**
 * How long to keep the opening screen (index.html) up before the app takes over. From cached files the app starts within
 * a fraction of a second, so the opening screen would flash by with its animation unseen, in the installed app and in a
 * browser tab alike. Every full page load therefore lasts at least this long (a move between pages inside the app is not a
 * page load). `sekarang` is the time since the page began loading, in ms.
 */
export function tundaanPembuka(sekarang: number): number {
  return Math.max(0, LAMA_PEMBUKA_MS - sekarang)
}
