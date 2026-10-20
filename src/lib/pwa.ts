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
