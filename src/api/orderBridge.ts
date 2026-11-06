import api from './client'
export type BridgeRun = { id: string; kind: string; status: string; started_at: string; finished_at: string | null; imported: number; skipped: number; failed: number; error: string | null }
export type BridgeError = { id: string; platform: string; shop_id: string; order_id: string; status: string; error: string; attempts: number }
export type BridgeDashboard = { configured: boolean; connection: string; scheduler: string; enabled: boolean; heartbeat: string | null; last_sync: string | null; shops: number; counts: Record<string, number>; runs: BridgeRun[]; errors: BridgeError[] }
export type ShopPlan = { fingerprint: string; manual_review: string[]; items: { shop: { platform: string; shop_id: string; name: string; active: boolean }; action: string; toko_id: string | null; candidates: string[] }[] }
export const getBridge = () => api.get<BridgeDashboard>('/order-bridge').then(r => r.data)
export const previewShops = () => api.post<ShopPlan>('/order-bridge/shops', { preview: true }).then(r => r.data)
export const applyShops = (fingerprint: string, links: Record<string, string>) => api.post('/order-bridge/shops', { preview: false, fingerprint, links })
export const checkOrders = (retry = false) => api.post<BridgeRun>('/order-bridge/orders', null, { params: { retry } }).then(r => r.data)
export const setAutomation = (enabled: boolean) => api.put('/order-bridge/automation', { enabled })
export const bridgeLog = (id: string) => api.get(`/order-bridge/logs/${id}`).then(r => r.data)
