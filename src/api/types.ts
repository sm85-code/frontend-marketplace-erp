/** Mirrors tenants/marketplace_erp/modules/marketplace_erp/application/schemas.py field for field. */

/** admin (everything, incl. other users' usernames and roles) > owner > staff (only the shops assigned to it). */
export type Role = 'admin' | 'owner' | 'staff'

export type Platform = 'shopee' | 'tiktokshop' | 'lazada' | 'blibli'

export type StatusPesanan = 'unpaid' | 'to_ship' | 'shipped' | 'completed' | 'cancelled'

export type StatusSettlement = 'draft' | 'matched' | 'discrepancy' | 'paid'

export type StatusIklan = 'draft' | 'aktif' | 'dijeda' | 'selesai'

export type StatusAkun = 'belum_terhubung' | 'terhubung' | 'aktif' | 'token_kadaluarsa' | 'nonaktif'

export interface User {
  id: string
  nama: string
  /** Login name; set (and changed) by an admin. */
  username: string | null
  /** Optional contact email, also accepted at login. */
  email: string | null
  role: Role
  must_change_password: boolean
}

export interface AkunMarketplace {
  id: string
  platform: Platform
  nama_toko: string
  id_toko_eksternal: string | null
  status: string
  catatan: string | null
}

export interface Produk {
  id: string
  sku_induk: string
  nama: string
  deskripsi: string
  harga_dasar: string
  stok: number
  foto_url: string | null
  aktif: boolean
  berat_gram?: number
  panjang_cm?: string
  lebar_cm?: string
  tinggi_cm?: string
  preorder?: boolean
  hari_proses?: number
}

export interface PublishTokoResult {
  dibuat: boolean
  foto_disalin: boolean
  produk: { id: string; nama: string; harga: string; stok: number; aktif: boolean }
}

export interface ListingMarketplaceDetail {
  item_id: string
  model_id: string | null
  nama_produk: string
  sku: string
  opsi: KatalogVarianOpsi[]
  harga: string | null
  harga_asli: string | null
  berat_gram: number | null
  panjang_cm: string | null
  lebar_cm: string | null
  tinggi_cm: string | null
  preorder: boolean | null
  hari_kirim: number | null
  ikut_produk: string[]
  diambil_at: string
}

export interface ProdukListing {
  id: string
  produk_id: string
  akun_id: string
  platform: Platform
  id_eksternal: string
  harga_jual: string | null
  stok_listing: number | null
  aktif: boolean
  detail_marketplace?: ListingMarketplaceDetail | null
}

export interface Gudang {
  id: string
  kode: string
  nama: string
  aktif: boolean
}

