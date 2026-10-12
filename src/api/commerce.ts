import api from './client'
import type { MutasiMarketplace } from './types'
const shop = (id: string) => `/akun/${encodeURIComponent(id)}`
const product = (id: string) => `/katalog-shopee/${encodeURIComponent(id)}`
const order = (id: string) => `/pesanan/${encodeURIComponent(id)}`

export interface ShopProfile { shop_name: string; shop_logo?: string; description?: string }
export interface Holiday { holiday_mode_on: boolean; holiday_mode_type?: 0 | 1; holiday_mode_start_time?: number; holiday_mode_end_time?: number; holiday_mode_description?: string }
export interface Channel { logistics_channel_id: number; logistics_channel_name: string; enabled: boolean; cod_enabled: boolean; force_enable?: boolean; auto_call_driver_setting?: { auto_call_driver_eligible?: boolean; auto_call_driver_enabled?: boolean; preparation_time?: number; preparation_time_limit?: { min_preparation_time: number; max_preparation_time: number } } }
export interface ChannelEdit { enabled?: boolean; cod_enabled?: boolean; auto_call_driver_setting?: { auto_call_driver_enabled: boolean; preparation_time?: number } }
export interface PickupAddress { address_id: number; address: string; city?: string; district?: string; state?: string; zipcode?: string; address_type?: string[] }
export const shopProfile = (id: string) => api.get<ShopProfile>(`${shop(id)}/pengaturan-shopee/profil`).then(r => r.data)
export const editShopProfile = (id: string, body: Partial<ShopProfile>) => api.patch<MutasiMarketplace>(`${shop(id)}/pengaturan-shopee/profil`, body).then(r => r.data)
export const holiday = (id: string) => api.get<Holiday>(`${shop(id)}/pengaturan-shopee/libur`).then(r => r.data)
export const setHoliday = (id: string, body: Holiday) => api.put<MutasiMarketplace>(`${shop(id)}/pengaturan-shopee/libur`, body).then(r => r.data)
export const channels = (id: string) => api.get<{ logistics_channel_list: Channel[] }>(`${shop(id)}/pengaturan-shopee/jasa-kirim`).then(r => r.data)
export const editChannel = (id: string, channel: number, body: ChannelEdit) => api.patch<MutasiMarketplace>(`${shop(id)}/pengaturan-shopee/jasa-kirim/${channel}`, body).then(r => r.data)
export const addresses = (id: string) => api.get<{ address_list: PickupAddress[] }>(`${shop(id)}/pengaturan-shopee/alamat`).then(r => r.data)
export type AddressRole = 'DEFAULT_ADDRESS' | 'PICKUP_ADDRESS' | 'RETURN_ADDRESS' | 'INBOUND_PICKUP_ADDRESS'
export const setAddress = (id: string, address_id: number, address_type: AddressRole[]) => api.put<MutasiMarketplace>(`${shop(id)}/pengaturan-shopee/alamat`, { address_id, address_type }).then(r => r.data)

export interface IncomeRow { order_sn?: string; description?: string; status?: string; currency?: string; estimated_escrow_amount?: number | null; released_amount?: number | null; estimated_payout_time?: number; actual_payout_time?: number; creation_date?: number; payment_method?: string }
export interface IncomePage { items: IncomeRow[]; next_cursor: string; ada_lagi: boolean | null; pagination_known?: boolean; warnings?: string[] }
export const income = (id: string, params: { dari: string; sampai: string; income_status: 1 | 2; cursor: string; page_size?: number }) => api.get<IncomePage>(`${shop(id)}/pendapatan-shopee`, { params, timeout: 75000 }).then(r => r.data)
export interface IncomeOverview { pending_amount: number | string | null; released_amount: number | string | null }
export const incomeOverview = (id: string) => api.get<IncomeOverview>(`${shop(id)}/ringkasan-pendapatan-shopee`).then(r => r.data)
export interface Tracking { order_sn: string; logistics_status?: string; tracking_info: { update_time: number; description: string; logistics_status?: string }[] }
export const tracking = (id: string, package_number?: string) => api.get<Tracking>(`${order(id)}/pelacakan`, { params: { package_number: package_number || undefined } }).then(r => r.data)
export const setNote = (id: string, note: string) => api.patch<MutasiMarketplace>(`${order(id)}/catatan-shopee`, { note }).then(r => r.data)
export const orderIncome = (id: string) => api.get<{ order_sn: string; order_income: Record<string, unknown> }>(`${order(id)}/pendapatan-shopee`).then(r => r.data)

