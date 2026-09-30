/** Mirrors tenants/marketplace_erp/modules/marketplace_erp/application/schemas.py field for field. */

export type Role = 'owner' | 'staff'

export type Platform = 'shopee' | 'tiktokshop' | 'lazada' | 'blibli'

export type StatusPesanan = 'unpaid' | 'to_ship' | 'shipped' | 'completed' | 'cancelled'

export type StatusSettlement = 'draft' | 'matched' | 'discrepancy' | 'paid'

export type StatusIklan = 'draft' | 'aktif' | 'dijeda' | 'selesai'

export type StatusAkun = 'belum_terhubung' | 'terhubung' | 'aktif' | 'token_kadaluarsa' | 'nonaktif'

export interface User {
  id: string
  nama: string
  email: string
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
