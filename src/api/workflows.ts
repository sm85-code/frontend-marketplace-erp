import api from './client'
import type { MutasiMarketplace } from './types'
export interface Dimensions {
  package_length: number
  package_width: number
  package_height: number
}
export interface PreOrder {
  is_pre_order: boolean
  days_to_ship: number
}
export interface AttributeValue {
  value_id: number
  original_value_name: string
  value_unit?: string
}
export interface Attribute {
  attribute_id: number
  attribute_value_list: AttributeValue[]
}
export interface AttributeNode {
  attribute_id: number
  name: string
  mandatory: boolean
  attribute_info?: { input_type?: number; max_value_count?: number; attribute_unit_list?: string[] }
  attribute_value_list: { value_id: number; name: string; value_unit?: string; child_attribute_list?: AttributeNode[] }[]
}
export interface Tier {
  name: string
  options: { option: string; image_id?: string | null }[]
}
export interface ListingModel {
  tier_index: number[]
  sku: string
  price: string
  stock: number
  weight?: string
  dimension?: Dimensions
  pre_order?: PreOrder
  gtin_code?: string | null
}
export interface Publication {
  operation_id: string
  nama: string
  deskripsi: string
  sku: string
  category_id: number
  price: string
  stock: number
  weight: string
  dimension: Dimensions
  pre_order: PreOrder
  condition: 'NEW' | 'USED'
  image_ids: string[]
  attribute_list: Attribute[]
  logistic_info: { logistic_id: number; enabled: boolean; is_free: boolean; shipping_fee?: string; size_id?: number }[]
  brand_id: number
  brand_name: string
  gtin_code?: string | null
  location_id?: string
  tiers: Tier[]
  models: ListingModel[]
  size_chart?: string
  size_chart_id?: number
  item_dangerous?: 0 | 1
  aktif: boolean
}
export interface PublicationResult {
  ok: boolean
  status: string
  item_id: string | null
  operation_id: string
  warnings: string[]
  request_id?: string
}
export interface Metadata {
  categories: {
    category_id: number
    parent_category_id: number
    display_category_name?: string
    original_category_name: string
    has_children: boolean
  }[]
  channels: {
    logistics_channel_id: number
    logistics_channel_name: string
    enabled: boolean
    fee_type: string
    force_enable?: boolean
    size_list?: { size_id: string | number; name?: string }[]
  }[]
  attributes: AttributeNode[]
  limits: Record<string, any>
}
const shop = (id: string) => `/akun/${encodeURIComponent(id)}`
export const listingMetadata = (id: string, category_id?: number) =>
  api.get<Metadata>(`${shop(id)}/publikasi/metadata`, { params: { category_id } }).then((r) => r.data)
export const listingBrands = (id: string, category_id: number, offset: number) =>
  api
    .get<{
      brand_list: { brand_id: number; original_brand_name: string }[]
      has_next_page: boolean
      next_offset: number
    }>(`${shop(id)}/publikasi/merek`, { params: { category_id, offset } })
    .then((r) => r.data)
export const copyListing = (id: string, item: string) =>
  api.get<Partial<Publication>>(`${shop(id)}/publikasi/sumber/${encodeURIComponent(item)}`).then((r) => r.data)
export const publishListing = (id: string, body: Publication) =>
  api.post<PublicationResult>(`${shop(id)}/publikasi`, body).then((r) => r.data)
export const publicationResult = (id: string, operation: string) =>
  api.get<PublicationResult>(`${shop(id)}/publikasi/hasil/${encodeURIComponent(operation)}`).then((r) => r.data)
async function upload<T>(path: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return api.post<T>(path, body).then((r) => r.data)
}
export const uploadListingPhoto = (id: string, file: File) => upload<{ image_id: string }>(`${shop(id)}/publikasi/foto`, file)
export interface DisputeReason {
  dispute_reason: number
  dispute_requirement: string
  evidence_module_list: { module_index: number; is_required: boolean; requirement: string }[]
}
export interface Dispute {
  email: string
  reason_id: number
  text: string
  evidence: { module_index: number; urls: string[] }[]
}
export const disputeReasons = (id: string, sn: string) =>
  api.get<{ reasons: DisputeReason[] }>(`${shop(id)}/retur/${encodeURIComponent(sn)}/alasan-sengketa`).then((r) => r.data)
export const uploadEvidence = (id: string, sn: string, file: File) =>
  upload<{ url: string }>(`${shop(id)}/retur/${encodeURIComponent(sn)}/bukti`, file)
export const disputeReturn = (id: string, sn: string, body: Dispute) =>
  api.post<MutasiMarketplace>(`${shop(id)}/retur/${encodeURIComponent(sn)}/sengketa`, body).then((r) => r.data)
export interface WalletTransaction {
  status: string
  transaction_type: string
  amount: string
  current_balance: string | null
  transaction_fee: string | null
  create_time: number
  order_sn: string | null
  pesanan_id: string | null
  refund_sn: string | null
  withdrawal_id: string | null
  root_withdrawal_id: string | null
  description: string | null
  reason: string | null
  money_flow: string | null
}
export interface WalletPage {
  items: WalletTransaction[]
  offset: number
  next_offset: number
  ada_lagi: boolean
  nama_toko: string
}
export const walletTransactions = (id: string, params: { dari: string; sampai: string; offset: number }) =>
  api.get<WalletPage>(`${shop(id)}/transaksi-dana`, { params }).then((r) => r.data)
