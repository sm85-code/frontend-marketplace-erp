/**
 * Types mirror sm85-arch `tenants/marketplace_erp/modules/marketplace_erp/application/schemas.py`
 * (post PR #162). Pydantic v2 serialises `Decimal` as a JSON string, so money fields
 * are typed as `Money` (string on read; number|string accepted on write).
 */

export type Money = string
export type MoneyInput = string | number

/** models.PLATFORM_MARKETPLACE */
export const PLATFORMS = ['shopee', 'tiktokshop', 'lazada', 'blibli'] as const
export type Platform = (typeof PLATFORMS)[number]

/** models.STATUS_PESANAN */
export const STATUS_PESANAN = ['unpaid', 'to_ship', 'shipped', 'completed', 'cancelled'] as const
export type StatusPesanan = (typeof STATUS_PESANAN)[number]

/** models.REASON_STOK_LEDGER */
export const REASON_STOK_LEDGER = ['adjust', 'reserve', 'release', 'ship', 'return', 'sync_in'] as const
export type ReasonStokLedger = (typeof REASON_STOK_LEDGER)[number]

// --- Auth ---------------------------------------------------------------

export interface LoginIn {
  email: string
  password: string
}

export interface UserOut {
  id: string
  nama: string
  email: string
  role: string
  /**
   * True for the seeded default-password owner and for accounts an owner created
   * with a temporary password, until POST /auth/change-password succeeds.
   * Optional so older BE builds (no field) keep working.
   */
  must_change_password?: boolean
}

/** POST /auth/change-password — new_password ≥ 8 chars and must differ from current. */
export interface ChangePasswordIn {
  current_password: string
  new_password: string
}

// --- Akun Marketplace -----------------------------------------------------

export interface AkunMarketplaceIn {
  platform: string
  nama_toko: string
  id_toko_eksternal?: string | null
  catatan?: string | null
}

export interface AkunMarketplacePatch {
  nama_toko?: string | null
  id_toko_eksternal?: string | null
  status?: string | null
  catatan?: string | null
  access_token?: string | null
  refresh_token?: string | null
  /** ISO datetime */
  token_kedaluwarsa?: string | null
}

export interface AkunMarketplaceOut {
  id: string
  platform: string
  nama_toko: string
  id_toko_eksternal: string | null
  /** `belum_terhubung` (default) | `terhubung` (after OAuth) | free-form e.g. `nonaktif` */
  status: string
  catatan: string | null
}

// --- Produk (SKU induk) + Listing ------------------------------------------

export interface ProdukIn {
  sku_induk: string
  nama: string
  deskripsi?: string
  harga_dasar: MoneyInput
  stok?: number
  foto_url?: string | null
}

/** NB: BE rejects `stok` on PATCH (use POST /stok/adjust). */
export interface ProdukPatch {
  nama?: string | null
  deskripsi?: string | null
  harga_dasar?: MoneyInput | null
  foto_url?: string | null
  aktif?: boolean | null
}

export interface ProdukOut {
  id: string
  sku_induk: string
  nama: string
  deskripsi: string
  harga_dasar: Money
  /** Available stock cache (after reservations). */
  stok: number
  foto_url: string | null
  aktif: boolean
}

export interface ProdukListingIn {
  produk_id: string
  akun_id: string
  platform: string
  id_eksternal: string
  harga_jual?: MoneyInput | null
  stok_listing?: number | null
}

export interface ProdukListingPatch {
  harga_jual?: MoneyInput | null
  stok_listing?: number | null
  aktif?: boolean | null
}

export interface ProdukListingOut {
  id: string
  produk_id: string
  akun_id: string
  platform: string
  id_eksternal: string
  harga_jual: Money | null
  stok_listing: number | null
  aktif: boolean
}

// --- Stock ------------------------------------------------------------------

export interface StokAdjustIn {
  produk_id: string
  qty_delta: number
  catatan?: string | null
  gudang_id?: string | null
}

export interface StokLedgerOut {
  id: string
  produk_id: string
  gudang_id: string | null
  qty_delta: number
  reason: string
  ref_type: string | null
  ref_id: string | null
  catatan: string | null
  created_at: string
}

export interface GudangOut {
  id: string
  kode: string
  nama: string
  aktif: boolean
}

// --- Orders OMS --------------------------------------------------------------

export interface ItemPesananIn {
  nama_produk: string
  harga_satuan: MoneyInput
  qty: number
  produk_id?: string | null
  listing_id?: string | null
  subtotal?: MoneyInput | null
}

export interface PesananIn {
  platform: string
  id_eksternal: string
  akun_id?: string | null
  status?: string
  nama_pembeli?: string
  total?: MoneyInput | null
  items?: ItemPesananIn[]
}

export interface PesananStatusIn {
  status: StatusPesanan
}

export interface ItemPesananOut {
  id: string
  produk_id: string | null
  listing_id: string | null
  nama_produk: string
  harga_satuan: Money
  qty: number
  subtotal: Money
}

export interface PesananOut {
  id: string
  platform: string
  id_eksternal: string
  akun_id: string | null
  status: string
  nama_pembeli: string
  total: Money
  tersinkron_marketplace: boolean
  catatan_sinkron: string | null
  items: ItemPesananOut[]
  created_at: string
  updated_at: string
}

// --- OAuth / sync -------------------------------------------------------------

export interface OAuthStartOut {
  platform: string
  akun_id: string
  authorize_url: string
}

/** Untyped dict returned by GET /oauth/shopee/callback/{akun_id}. */
export interface OAuthCallbackOut {
  ok: boolean
  akun_id: string
  status: string
  id_toko_eksternal: string | null
  token_kedaluwarsa: string | null
}

export interface SyncOut {
  ok: boolean
  pulled: number
}

export interface OkOut {
  ok: boolean
}