export interface ProductPromotion { item_id: string; promotion: { promotion_type: string; promotion_id?: string | number; model_id?: string | number; start_time?: number; end_time?: number; promotion_staging?: string; promotion_price_info?: { promotion_price: number }[] }[] }
export interface ProductViolation { item_id: string; item_status: string; deboost: boolean; item_status_details?: Violation[]; deboost_details?: Violation[] }
export interface Violation { violation_type: string; violation_reason: string; suggestion: string; fix_deadline_time?: number }
export const productPromotions = (id: string) => api.get<ProductPromotion>(`${product(id)}/informasi-shopee/promosi`).then(r => r.data)
export const productViolations = (id: string) => api.get<ProductViolation>(`${product(id)}/informasi-shopee/pelanggaran`).then(r => r.data)
export const deleteProduct = (id: string) => api.delete<MutasiMarketplace>(`${product(id)}/shopee`).then(r => r.data)
export const deleteVariant = (id: string, model: string) => api.delete<MutasiMarketplace>(`${product(id)}/varian/${encodeURIComponent(model)}`).then(r => r.data)
export const addVariant = (id: string, model: { tier_index: number[]; sku: string; price: number; stock: number }) => api.post<MutasiMarketplace>(`${product(id)}/varian`, { models: [model] }).then(r => r.data)
export const initVariants = (id: string, body: { tiers: { name: string; options: { option: string }[] }[]; models: { tier_index: number[]; sku: string; price: number; stock: number }[] }) => api.post<MutasiMarketplace>(`${product(id)}/inisialisasi-varian`, body).then(r => r.data)
export interface HourlyAd { hour: number; impression?: number; clicks?: number; expense?: number | null; broad_gmv?: number | null; broad_order?: number; broad_roas?: number | null; broad_roi?: number | null }
export const hourlyAds = (id: string, tanggal: string, campaign_id?: string) => api.get<{ items: HourlyAd[] }>(`${shop(id)}/iklan/performa-jam`, { params: { tanggal, campaign_id: campaign_id || undefined } }).then(r => r.data)

export interface ShopConnection {id:string;status:string;otorisasi_tersedia:boolean;perlu_otorisasi_ulang:boolean;sinkron_pesanan_at:string|null;sinkron_penuh_at:string|null}
export const shopConnections=()=>api.get<ShopConnection[]>('/koneksi-toko').then(r=>r.data)

export interface ShopeeDiagnostic { diagnostic_id: string; time: string; endpoint: string; account_id: string | null; request_id: string | null; error: string; message: string; failures: { item_id?: string; comment_id?: string; error: string; message: string }[] }
export interface EngagementResult { ok: boolean; success_ids: string[]; failures: { item_id?: string; comment_id?: string; error: string; message: string }[]; request_id: string | null; diagnostic: ShopeeDiagnostic | null; warnings: string[] }
export interface ProductComment { comment_id: string; item_id: string; comment: string; rating_star: number | null; buyer_username: string | null; create_time: number | null; reply: string }
export interface CommentPage { items: ProductComment[]; more: boolean; next_cursor: string; request_id: string | null }
export const productComments = (id: string, cursor = '') => api.get<CommentPage>(`${product(id)}/ulasan`, { params: { cursor, page_size: 20 } }).then(r => r.data)
export const replyComment = (id: string, comment_id: string, comment: string) => api.post<EngagementResult>(`${product(id)}/ulasan/balas`, { comment_list: [{ comment_id, comment }] }).then(r => r.data)
export const boostedProducts = (id: string) => api.get<{ items: { item_id: string; cool_down_second: number }[]; request_id: string | null }>(`${shop(id)}/produk-boost`).then(r => r.data)
export const boostProducts = (id: string, katalog_ids: string[]) => api.post<EngagementResult>(`${shop(id)}/produk-boost`, { katalog_ids }).then(r => r.data)

export interface IncomeOrderDetail {
  order_sn: string
  order_status?: string
  pickup_done_time?: number | null
  items: { name?: string; variant?: string }[]
  packages: { package_number?: string; logistics_status?: string }[]
}
export const incomeOrders = (id: string, numbers: string[]) => api.get<{ items: IncomeOrderDetail[]; warnings: string[] }>(`${shop(id)}/rincian-pesanan-pendapatan`, { params: { order_sn_list: numbers.join(',') } }).then(r => r.data)
export const incomeTracking = (id: string, number: string, package_number?: string) => api.get<Tracking>(`${shop(id)}/pelacakan-pendapatan/${encodeURIComponent(number)}`, { params: { package_number } }).then(r => r.data)
