// Service worker Ampel Kuning ERP Sistem.
// Hanya berkas aplikasi (JS, CSS, gambar di /assets) yang disimpan, agar buka lebih cepat dan halaman tidak kosong saat
// sinyal putus. Data (/api) tidak pernah disentuh atau disimpan. Halaman selalu diambil dari jaringan lebih dulu, jadi
// versi baru tampil segera setelah deploy.
const ASET = 'ampel-aset-v1'
const SHELL = 'ampel-shell-v1'
const KUNCI_SHELL = '/__shell'
const BATAS_ASET = 150

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const nama of await caches.keys()) {
        if (nama !== ASET && nama !== SHELL) await caches.delete(nama)
      }
      await self.clients.claim()
    })(),
  )
})

const bukanHtml = (res) => !(res.headers.get('content-type') || '').includes('text/html')

async function halaman(request) {
  try {
    const res = await fetch(request)
    if (res.ok && !bukanHtml(res)) {
      const cache = await caches.open(SHELL)
      await cache.put(KUNCI_SHELL, res.clone())
    }
    return res
  } catch (err) {
    const tersimpan = await (await caches.open(SHELL)).match(KUNCI_SHELL)
    if (tersimpan) return tersimpan
    throw err
  }
}

async function aset(request) {
  const cache = await caches.open(ASET)
  const ada = await cache.match(request)
  if (ada) return ada
  const res = await fetch(request)
  // Server yang mengembalikan halaman untuk berkas yang hilang tidak boleh tersimpan sebagai JS/CSS.
  if (res.ok && res.type === 'basic' && bukanHtml(res)) {
    await cache.put(request, res.clone())
    const kunci = await cache.keys()
    for (const k of kunci.slice(0, Math.max(0, kunci.length - BATAS_ASET))) await cache.delete(k)
  }
  return res
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return
  if (request.mode === 'navigate') event.respondWith(halaman(request))
  else if (url.pathname.startsWith('/assets/')) event.respondWith(aset(request))
})
