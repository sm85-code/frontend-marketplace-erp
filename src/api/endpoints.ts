/**
 * One function per sm85-arch `/api/marketplace-erp` route
 * (tenants/marketplace_erp/adapters/api/v1/marketplace_erp_router.py). Do not add
 * endpoints here that the backend does not expose.
 */
import api from '@/api/client'
import type {
  AkunMarketplaceIn,
  AkunMarketplaceOut,
  AkunMarketplacePatch,
  ChangePasswordIn,
  GudangOut,
  LoginIn,
  OAuthCallbackOut,
  OAuthStartOut,
  OkOut,
  PesananIn,
  PesananOut,
  ProdukIn,
  ProdukListingIn,
  ProdukListingOut,
  ProdukListingPatch,
  ProdukOut,
  ProdukPatch,
  StatusPesanan,
  StokAdjustIn,
  StokLedgerOut,
  SyncOut,
  UserOut,
} from '@/api/types'

/** Drop undefined / empty-string query params so FastAPI sees them as absent. */
export function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    ;(out as Record<string, unknown>)[k] = v
  }
  return out
}

// --- Auth ----------------------------------------------------------------

export const authApi = {
  login: (body: LoginIn) => api.post<UserOut>('/auth/login', body).then((r) => r.data),
  logout: () => api.post<OkOut>('/auth/logout').then((r) => r.data),
  me: () => api.get<UserOut>('/auth/me').then((r) => r.data),
  /** Logged-in user changes own password; BE re-issues the cookie and returns UserOut. */
  changePassword: (body: ChangePasswordIn) =>
    api.post<UserOut>('/auth/change-password', body).then((r) => r.data),
}

// --- Akun Marketplace (Toko) ------------------------------------------------

export const akunApi = {
  list: (params: { platform?: string } = {}) =>
    api.get<AkunMarketplaceOut[]>('/akun', { params: cleanParams(params) }).then((r) => r.data),
  get: (id: string) => api.get<AkunMarketplaceOut>(`/akun/${id}`).then((r) => r.data),
  create: (body: AkunMarketplaceIn) => api.post<AkunMarketplaceOut>('/akun', body).then((r) => r.data),
  update: (id: string, body: AkunMarketplacePatch) =>
    api.patch<AkunMarketplaceOut>(`/akun/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete<OkOut>(`/akun/${id}`).then((r) => r.data),
  syncPesanan: (id: string) => api.post<SyncOut>(`/akun/${id}/sync/pesanan`).then((r) => r.data),
  syncProduk: (id: string) => api.post<SyncOut>(`/akun/${id}/sync/produk`).then((r) => r.data),
}

// --- OAuth Shopee -----------------------------------------------------------

export const oauthApi = {
  shopeeStart: (akunId: string, redirectUri?: string) =>
    api
      .get<OAuthStartOut>('/oauth/shopee/start', {
        params: cleanParams({ akun_id: akunId, redirect_uri: redirectUri }),
      })
      .then((r) => r.data),
  /** Public BE callback: exchanges `code` for tokens and persists them on the akun. */
  shopeeCallback: (akunId: string, params: { code: string; shop_id: string }) =>
    api
      .get<OAuthCallbackOut>(`/oauth/shopee/callback/${encodeURIComponent(akunId)}`, { params })
      .then((r) => r.data),
}

// --- Produk (SKU induk) -------------------------------------------------------

export const produkApi = {
  list: () => api.get<ProdukOut[]>('/produk').then((r) => r.data),
  get: (id: string) => api.get<ProdukOut>(`/produk/${id}`).then((r) => r.data),
  create: (body: ProdukIn) => api.post<ProdukOut>('/produk', body).then((r) => r.data),
  update: (id: string, body: ProdukPatch) => api.patch<ProdukOut>(`/produk/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete<OkOut>(`/produk/${id}`).then((r) => r.data),
}

// --- Listing -------------------------------------------------------------------

export const listingApi = {
  list: (params: { produk_id?: string } = {}) =>
    api.get<ProdukListingOut[]>('/listing', { params: cleanParams(params) }).then((r) => r.data),
  create: (body: ProdukListingIn) => api.post<ProdukListingOut>('/listing', body).then((r) => r.data),
  update: (id: string, body: ProdukListingPatch) =>
    api.patch<ProdukListingOut>(`/listing/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete<OkOut>(`/listing/${id}`).then((r) => r.data),
}

// --- Stok ----------------------------------------------------------------------

export const stokApi = {
  gudang: () => api.get<GudangOut[]>('/gudang').then((r) => r.data),
  ledger: (params: { produk_id?: string; limit?: number } = {}) =>
    api.get<StokLedgerOut[]>('/stok/ledger', { params: cleanParams(params) }).then((r) => r.data),
  adjust: (body: StokAdjustIn) => api.post<ProdukOut>('/stok/adjust', body).then((r) => r.data),
}

// --- Pesanan (OMS) ---------------------------------------------------------------

export interface PesananFilter {
  platform?: string
  akun_id?: string
  status?: string
}

export const pesananApi = {
  list: (params: PesananFilter = {}) =>
    api.get<PesananOut[]>('/pesanan', { params: cleanParams({ ...params }) }).then((r) => r.data),
  get: (id: string) => api.get<PesananOut>(`/pesanan/${id}`).then((r) => r.data),
  create: (body: PesananIn) => api.post<PesananOut>('/pesanan', body).then((r) => r.data),
  ubahStatus: (id: string, status: StatusPesanan) =>
    api.post<PesananOut>(`/pesanan/${id}/status`, { status }).then((r) => r.data),
  /** BE only allows deleting `unpaid` orders. */
  remove: (id: string) => api.delete<OkOut>(`/pesanan/${id}`).then((r) => r.data),
}
