import api from '@/api/client'
import type {
  AkunMarketplace,
  Gudang,
  IklanCampaign,
  IklanLaporan,
  IklanMetrikHarian,
  LaporanRingkas,
  OAuthCallbackResult,
  OAuthStart,
  Pesanan,
  Produk,
  ProdukListing,
  PublishTokoResult,
  ProsesMassalResult,
  PushStokHargaResult,
  SinkronPesananOtomatis,
  Settlement,
  StaffAkun,
  StokLedger,
  SyncPesananResult,
  SyncProdukResult,
  User,
} from '@/api/types'

// --- Auth --------------------------------------------------------------------

export const login = (email: string, password: string) =>
  api.post<User>('/auth/login', { email, password }).then((r) => r.data)

export const logout = () => api.post('/auth/logout')

export const me = () => api.get<User>('/auth/me').then((r) => r.data)

export const changePassword = (current_password: string, new_password: string) =>
  api.post<User>('/auth/change-password', { current_password, new_password }).then((r) => r.data)

// --- Users ---------------------------------------------------------------------

export const listUsers = () => api.get<User[]>('/users').then((r) => r.data)

export const createUser = (payload: { nama: string; email: string; password: string; role: 'owner' | 'staff' }) =>
  api.post<User>('/users', payload).then((r) => r.data)

// --- Akun Marketplace ------------------------------------------------------

export const listAkun = (platform?: string) =>
  api.get<AkunMarketplace[]>('/akun', { params: { platform } }).then((r) => r.data)

export const getAkun = (id: string) => api.get<AkunMarketplace>(`/akun/${id}`).then((r) => r.data)

export const createAkun = (payload: {
  platform: string
  nama_toko: string
  id_toko_eksternal?: string | null
  catatan?: string | null
}) => api.post<AkunMarketplace>('/akun', payload).then((r) => r.data)

export const updateAkun = (
  id: string,
  payload: Partial<{
    nama_toko: string
    id_toko_eksternal: string | null
    status: string
    catatan: string | null
    access_token: string | null
    refresh_token: string | null
  }>,
) => api.patch<AkunMarketplace>(`/akun/${id}`, payload).then((r) => r.data)

export const deleteAkun = (id: string) => api.delete(`/akun/${id}`)

export const oauthShopeeStart = (akunId: string, redirectUri?: string) =>
  api
    .get<OAuthStart>('/oauth/shopee/start', { params: { akun_id: akunId, redirect_uri: redirectUri } })
    .then((r) => r.data)

/** Shopee redirects with `shop_id` (shop account) or `main_account_id` (main account, possibly many shops). */
export const oauthShopeeCallback = (
  akunId: string,
  params: { code: string; shop_id?: string; main_account_id?: string },
) => api.get<OAuthCallbackResult>(`/oauth/shopee/callback/${akunId}`, { params }).then((r) => r.data)

export const syncPesananAkun = (akunId: string) =>
  api.post<SyncPesananResult>(`/akun/${akunId}/sync/pesanan`).then((r) => r.data)

export const syncProdukAkun = (akunId: string) =>
  api.post<SyncProdukResult>(`/akun/${akunId}/sync/produk`).then((r) => r.data)

/** The backend only sends when dryRun is false; the default preview changes nothing on the marketplace. */
export const pushStokHargaAkun = (akunId: string, dryRun: boolean) =>
  api
    .post<PushStokHargaResult>(`/akun/${akunId}/push/stok-harga`, null, { params: { dry_run: dryRun } })
    .then((r) => r.data)

// --- Produk (SKU induk) -----------------------------------------------------

export const listProduk = () => api.get<Produk[]>('/produk').then((r) => r.data)

export const getProduk = (id: string) => api.get<Produk>(`/produk/${id}`).then((r) => r.data)

export const createProduk = (payload: {
  sku_induk: string
  nama: string
  deskripsi?: string
  harga_dasar: string
  stok?: number
  foto_url?: string | null
  berat_gram?: number
  panjang_cm?: string
  lebar_cm?: string
  tinggi_cm?: string
  preorder?: boolean
  hari_proses?: number
}) => api.post<Produk>('/produk', payload).then((r) => r.data)

export const updateProduk = (
  id: string,
  payload: Partial<{
    nama: string
    deskripsi: string
    harga_dasar: string
    foto_url: string | null
    aktif: boolean
    berat_gram: number
    panjang_cm: string
    lebar_cm: string
    tinggi_cm: string
    preorder: boolean
    hari_proses: number
  }>,
) => api.patch<Produk>(`/produk/${id}`, payload).then((r) => r.data)

export const deleteProduk = (id: string) => api.delete(`/produk/${id}`)

