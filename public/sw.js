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

// Notifikasi push dari server (pesanan baru, chat baru). Isi dikirim sebagai JSON: title, body, url, tag.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (err) {
    data = { body: event.data ? event.data.text() : '' }
  }
  const judul = data.title || 'Ampel Kuning ERP System'
  event.waitUntil(
    self.registration.showNotification(judul, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: typeof data.url === 'string' ? data.url : '/dashboard' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Hanya alamat di aplikasi ini yang boleh dibuka (bukan alamat lain atau '//host').
  let tujuan = new URL('/dashboard', self.location.origin).href
  try {
    const url = new URL((event.notification.data && event.notification.data.url) || '/dashboard', self.location.origin)
    if (url.origin === self.location.origin) tujuan = url.href
  } catch (err) {
    // alamat tidak valid: buka dashboard
  }
  event.waitUntil(
    (async () => {
      const jendela = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of jendela) {
        if (new URL(w.url).origin !== self.location.origin) continue
        // Satu jendela gagal (mis. tidak terkontrol service worker ini) tidak boleh menghentikan ketukan: coba berikutnya, lalu buka baru.
        try {
          if (await bukaDiJendela(w, tujuan)) return
        } catch (err) {
          // coba jendela lain atau buka jendela baru
        }
      }
      return self.clients.openWindow(tujuan)
    })(),
  )
})

// Jendela yang sudah terbuka: bawa ke depan, lalu minta halaman berpindah sendiri (tanpa memuat ulang) dan tunggu jawabannya.
// Halaman dari versi lama tidak menjawab; untuk itu jendela dipindahkan langsung. Mengembalikan true bila tujuan terbuka.
async function bukaDiJendela(w, tujuan) {
  try {
    await w.focus()
  } catch (err) {
    // fokus bisa ditolak; tetap coba berpindah halaman
  }
  const dijawab = await new Promise((selesai) => {
    const saluran = new MessageChannel()
    const batas = setTimeout(() => selesai(false), 700)
    saluran.port1.onmessage = () => {
      clearTimeout(batas)
      selesai(true)
    }
    try {
      w.postMessage({ type: 'buka', url: tujuan }, [saluran.port2])
    } catch (err) {
      clearTimeout(batas)
      selesai(false)
    }
  })
  if (dijawab) return true
  return !!(await w.navigate(tujuan))
}
