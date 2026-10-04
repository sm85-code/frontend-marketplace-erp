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

export interface ProdukListing {
  id: string
  produk_id: string
  akun_id: string
  platform: Platform
  id_eksternal: string
  harga_jual: string | null
  stok_listing: number | null
  aktif: boolean
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
  harga_satuan: string
  qty: number
  subtotal: string
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
  /** When the shipping label was last generated, and by whom (marks "already printed"). */
  resi_dicetak_at?: string | null
  resi_dicetak_oleh?: string | null
  kurir: string | null
  nomor_resi: string | null
  tanggal_kirim: string | null
  items: ItemPesanan[]
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