export const publishProdukKeToko = (
  id: string,
  payload: { aktif: boolean; harga?: string; stok?: number; salin_foto: boolean },
) => api.post<PublishTokoResult>(`/produk/${id}/publish-toko`, payload).then((r) => r.data)

// --- Listing -------------------------------------------------------------------

export const listListing = (produkId?: string) =>
  api.get<ProdukListing[]>('/listing', { params: { produk_id: produkId } }).then((r) => r.data)

export const createListing = (payload: {
  produk_id: string
  akun_id: string
  platform: string
  id_eksternal: string
  harga_jual?: string | null
  stok_listing?: number | null
}) => api.post<ProdukListing>('/listing', payload).then((r) => r.data)

export const updateListing = (
  id: string,
  payload: Partial<{ harga_jual: string | null; stok_listing: number | null; aktif: boolean }>,
) => api.patch<ProdukListing>(`/listing/${id}`, payload).then((r) => r.data)

export const deleteListing = (id: string) => api.delete(`/listing/${id}`)

// --- Gudang + Stok ---------------------------------------------------------------

export const listGudang = () => api.get<Gudang[]>('/gudang').then((r) => r.data)

export const createGudang = (payload: { kode: string; nama: string }) =>
  api.post<Gudang>('/gudang', payload).then((r) => r.data)

export const listStokLedger = (produkId?: string, limit = 100) =>
  api.get<StokLedger[]>('/stok/ledger', { params: { produk_id: produkId, limit } }).then((r) => r.data)

export const adjustStok = (payload: { produk_id: string; qty_delta: number; catatan?: string; gudang_id?: string }) =>
  api.post<Produk>('/stok/adjust', payload).then((r) => r.data)

export const transferStok = (payload: {
  produk_id: string
  dari_gudang_id: string
  ke_gudang_id: string
  qty: number
  catatan?: string
}) => api.post<Produk>('/stok/transfer', payload).then((r) => r.data)

// --- Pesanan (OMS) ---------------------------------------------------------------

export const listPesanan = (params: { platform?: string; akun_id?: string; status?: string } = {}) =>
  api.get<Pesanan[]>('/pesanan', { params }).then((r) => r.data)

export const getPesanan = (id: string) => api.get<Pesanan>(`/pesanan/${id}`).then((r) => r.data)

export const createPesanan = (payload: {
  platform: string
  id_eksternal: string
  akun_id?: string | null
  status?: string
  nama_pembeli?: string
  total?: string
  items: { nama_produk: string; harga_satuan: string; qty: number; produk_id?: string; listing_id?: string }[]
}) => api.post<Pesanan>('/pesanan', payload).then((r) => r.data)

export const ubahStatusPesanan = (id: string, status: string) =>
  api.post<Pesanan>(`/pesanan/${id}/status`, { status }).then((r) => r.data)

/** Pull orders for every connected shop; throttled per shop on the server, so calling it often is cheap. */
export const sinkronPesananOtomatis = (paksa = false) =>
  api.post<SinkronPesananOtomatis>('/pesanan/sinkron', null, { params: { paksa } }).then((r) => r.data)

/** At most 25 ids per call; the page sends chunks. */
export const prosesMassalPesanan = (pesananIds: string[]) =>
  api.post<ProsesMassalResult>('/pesanan/proses-massal', { pesanan_ids: pesananIds }).then((r) => r.data)

/** Cancel on Shopee (only before shipment); reserved stock is released. */
export const batalkanPesananMarketplace = (id: string, alasan: string) =>
  api.post<Pesanan>(`/pesanan/${id}/batalkan`, { alasan }).then((r) => r.data)

/** Arrange shipment on the marketplace (courier pickup). Only for orders pulled from Shopee. */
export const prosesPesananMarketplace = (id: string) =>
  api.post<Pesanan>(`/pesanan/${id}/proses`).then((r) => r.data)

export type TemplateResi = 'THERMAL_AIR_WAYBILL' | 'NORMAL_AIR_WAYBILL'

// With responseType blob an error body is a Blob too; turn it back into JSON so getApiError can read it.
const bacaErrorBlob = async (e: unknown): Promise<never> => {
  const err = e as { response?: { data?: unknown } }
  const body = err?.response?.data
  if (body instanceof Blob) {
    try {
      err.response!.data = JSON.parse(await body.text())
    } catch {
      /* keep the original error */
    }
  }
  throw e
}

/** The marketplace's own shipping label as a PDF blob. Thermal is the 100x150 mm (about A6) template. */
export const unduhResi = (id: string, tipe: TemplateResi = 'THERMAL_AIR_WAYBILL') =>
  api
    .get<Blob>(`/pesanan/${id}/resi`, { params: { tipe }, responseType: 'blob' })
    .then((r) => r.data)
    .catch(bacaErrorBlob)

