import { pushBerhenti, pushLangganan } from '@/api/push'

/** The browser can do Web Push (service worker, push manager and notifications). */
export const pushDidukung = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iPhone/iPad only allow push for an app added to the home screen. */
export const iosBelumDipasang = () => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const terpasang = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !terpasang
}

export function kunciKeBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** The service worker registration; gives up after a few seconds instead of waiting for a worker that never starts. */
async function pendaftaran() {
  const siap = (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.ready
  return Promise.race([siap, new Promise<never>((_, tolak) => setTimeout(() => tolak(new Error('Service worker belum siap. Muat ulang halaman lalu coba lagi.')), 8000))])
}

/** The subscription of this device, if any. */
export async function langgananPerangkat() {
  if (!pushDidukung()) return null
  try {
    return await (await pendaftaran()).pushManager.getSubscription()
  } catch {
    return null
  }
}

/** Ask permission, subscribe this device and tell the server what it wants to receive. */
export async function aktifkanPush(kunciPublik: string, pesanan: boolean, chat: boolean) {
  const izin = await Notification.requestPermission()
  if (izin !== 'granted') throw new Error('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.')
  const reg = await pendaftaran()
  const langganan = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciKeBytes(kunciPublik) }))
  return pushLangganan(langganan.toJSON(), pesanan, chat)
}

export async function matikanPush() {
  const langganan = await langgananPerangkat()
  if (!langganan) return
  await pushBerhenti(langganan.endpoint)
  await langganan.unsubscribe()
}
