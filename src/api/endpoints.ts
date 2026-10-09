import api from '@/api/client'
import type { OpsiPengiriman, PengaturanPengiriman } from '@/api/types'
import type {
  ResiGabunganHasil,
  SaranAiHasil,
  AksiKampanye,
  IklanBaru,
  KampanyeIklanDaftar,
  PerubahanKataKunci,
  SaranIklan,
  AkunMarketplace,
  Gudang,
  IklanCampaign,
  IklanHarianTokoHalaman,
  IklanRingkasan,
  SyncIklanHasil,
  IklanLaporan,
  Dashboard,
  IklanMetrikHarian,
  KatalogDetail,
  KatalogList,
  KatalogRingkasan,
  KirimKatalogHasil,
  LaporanRingkas,
  OAuthCallbackResult,
  OAuthStart,
  Pesanan,
  PesananHalaman,
  Produk,
  ProdukListing,
  PublishTokoResult,
  ProsesMassalResult,
  PushStokHargaResult,
  RingkasanPesanan,
  SinkronPesananOtomatis,
  Settlement,
  SettlementPesananHalaman,
  SettlementRingkasan,
  SyncSettlementHasil,
  StaffAkun,
  StokLedger,
  SyncPesananResult,
  SyncProdukResult,
  Role,
  User,
} from '@/api/types'

// --- Auth --------------------------------------------------------------------

/** `identitas` is the username or the email. */
export const login = (identitas: string, password: string) =>
  api.post<User>('/auth/login', { username: identitas, password }).then((r) => r.data)

export const logout = () => api.post('/auth/logout')

export const me = () => api.get<User>('/auth/me').then((r) => r.data)

export const changePassword = (current_password: string, new_password: string) =>
  api.post<User>('/auth/change-password', { current_password, new_password }).then((r) => r.data)

// --- Users ---------------------------------------------------------------------

export const listUsers = () => api.get<User[]>('/users').then((r) => r.data)

export const createUser = (payload: {
  nama: string
  username: string
  email?: string | null
  password: string
  role: Role
}) => api.post<User>('/users', payload).then((r) => r.data)

/** Admin only: change an account's username, display name or role. */
export const updateUser = (id: string, payload: { username?: string; nama?: string; role?: Role }) =>
  api.patch<User>(`/users/${id}`, payload).then((r) => r.data)

/** Admin only: delete another account (not yourself, not the last admin). */
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then(() => undefined)

/** Everyone: change their own name and contact email (an empty email removes it). Never the username. */
export const updateProfil = (payload: { nama?: string; email?: string | null }) =>
  api.patch<User>('/auth/profil', payload).then((r) => r.data)

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

/** `bersamaPesanan` also deletes the shop's orders (for clearing test data). */
export const deleteAkun = (id: string, bersamaPesanan = false) =>
  api.delete<{ ok: boolean; pesanan_dihapus: number; listing_dihapus: number }>(`/akun/${id}`, {
    params: bersamaPesanan ? { bersama_pesanan: true } : undefined,
  })

export const oauthShopeeStart = (akunId: string, redirectUri?: string) =>
  api
    .get<OAuthStart>('/oauth/shopee/start', { params: { akun_id: akunId, redirect_uri: redirectUri } })
    .then((r) => r.data)

/** Shopee redirects with `shop_id` (shop account) or `main_account_id` (main account, possibly many shops). */
export const oauthShopeeCallback = (
  akunId: string,
  params: { code: string; nonce: string; shop_id?: string; main_account_id?: string },
) => api.get<OAuthCallbackResult>(`/oauth/shopee/callback/${encodeURIComponent(akunId)}/${encodeURIComponent(params.nonce)}`, { params: { code: params.code, shop_id: params.shop_id, main_account_id: params.main_account_id } }).then((r) => r.data)

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
  keluarga_id?: string | null
  opsi_varian?: { tier: string; opsi: string }[]
  sku_induk: string
  nama: string
  deskripsi?: string
  harga_dasar: string
  stok_referensi?: number | null
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
    stok_referensi: number | null
    keluarga_id: string | null
    opsi_varian: { tier: string; opsi: string }[]
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

export const listStokLedger = (produkId?: string, limit = 100, offset = 0, dari?: string, sampai?: string) =>
  api.get<StokLedger[]>('/stok/ledger', { params: { produk_id: produkId, limit, offset, dari, sampai } }).then((r) => r.data)

export const adjustStok = (payload: { produk_id: string; qty_delta: number; expected_stock?: number; catatan?: string; gudang_id?: string }) =>
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

