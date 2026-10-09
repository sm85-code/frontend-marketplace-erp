import api from './client'
import type { Attribute, Dimensions, PreOrder } from './workflows'
import type { MutasiMarketplace } from './types'
const item = (id: string) => `/katalog-shopee/${encodeURIComponent(id)}`
const shop = (id: string) => `/akun/${encodeURIComponent(id)}`
export interface Diagnosis { success_item_list: { item_id: string; quality_level: number; unfinished_task: { issue_type: number; suggestion: string }[] }[]; failure_item_list: { item_id: string; failed_reason: string }[]; diambil_at: string }
export const diagnosis = (id: string) => api.get<Diagnosis>(`${item(id)}/diagnosis`).then(r => r.data)
export interface Penalties { items: { issue_time: number; reference_id: string; violation_type: number; latest_point_num: number | null; original_point_num: number | null }[]; total: number; ada_lagi: boolean }
export const penalties = (id: string, halaman: number) => api.get<Penalties>(`${shop(id)}/penalti`, { params: { halaman } }).then(r => r.data)
export interface ModelSettings { model_id: string; model_sku: string; weight?: number; dimension?: Dimensions; pre_order?: PreOrder; tier_index: number[]; model_name: string }
export interface ItemSettings { item_name: string; item_sku: string; description: string; category_id: number; attribute_list: Attribute[]; brand: { brand_id: number; original_brand_name: string }; image: { image_id_list: string[]; image_url_list?: string[] }; weight: number; dimension: Dimensions; pre_order: PreOrder; models: ModelSettings[]; tiers: { name: string; option_list: { option: string; image?: { image_id: string } }[] }[] }
export interface ItemEdit { item_name?: string; item_sku?: string; description?: string; category_id?: number; attribute_list?: Attribute[]; brand?: ItemSettings['brand']; image_ids?: string[]; weight?: number; dimension?: Dimensions; pre_order?: PreOrder; apply_to_all_models?: boolean }
export const settings = (id: string) => api.get<ItemSettings>(`${item(id)}/pengaturan`).then(r => r.data)
export const editItem = (id: string, body: ItemEdit) => api.patch<MutasiMarketplace>(`${item(id)}/informasi`, body).then(r => r.data)
export const editModels = (id: string, model: Partial<ModelSettings>[]) => api.patch<MutasiMarketplace>(`${item(id)}/model`, { model }).then(r => r.data)
export const editTiers = (id: string, body: { standardise_tier_variation: { variation_id: number; variation_name: string; variation_option_list: { variation_option_id: number; variation_option_name: string; image_id?: string }[] }[]; model_list: { model_id: string; tier_index: number[] }[] }) => api.patch<MutasiMarketplace>(`${item(id)}/pilihan-varian`, body).then(r => r.data)
export interface Eligibility { is_eligible: boolean; reason: string | null }
export const eligibility = (id: string) => api.get<Eligibility>(`${shop(id)}/gmv-max/kelayakan`).then(r => r.data)
export type GmvAction = 'change_budget' | 'change_duration' | 'change_roas_target' | 'pause' | 'resume' | 'start'
export interface GmvWrite { campaign_id: string; ok: boolean; warnings: string[] }
export const createGmv = (id: string, body: { daily_budget: number; start_date: string; end_date?: string; roas_target?: number; reference_id: string }) => api.post<GmvWrite>(`${shop(id)}/gmv-max`, body).then(r => r.data)
export const editGmv = (id: string, body: { campaign_id: string; edit_action: GmvAction; daily_budget?: number; start_date?: string; end_date?: string; roas_target?: number; reference_id: string }) => api.patch<GmvWrite>(`${shop(id)}/gmv-max`, body).then(r => r.data)
export const gmvItems = (id: string, body: { campaign_id: string; edit_action: 'add' | 'remove'; item_id_list: string[] }) => api.post<GmvWrite>(`${shop(id)}/gmv-max/produk`, body).then(r => r.data)
export interface GmvReport { campaign_id: string; report?: Record<string, number | null>; result_list?: { item_id: string | number; report: Record<string, number | null> }[]; total?: number; has_next_page?: boolean }
export const gmvPerformance = (id: string, campaign_id: string, mulai: string, selesai: string, per_produk = false, offset = 0) => api.get<GmvReport>(`${shop(id)}/gmv-max/performa`, { params: { campaign_id, mulai, selesai, per_produk, offset } }).then(r => r.data)