export interface StokLedger {
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

export interface ItemPesanan {
  id: string
  produk_id: string | null
  listing_id: string | null
  nama_produk: string
  model_name?: string
  item_sku?: string
  model_sku?: string
  /** Product photo (stored with the order line, or borrowed from the catalogue for older orders). */
  foto?: string | null
  item_id_eksternal?: string | null
  harga_satuan: string
  qty: number
  subtotal: string
}

export interface ResiGabunganHasil {
  /** The joined labels, base64. */
  pdf: string
  nama_file: string
  mime_type?: 'application/pdf' | 'text/html' | 'application/zip'
  berhasil: number
  /** Orders that got no label, with Shopee's reason; the others are in the pdf. */
  gagal: { id: string; id_eksternal: string | null; pesan: string }[]
  jumlah_pdf: number
}

export interface Pesanan {
  id: string
  platform: Platform
  id_eksternal: string
  akun_id: string | null
  status: StatusPesanan
  nama_pembeli: string
  total: string
  tersinkron_marketplace: boolean
  catatan_sinkron: string | null
  /** Marketplace's raw status (e.g. READY_TO_SHIP, PROCESSED); null for orders typed in by hand. */
  status_marketplace: string | null
  metode_pengiriman?: MetodePengiriman | 'non_integrated' | null
  /** When the shipping label was last generated, and by whom (marks "already printed"). */
  resi_dicetak_at?: string | null
  resi_dicetak_oleh?: string | null
  kurir: string | null
  nomor_resi: string | null
  tanggal_kirim: string | null
  /** When the buyer placed the order on the marketplace; null for older rows (fall back to created_at). */
  dipesan_at?: string | null
  items: ItemPesanan[]
  payment_method?: string
  currency?: string
  cod?: boolean
  days_to_ship?: number
  estimated_shipping_fee?: string
  actual_shipping_fee?: string
  note?: string
  cancel_by?: string
  cancel_reason?: string
  penerima?: string
  kota?: string
  ship_by_date?: number
  created_at: string
  updated_at: string
}

export interface StaffAkun {
  id: string
  user_id: string
  akun_id: string
}

export interface Settlement {
  id: string
  akun_id: string
  platform: Platform
  periode_mulai: string
  periode_selesai: string
  gross_sales: string
  fee_platform: string
  fee_payment: string
  ongkir_subsidi: string
  penalti: string
  net: string
  status: StatusSettlement
  catatan: string | null
}

/** Money Shopee released for one order (get_escrow_list + get_escrow_detail). Amounts are strings (decimals). */
export interface SettlementPesanan {
  id: string
  akun_id: string
  nama_toko: string | null
  order_sn: string
  dirilis_at: string | null
  jumlah_cair: string
  penjualan: string
  voucher_penjual: string
  komisi: string
  layanan: string
  transaksi: string
  ongkir: string
  subsidi_ongkir: string
  penyesuaian: string
}

export interface SettlementPesananHalaman {
  total: number
  halaman: number
  per_halaman: number
  items: SettlementPesanan[]
}

export interface SettlementRingkasanBaris {
  pesanan: number
  jumlah_cair: string
  penjualan: string
  voucher_penjual: string
  komisi: string
  layanan: string
  transaksi: string
  ongkir: string
  subsidi_ongkir: string
  penyesuaian: string
}

export interface SettlementRingkasan {
  toko: (SettlementRingkasanBaris & { akun_id: string; nama_toko: string; dirilis_terakhir: string | null })[]
  total: SettlementRingkasanBaris
}

export interface SyncSettlementHasil {
  ok: boolean
  ditemukan: number
  baru: number
  diperbarui: number
  /** Orders found but not read yet (the pull is capped per call): pull again until 0. */
  sisa: number
}

/** Shopee Ads performance of one shop for one day (pulled with syncIklanAkun). Amounts and ratios are strings/null. */
export interface IklanHarianToko {
  id: string
  akun_id: string
  nama_toko: string | null
  tanggal: string
  impression: number
  clicks: number
  direct_order: number
  broad_order: number
  direct_item_sold: number
  broad_item_sold: number
  direct_gmv: string
  broad_gmv: string
  expense: string
  ctr: string | null
  roas_langsung: string | null
  roas_luas: string | null
}

export interface IklanHarianTokoHalaman {
  total: number
  halaman: number
  per_halaman: number
  items: IklanHarianToko[]
}

export interface IklanRingkasanAngka {
  impression: number
  clicks: number
  direct_order: number
  broad_order: number
  direct_item_sold: number
  broad_item_sold: number
  direct_gmv: string
  broad_gmv: string
  expense: string
  ctr: string | null
  roas_langsung: string | null
  roas_luas: string | null
}

export interface IklanRingkasanToko extends IklanRingkasanAngka {
  akun_id: string
  nama_toko: string
  hari: number
  tanggal_terakhir: string | null
  saldo: string | null
  saldo_at: string | null
}

export interface IklanRingkasan {
  toko: IklanRingkasanToko[]
  total: IklanRingkasanAngka & { saldo: string; hari: number }
}

export interface SyncIklanHasil {
  ok: boolean
  hari: number
  saldo: string | null
  baru: number
  diperbarui: number
}

export interface IklanCampaign {
  id: string
  akun_id: string
  platform: Platform
  produk_id: string | null
  nama: string
  status: StatusIklan
  budget_harian: string
  tanggal_mulai: string
  tanggal_selesai: string | null
  catatan: string | null
}

export interface IklanMetrikHarian {
  id: string
  campaign_id: string
  tanggal: string
  impression: number
  klik: number
  biaya: string
}

export interface IklanLaporan {
  campaign_id: string
  dari: string
  sampai: string
  total_impression: number
  total_klik: number
  ctr: string
  total_biaya: string
  omzet_atribusi: string
  roas: string | null
}

export interface ProdukTerlaris {
  produk_id: string | null
  nama_produk: string
  qty_terjual: number
  omzet: string
}

export interface StokKritis {
  produk_id: string
  sku_induk: string
  nama: string
  stok: number
}

export interface LaporanRingkas {
  dari: string
  sampai: string
  total_omzet: string
  jumlah_pesanan_per_status: Record<StatusPesanan, number>
  produk_terlaris: ProdukTerlaris[]
  stok_kritis: StokKritis[]
}

export interface OAuthStart {
  platform: Platform
  akun_id: string
  authorize_url: string
}

export interface OAuthCallbackToko {
  akun_id: string
  id_toko_eksternal: string
  nama_toko: string
  baru: boolean
}

export interface OAuthCallbackResult {
  ok: boolean
  akun_id: string
  status: string
  toko: OAuthCallbackToko[]
}

export interface SyncPesananResult {
  ok: boolean
  pulled: number
  baru: number
  diperbarui: number
  tidak_berubah: number
  dilewati: number
}

export interface SyncProdukResult {
  ok: boolean
  pulled: number
  listing_baru: number
  sudah_ada: number
  tanpa_sku_cocok: number
  katalog_baru?: number
  katalog_diperbarui?: number
  katalog_dihapus?: number
  contoh_tanpa_sku: { id_eksternal: string; nama_produk: string; sku: string }[]
}

export interface PushStokHargaResult {
  ok: boolean
  dry_run: boolean
  jumlah: number
  stok_ok?: number
  harga_ok?: number
  gagal?: { id_eksternal: string; alasan: string }[]
}

export interface SinkronTokoResult {
  akun_id: string
  nama_toko: string
  /** ok = pulled, dilewati = synced a moment ago, ditunda = time budget used up, gagal = see pesan */
  hasil: 'ok' | 'dilewati' | 'ditunda' | 'gagal'
  baru: number
  diperbarui: number
  pesan: string | null
}

export interface SinkronPesananOtomatis {
  /** false when live sync is switched off on the server */
  aktif: boolean
  jumlah_baru: number
  jumlah_diperbarui: number
  toko: SinkronTokoResult[]
}

export interface ProsesMassalResult {
  berhasil: number
  gagal: number
  hasil: { id: string; id_eksternal: string | null; ok: boolean; pesan: string | null }[]
}

// --- Katalog Shopee (read-only snapshot per shop; sent to the online store on demand) ---

export interface KatalogItem {
  id: string
  akun_id: string
  nama_toko: string | null
  item_id: string
  nama: string
  sku: string
  foto_utama: string | null
  jumlah_foto: number
  harga_min: string | null
  harga_max: string | null
  stok_shopee: number | null
  jumlah_varian: number
  nilai_varian?: string
  sumbu?: string
  /** Every variant with its own price, stock, weight, package size and pre-order. */
  varian?: KatalogVarian[]
  status: string
  dikirim_toko_id: string | null
  dikirim_at: string | null
  /** First photos only; the detail has all of them. */
  foto: string[]
  deskripsi_ringkas: string
  berat_gram: number
  panjang_cm: string
  lebar_cm: string
  tinggi_cm: string
  diambil_at: string