export interface FilterPesanan {
  akun_id?: string
  tahap?: string
  resi?: string
  q?: string
  dari?: string
  sampai?: string
}

/** Server-side filtered and paged list for the Pesanan page. */
export const daftarPesanan = (params: FilterPesanan & { urut?: string; halaman?: number; per_halaman?: number }) =>
  api.get<PesananHalaman>('/pesanan/daftar', { params }).then((r) => r.data)

/** Counts for the status and shop chips (each row ignores its own filter). */
export const ringkasanPesanan = (params: Pick<FilterPesanan, 'akun_id' | 'tahap' | 'q' | 'dari' | 'sampai'>) =>
  api.get<RingkasanPesanan>('/pesanan/ringkasan', { params }).then((r) => r.data)

export const laporanDashboard = (dari: string, sampai: string, akun_id?: string) =>
  api.get<Dashboard>('/laporan/dashboard', { params: { dari, sampai, akun_id } }).then((r) => r.data)

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
export const prosesMassalPesanan = (pesananIds: string[], pengaturan?: Record<string, PengaturanPengiriman>) =>
  api.post<ProsesMassalResult>('/pesanan/proses-massal', {
    pesanan_ids: pesananIds, ...(pengaturan ? { pengaturan } : {}),
  }).then((r) => r.data)

/** Cancel on Shopee (only before shipment); reserved stock is released. */
export const batalkanPesananMarketplace = (id: string, alasan: string) =>
  api.post<Pesanan>(`/pesanan/${id}/batalkan`, { alasan }).then((r) => r.data)

export const tanganiPembatalanPembeli = (id: string, operasi: 'ACCEPT' | 'REJECT') =>
  api.post<Pesanan>(`/pesanan/${id}/pembatalan-pembeli`, { operasi }).then((r) => r.data)

/** Arrange shipment with explicit settings; omitted settings preserve legacy callers. */
export const opsiPengirimanPesanan = (id: string) =>
  api.get<OpsiPengiriman>(`/pesanan/${id}/opsi-pengiriman`).then((r) => r.data)

export const prosesPesananMarketplace = (id: string, pengaturan?: PengaturanPengiriman) =>
  api.post<Pesanan>(`/pesanan/${id}/proses`, pengaturan).then((r) => r.data)

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

/**
 * Labels of any selection of processed orders (several shops and couriers) joined into ONE pdf. Orders Shopee refuses
 * come back in `gagal` with the reason instead of blocking the rest.
 */
export const cetakResiGabungan = (pesananIds: string[], tipe: TemplateResi = 'THERMAL_AIR_WAYBILL') =>
  api.post<ResiGabunganHasil>('/pesanan/resi-gabungan', { pesanan_ids: pesananIds, tipe }, { timeout: 110_000 }).then((r) => r.data)

export const setPengiriman = (id: string, payload: { kurir: string; nomor_resi: string; tanggal_kirim?: string }) =>
  api.post<Pesanan>(`/pesanan/${id}/pengiriman`, payload).then((r) => r.data)

export const deletePesanan = (id: string) => api.delete(`/pesanan/${id}`)

// --- Staff-akun scoping ----------------------------------------------------------

export const listStaffAkun = (userId?: string) =>
  api.get<StaffAkun[]>('/staff-akun', { params: { user_id: userId } }).then((r) => r.data)

export const assignStaffAkun = (payload: { user_id: string; akun_id: string }) =>
  api.post<StaffAkun>('/staff-akun', payload).then((r) => r.data)

export const assignStaffBanyak = (payload: { user_id: string; akun_ids: string[] }) =>
  api.post<StaffAkun[]>('/staff-akun/banyak', payload).then((r) => r.data)

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

export interface FilterSettlementPesanan {
  akun_id?: string
  dari?: string
  sampai?: string
  q?: string
}

/** What Shopee released per order (pulled with syncSettlementAkun). */
export const daftarSettlementPesanan = (params: FilterSettlementPesanan & { urut?: string; halaman?: number; per_halaman?: number }) =>
  api.get<SettlementPesananHalaman>('/settlement-pesanan', { params }).then((r) => r.data)

export const ringkasanSettlementPesanan = (params: Pick<FilterSettlementPesanan, 'dari' | 'sampai' | 'q'>) =>
  api.get<SettlementRingkasan>('/settlement-pesanan/ringkasan', { params }).then((r) => r.data)