/** Mark the label as printed by hand (or clear the mark); printing already marks it automatically. */
export const tandaiResiDicetak = (id: string, dicetak: boolean) =>
  api.post<Pesanan>(`/pesanan/${id}/resi/tandai`, { dicetak }).then((r) => r.data)

/** One PDF with the labels of several processed orders (same shop and courier, at most 50). */
export const unduhResiMassal = (pesananIds: string[], tipe: TemplateResi = 'THERMAL_AIR_WAYBILL') =>
  api
    .post<Blob>('/pesanan/resi-massal', { pesanan_ids: pesananIds, tipe }, { responseType: 'blob' })
    .then((r) => r.data)
    .catch(bacaErrorBlob)

export const setPengiriman = (id: string, payload: { kurir: string; nomor_resi: string; tanggal_kirim?: string }) =>
  api.post<Pesanan>(`/pesanan/${id}/pengiriman`, payload).then((r) => r.data)

export const deletePesanan = (id: string) => api.delete(`/pesanan/${id}`)

// --- Staff-akun scoping ----------------------------------------------------------

export const listStaffAkun = (userId?: string) =>
  api.get<StaffAkun[]>('/staff-akun', { params: { user_id: userId } }).then((r) => r.data)

export const assignStaffAkun = (payload: { user_id: string; akun_id: string }) =>
  api.post<StaffAkun>('/staff-akun', payload).then((r) => r.data)

export const removeStaffAkun = (id: string) => api.delete(`/staff-akun/${id}`)

// --- Settlement --------------------------------------------------------------------

export const listSettlement = (params: { akun_id?: string; status?: string } = {}) =>
  api.get<Settlement[]>('/settlement', { params }).then((r) => r.data)

export const createSettlement = (payload: {
  akun_id: string
  periode_mulai: string
  periode_selesai: string
  gross_sales?: string
  fee_platform?: string
  fee_payment?: string
  ongkir_subsidi?: string
  penalti?: string
  net?: string
  catatan?: string
}) => api.post<Settlement>('/settlement', payload).then((r) => r.data)

export const getSettlement = (id: string) => api.get<Settlement>(`/settlement/${id}`).then((r) => r.data)

export const updateSettlement = (
  id: string,
  payload: Partial<{
    gross_sales: string
    fee_platform: string
    fee_payment: string
    ongkir_subsidi: string
    penalti: string
    net: string
    status: string
    catatan: string
  }>,
) => api.patch<Settlement>(`/settlement/${id}`, payload).then((r) => r.data)

// --- Laporan ringkas ---------------------------------------------------------------

export const laporanRingkas = (dari: string, sampai: string, batasStokKritis = 5) =>
  api
    .get<LaporanRingkas>('/laporan/ringkas', {
      params: { dari, sampai, batas_stok_kritis: batasStokKritis },
    })
    .then((r) => r.data)

// --- Iklan (ads) -------------------------------------------------------------------

export const listCampaign = (params: { akun_id?: string; platform?: string; status?: string } = {}) =>
  api.get<IklanCampaign[]>('/iklan', { params }).then((r) => r.data)

export const createCampaign = (payload: {
  akun_id: string
  produk_id?: string | null
  nama: string
  budget_harian?: string
  tanggal_mulai: string
  tanggal_selesai?: string | null
  catatan?: string
}) => api.post<IklanCampaign>('/iklan', payload).then((r) => r.data)

export const getCampaign = (id: string) => api.get<IklanCampaign>(`/iklan/${id}`).then((r) => r.data)

export const updateCampaign = (
  id: string,
  payload: Partial<{
    nama: string
    status: string
    budget_harian: string
    tanggal_selesai: string | null
    catatan: string
  }>,
) => api.patch<IklanCampaign>(`/iklan/${id}`, payload).then((r) => r.data)

export const deleteCampaign = (id: string) => api.delete(`/iklan/${id}`)

export const recordMetrikHarian = (
  campaignId: string,
  payload: { tanggal: string; impression?: number; klik?: number; biaya?: string },
) => api.post<IklanMetrikHarian>(`/iklan/${campaignId}/metrik`, payload).then((r) => r.data)

export const listMetrikHarian = (campaignId: string) =>
  api.get<IklanMetrikHarian[]>(`/iklan/${campaignId}/metrik`).then((r) => r.data)

export const laporanIklan = (campaignId: string, dari: string, sampai: string) =>
  api.get<IklanLaporan>(`/iklan/${campaignId}/laporan`, { params: { dari, sampai } }).then((r) => r.data)
