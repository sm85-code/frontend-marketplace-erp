import api from './client'
export interface AutomationForm { replies_enabled: boolean; high_template: string; low_template: string; boost_enabled: boolean; boost_catalog_ids: string[]; boost_interval_minutes: number }
export interface AutomationSettings extends AutomationForm { nama_toko: string; worker_enabled: boolean; poll_seconds: number; replies_enabled_at: string | null; next_boost_at: string | null; last_scan_at: string | null; last_message: string; attempts: { key: string; kind: string; target: string; status: string; created_at: string; result: unknown }[] }
const path = (id: string) => `/akun/${encodeURIComponent(id)}/otomasi-produk`
export const settings = (id: string) => api.get<AutomationSettings>(path(id)).then(r => r.data)
export const save = (id: string, body: AutomationForm) => api.put(path(id), body).then(r => r.data)
export const reviewed = (id: string, key: string) => api.post(`${path(id)}/sudah-diperiksa`, { key, decision: 'skip' }).then(r => r.data)