/** Pulls the last `hari` days (1..90) of released money from Shopee for one shop. */
export const syncSettlementAkun = (akunId: string, hari: number) =>
  api.post<SyncSettlementHasil>(`/akun/${akunId}/sync/settlement`, null, { params: { hari }, timeout: 120_000 }).then((r) => r.data)

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

export interface FilterIklanToko {
  akun_id?: string
  dari?: string
  sampai?: string
}

/** Shopee Ads performance per shop per day (dates are YYYY-MM-DD, Shopee/WIB days). */
export const daftarIklanHarianToko = (params: FilterIklanToko & { urut?: string; halaman?: number; per_halaman?: number }) =>
  api.get<IklanHarianTokoHalaman>('/iklan-toko/harian', { params }).then((r) => r.data)

export const ringkasanIklanToko = (params: Pick<FilterIklanToko, 'dari' | 'sampai'>) =>
  api.get<IklanRingkasan>('/iklan-toko/ringkasan', { params }).then((r) => r.data)

/** Pulls the last `hari` days (1..180) of Shopee Ads performance and the ads balance for one shop. */
export const syncIklanAkun = (akunId: string, hari: number) =>
  api.post<SyncIklanHasil>(`/akun/${akunId}/sync/iklan`, null, { params: { hari }, timeout: 120_000 }).then((r) => r.data)

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

// --- Katalog Shopee ----------------------------------------------------------

export const listKatalog = (params: {
  akun_id?: string
  q?: string
  status?: string
  belum_dikirim?: boolean
  urut?: string
  halaman?: number
  per_halaman?: number
}) => api.get<KatalogList>('/katalog-shopee', { params }).then((r) => r.data)

export const ringkasanKatalog = (params: { status?: string; akun_id?: string } = {}) =>
  api.get<KatalogRingkasan>('/katalog-shopee/ringkasan', { params }).then((r) => r.data)

export const getKatalog = (id: string) => api.get<KatalogDetail>(`/katalog-shopee/${id}`).then((r) => r.data)

/** Copies the chosen products to the online store as drafts with stock 0 (max 20 per call). Never writes to Shopee. */
export const kirimKatalogKeToko = (payload: { ids: string[]; aktif?: boolean; timpa?: boolean }) =>
  api.post<{ ok: boolean; hasil: KirimKatalogHasil[] }>('/katalog-shopee/kirim-toko', payload).then((r) => r.data)

export const daftarKampanyeIklan = (akunId: string, hari: number) =>
  api.get<KampanyeIklanDaftar>(`/akun/${akunId}/iklan/kampanye`, { params: { hari }, timeout: 90_000 }).then((r) => r.data)

export const aksiKampanyeIklan = (akunId: string, campaignId: string, payload: { aksi: AksiKampanye; budget?: number; roas_target?: number }) =>
  api.post(`/akun/${akunId}/iklan/kampanye/${campaignId}/aksi`, payload, { timeout: 60_000 }).then((r) => r.data)

export const kataKunciKampanyeIklan = (akunId: string, campaignId: string, kataKunci: PerubahanKataKunci[]) =>
  api.post(`/akun/${akunId}/iklan/kampanye/${campaignId}/kata-kunci`, { kata_kunci: kataKunci }, { timeout: 60_000 }).then((r) => r.data)

export const buatKampanyeIklan = (akunId: string, iklan: IklanBaru) =>
  api.post(`/akun/${akunId}/iklan/kampanye`, iklan, { timeout: 60_000 }).then((r) => r.data)

export const saranIklan = (akunId: string, itemId: number, opsi: { kata?: string; bidding?: 'auto' | 'manual' } = {}) =>
  api.get<SaranIklan>(`/akun/${akunId}/iklan/saran`, { params: { item_id: itemId, kata: opsi.kata || undefined, bidding: opsi.bidding }, timeout: 90_000 }).then((r) => r.data)

export const saranAiIklan = (akunId: string, hari: number) =>
  api.post<SaranAiHasil>(`/akun/${akunId}/iklan/saran-ai`, null, { params: { hari }, timeout: 100_000 }).then((r) => r.data)

export const simpanModalProduk = (akunId: string, itemId: string, modal: { modal_rp?: number | null; modal_persen?: number | null }) =>
  api.put(`/akun/${akunId}/iklan/modal/${itemId}`, modal).then((r) => r.data)


export interface ShopeeProductMutationResult {
  ok: boolean
  snapshot_diperbarui: boolean
  warnings: string[]
  request_id: string | null
}
export const editProdukShopee = (id: string, fields: { nama?: string; sku?: string; deskripsi?: string }) =>
  api.patch<ShopeeProductMutationResult>(`/katalog-shopee/${id}/produk`, fields).then((r) => r.data)
