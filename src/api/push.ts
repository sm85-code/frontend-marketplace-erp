import api from './client'

export interface PushConfig { aktif: boolean; kunci_publik: string | null }
export interface PushStatus { aktif: boolean; pesanan: boolean; chat: boolean }
export const pushKonfigurasi = () => api.get<PushConfig>('/push/konfigurasi').then((r) => r.data)
export const pushStatus = (endpoint: string) => api.post<PushStatus>('/push/status', { endpoint }).then((r) => r.data)
export const pushLangganan = (langganan: PushSubscriptionJSON, pesanan: boolean, chat: boolean) =>
  api
    .post<PushStatus>('/push/langganan', { endpoint: langganan.endpoint, keys: { p256dh: langganan.keys?.p256dh, auth: langganan.keys?.auth }, pesanan, chat })
    .then((r) => r.data)
export const pushBerhenti = (endpoint: string) => api.post('/push/berhenti', { endpoint }).then((r) => r.data)
export const pushUji = () => api.post<{ terkirim: number; perangkat?: number; status?: number[] }>('/push/uji').then((r) => r.data)