  category_id?: number
  brand?: string
  attribute_list?: string
  create_time?: number
  update_time?: number
  condition?: string
  is_pre_order?: boolean
  days_to_ship?: number
  logistic_info?: string
  has_model?: boolean
  has_promotion?: boolean
  deboost?: boolean
  item_dangerous?: number
  wholesales?: string
  video_info?: boolean
  size_chart?: string
  gtin_code?: string
}

/** One tier of a variant: tier_variation.name and the chosen option_list.option. */
export interface KatalogVarianOpsi {
  tier: string
  opsi: string
}

/**
 * One variant (model) of a product. Fields after `stok` exist only on catalogues synced after variants were stored
 * per model; `null` = not set on this variant (Shopee then uses the product's value).
 */
export interface KatalogVarian {
  model_id?: string
  nama: string
  sumbu?: string
  opsi?: KatalogVarianOpsi[]
  sku: string
  harga: string
  /** Price before the promotion, only when higher than `harga`. */
  harga_asli?: string | null
  promo?: boolean
  stok: number | null
  berat_gram?: number | null
  panjang_cm?: number | null
  lebar_cm?: number | null
  tinggi_cm?: number | null
  preorder?: boolean | null
  hari_kirim?: number | null
  status?: string | null
  foto?: string | null
}

export interface KatalogDetail extends KatalogItem {
  deskripsi: string
  varian: KatalogVarian[]
}

export interface KatalogList {
  total: number
  halaman: number
  per_halaman: number
  items: KatalogItem[]
}

export interface KatalogRingkasan {
  /** Products in the chosen status (all statuses when none is chosen). */
  total: number
  toko: { akun_id: string; nama_toko: string; jumlah: number }[]
  /** Products per Shopee status (NORMAL, UNLIST, BANNED, REVIEWING), within the chosen shop. */
  status: Record<string, number>
}

export interface KirimKatalogHasil {
  id: string
  nama: string
  nama_toko: string | null
  hasil: 'dibuat' | 'diperbarui' | 'dilewati'
  pesan?: string
  produk_toko_id?: string
  foto?: number
}

// --- Pesanan: filterable, paged list and chip counts ---

export type TahapPesanan = 'belum_bayar' | 'perlu_diproses' | 'menunggu_kurir' | 'dikirim' | 'selesai' | 'dibatalkan'

export interface PesananHalaman {
  total: number
  halaman: number
  per_halaman: number
  items: Pesanan[]
}

export interface RingkasanPesanan {
  tahap: Record<TahapPesanan | 'semua', number>
  toko: { akun_id: string; nama_toko: string; jumlah: number }[]
  total_toko: number
}

// --- Dashboard tables ---

export interface DashboardToko {
  akun_id: string | null
  nama_toko: string
  pesanan: number
  omzet: string
  belum_bayar: number
  perlu_diproses: number
  menunggu_kurir: number
  dikirim: number
  selesai: number
  dibatalkan: number
  pesanan_terbaru: string | null
}

export interface DashboardProduk {
  nama_produk: string
  qty_terjual: number
  omzet: string
  pesanan: number
  toko: { nama_toko: string; qty: number }[]
}

export interface Dashboard {
  dari: string
  sampai: string
  data_sejak: string | null
  total_omzet: string
  total_pesanan: number
  rata_rata_pesanan: string
  jumlah_toko: number
  per_toko: DashboardToko[]
  per_tahap: { tahap: TahapPesanan; jumlah: number; nilai: string }[]
  produk_terlaris: DashboardProduk[]
  per_hari: { tanggal: string; pesanan: number; omzet: string }[]
  stok_kritis: StokKritis[]
}

/** One Shopee Ads product campaign with its settings and the performance of the asked period. Numbers arrive as JSON numbers. */
export interface KampanyeIklanKinerja {
  impression: number
  clicks: number
  expense: number | string
  direct_order: number
  direct_gmv: number | string
  roas: number | string | null
  ctr: number | string | null
}

export interface KampanyeKataKunci {
  kata: string
  status: string | null
  tipe: 'exact' | 'broad' | null
  bid: number | string | null
}

export interface KampanyeProduk {
  item_id: string
  /** null = the item is not in the Katalog Shopee (pull the catalogue to see its name and photo). */
  nama: string | null
  foto: string | null
  harga_min: number | string | null
  harga_max: number | string | null
  stok: number | null
  modal_rp: number | string | null
  modal_persen: number | string | null
}

export interface KampanyeMargin {
  terisi: number
  total: number
  margin_persen: number | null
  /** ROAS at which the ad just pays for itself; null = modal not filled or margin not positive. */
  roas_impas: number | null
  biaya_shopee_diketahui: boolean
}

export interface KampanyeIklan {
  campaign_id: string
  nama: string
  jenis: 'auto' | 'manual' | null
  status: string | null
  bidding: 'auto' | 'manual' | null
  penempatan: string | null
  /** Daily budget; 0 = unlimited (Shopee). */
  anggaran: number | string | null
  mulai: string | null
  selesai: string | null
  item_id: string[]
  roas_target: number | string | null
  kata_kunci: KampanyeKataKunci[]
  kinerja: KampanyeIklanKinerja | null
  /** First products only (see jumlah_produk for all of them). */
  produk: KampanyeProduk[]
  jumlah_produk: number
  margin: KampanyeMargin
}

export interface KampanyeIklanDaftar {
  saldo: number | string | null
  hari: number
  kampanye: KampanyeIklan[]
  catatan: string[]
  /** Share of sales Shopee kept as fees over the last 90 days (0..1); null = no settlements yet. */
  biaya_shopee_persen: number | null
}

export type AksiKampanye = 'pause' | 'resume' | 'stop' | 'delete' | 'change_budget' | 'change_roas_target'

export interface PerubahanKataKunci {
  aksi: 'add' | 'delete' | 'restore' | 'change_bid_price' | 'change_match_type'
  kata: string
  bid?: number
  tipe?: 'exact' | 'broad'
}

export interface SaranIklan {
  roas: Record<'rendah' | 'sedang' | 'tinggi', { nilai: number | null; persentil: number | null }> | null
  anggaran: { min: number | null; rekomendasi: number | null; maks: number | null } | null
  kata_kunci: { kata: string; skor: number | null; volume: number | null; bid: number | null }[]
  catatan: string[]
}

export interface IklanBaru {
  item_id: number
  bidding: 'auto' | 'manual'
  budget: number
  roas_target?: number
  kata_kunci?: { kata: string; bid: number; tipe: 'exact' | 'broad' }[]
}

export type TindakanSaranAi = 'pause' | 'resume' | 'change_budget' | 'change_roas_target' | 'hapus_kata_kunci' | 'ubah_bid' | 'perhatikan'

export interface SaranAiItem {
  campaign_id: string
  nama: string
  tindakan: TindakanSaranAi
  nilai: number | null
  kata: string | null
  prioritas: 'tinggi' | 'sedang' | 'rendah'
  alasan: string
}

export interface SaranAiHasil {
  ringkasan: string
  saran: SaranAiItem[]
  pemakaian: { token_masuk: number; token_keluar: number; biaya_usd: number; biaya_rp: number; model: string | null }
  kuota_sisa: number | null
  bulan_ini_usd: number | null
}

// Options returned by Shopee for this order, not shared across shops.
export type MetodePengiriman = 'dropoff' | 'pickup'
export interface PengaturanPengiriman {
  metode: MetodePengiriman
  address_id?: number
  pickup_time_id?: string
  branch_id?: number
  sender_real_name?: string
}
export interface OpsiMetodePengiriman {
  metode: MetodePengiriman
  tersedia: boolean
  alasan: string | null
  wajib: string[]
  nama_pengirim: string
  alamat: {
    address_id: number
    label: string
    rekomendasi: boolean
    jadwal: { pickup_time_id: string; label: string; tanggal?: number | null; rekomendasi: boolean }[]
  }[]
  cabang: { branch_id: number; label: string }[]
}
export interface OpsiPengiriman { opsi: OpsiMetodePengiriman[]; aksi?: 'pengiriman' | 'pickup_ulang' }