export const statusProdukShopee = (id: string, unlist: boolean) =>
  api.post<ShopeeProductMutationResult>(`/katalog-shopee/${id}/status`, { unlist }).then((r) => r.data)


export interface ProdukKeluarga { id: string; nama: string; tiers: string[] }
export const listProdukKeluarga = () => api.get<ProdukKeluarga[]>('/produk-keluarga').then((r) => r.data)
export const createProdukKeluarga = (payload: { nama: string; tiers: string[] }) => api.post<ProdukKeluarga>('/produk-keluarga', payload).then((r) => r.data)
export const deleteProdukKeluarga = (id: string) => api.delete(`/produk-keluarga/${id}`)

export const renameProdukKeluarga = (id: string, nama: string) => api.patch<ProdukKeluarga>(`/produk-keluarga/${id}`, { nama }).then((r) => r.data)

export const daftarRetur = (akunId: string, params: { dari: string; sampai: string; halaman: number; per_halaman?: number }) =>
  api.get<import('./types').ReturHalaman>(`/akun/${encodeURIComponent(akunId)}/retur`, { params }).then((r) => r.data)

export const getRetur = (akunId: string, nomorRetur: string) =>
  api.get<import('./types').ReturMarketplace>(`/akun/${encodeURIComponent(akunId)}/retur/${encodeURIComponent(nomorRetur)}`).then((r) => r.data)

export const konfirmasiRetur = (akunId: string, nomor: string) =>
  api.post<import('./types').MutasiMarketplace>(`/akun/${encodeURIComponent(akunId)}/retur/${encodeURIComponent(nomor)}/konfirmasi`).then((r) => r.data)
export const daftarPromosi = (akunId: string, status_filter: string, halaman: number) =>
  api.get<import('./types').PromosiHalaman>(`/akun/${encodeURIComponent(akunId)}/promosi`, { params: { status_filter, halaman } }).then((r) => r.data)
export const getPromosi = (akunId: string, id: string, halaman = 1) =>
  api.get<import('./types').PromosiDetail>(`/akun/${encodeURIComponent(akunId)}/promosi/${id}`, { params: { halaman } }).then((r) => r.data)
export const buatPromosi = (akunId: string, data: { nama: string; mulai_at: number; selesai_at: number }) =>
  api.post<import('./types').MutasiMarketplace>(`/akun/${encodeURIComponent(akunId)}/promosi`, data).then((r) => r.data)
export const akhiriPromosi = (akunId: string, id: string, hapus = false) =>
  api.post<import('./types').MutasiMarketplace>(`/akun/${encodeURIComponent(akunId)}/promosi/${id}/akhiri`, null, { params: { hapus } }).then((r) => r.data)
export const kelolaBarangPromosi = (akunId: string, id: string, data: import('./types').PromosiProdukInput) =>
  api.post<import('./types').MutasiMarketplace>(`/akun/${encodeURIComponent(akunId)}/promosi/${id}/barang`, data).then((r) => r.data)

export interface SalinMasterHasil { katalog_id: string; nama?: string; ok: boolean; sku_dibuat?: number; error?: string; produk?: { id: string; sku: string; baru: boolean }[] }
export const salinKatalogMaster = (ids: string[]) => api.post<{ hasil: SalinMasterHasil[] }>('/katalog-shopee/salin-master', { ids }).then(r => r.data)

export const getPengaturanStok = () => api.get<{ mode: 'per_toko' | 'gudang_erp'; gudang_aktif: boolean }>('/pengaturan-stok').then(r => r.data)

export type ShopPerformance = { metrics: { metric_id: number; metric_name: string; current_period: number | null; last_period: number | null; unit: number; target: { comparator: string; value: number } | null }[]; diambil_at: string; request_id: string | null }
export const getShopPerformance = (id: string) => api.get<ShopPerformance>(`/akun/${encodeURIComponent(id)}/performa-toko`).then(r => r.data)
export type ProductStats = { sale: number | null; views: number | null; likes: number | null; rating_star: number | null; comment_count: number | null; diambil_at: string }
export const getProductStats = (id: string) => api.get<ProductStats>(`/katalog-shopee/${encodeURIComponent(id)}/statistik`).then(r => r.data)
export const ubahPromosi = (akun: string, id: string, data: { nama?: string; mulai_at?: number; selesai_at?: number }) => api.patch<import('./types').MutasiMarketplace>(`/akun/${encodeURIComponent(akun)}/promosi/${encodeURIComponent(id)}`, data).then(r => r.data)
