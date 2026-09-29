/**
 * Form schemas (react-hook-form + zod). Numeric inputs stay as strings in the
 * form (same convention as frontend-siabumdes-ts) and are converted by the
 * `to*Payload` mappers into the exact BE request bodies.
 */
import { z } from 'zod'
import { PLATFORMS, type AkunMarketplaceIn, type ChangePasswordIn, type AkunMarketplacePatch, type ItemPesananIn, type PesananIn, type ProdukIn, type ProdukListingIn, type ProdukListingPatch, type ProdukPatch, type StokAdjustIn } from '@/api/types'

const isNum = (v: string) => v.trim() !== '' && Number.isFinite(Number(v))

const moneyString = (required: string) =>
  z
    .string()
    .trim()
    .min(1, required)
    .refine((v) => isNum(v) && Number(v) >= 0, { message: 'Harus angka ≥ 0' })

const optionalMoneyString = z
  .string()
  .trim()
  .refine((v) => v === '' || (isNum(v) && Number(v) >= 0), { message: 'Harus angka ≥ 0' })

const optionalNonNegIntString = z
  .string()
  .trim()
  .refine((v) => v === '' || (isNum(v) && Number.isInteger(Number(v)) && Number(v) >= 0), {
    message: 'Harus bilangan bulat ≥ 0',
  })

const emptyToNull = (v: string | undefined | null): string | null => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v))

// --- Login -------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
export type LoginValues = z.infer<typeof loginSchema>

// --- Ganti Password -------------------------------------------------------------

/** Mirrors BE schemas.PASSWORD_MIN_LENGTH / PASSWORD_MAX_BYTES (bcrypt limit). */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_BYTES = 72
/** BE rejects the seeded default as a new password. */
export const DEFAULT_SEED_PASSWORD = 'password123'

const utf8Bytes = (v: string) => new TextEncoder().encode(v).length

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi'),
    new_password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password baru minimal ${PASSWORD_MIN_LENGTH} karakter`)
      .refine((v) => utf8Bytes(v) <= PASSWORD_MAX_BYTES, { message: 'Password baru terlalu panjang' })
      .refine((v) => v.trim() !== '', { message: 'Password baru tidak boleh hanya spasi' }),
    confirm_password: z.string().min(1, 'Ulangi password baru'),
  })
  .refine((v) => v.new_password !== v.current_password, {
    path: ['new_password'],
    message: 'Password baru harus berbeda dari password saat ini',
  })
  .refine((v) => v.new_password !== DEFAULT_SEED_PASSWORD, {
    path: ['new_password'],
    message: 'Jangan gunakan password bawaan',
  })
  .refine((v) => v.confirm_password === v.new_password, {
    path: ['confirm_password'],
    message: 'Konfirmasi password tidak sama',
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const changePasswordDefaults: ChangePasswordValues = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

/** confirm_password is FE-only; BE body is exactly {current_password, new_password}. */
export function toChangePasswordPayload(v: ChangePasswordValues): ChangePasswordIn {
  return { current_password: v.current_password, new_password: v.new_password }
}

// --- Akun Marketplace -----------------------------------------------------------

export const akunSchema = z.object({
  platform: z.enum(PLATFORMS, { message: 'Pilih platform' }),
  nama_toko: z.string().trim().min(1, 'Nama toko wajib diisi').max(255, 'Maksimal 255 karakter'),
  id_toko_eksternal: z.string().trim().max(255, 'Maksimal 255 karakter'),
  status: z.string().trim(),
  catatan: z.string(),
  access_token: z.string().trim(),
  refresh_token: z.string().trim(),
})
export type AkunValues = z.infer<typeof akunSchema>

export const akunDefaults: AkunValues = {
  platform: 'shopee',
  nama_toko: '',
  id_toko_eksternal: '',
  status: 'belum_terhubung',
  catatan: '',
  access_token: '',
  refresh_token: '',
}

export function toAkunCreatePayload(v: AkunValues): AkunMarketplaceIn {
  return {
    platform: v.platform,
    nama_toko: v.nama_toko.trim(),
    id_toko_eksternal: emptyToNull(v.id_toko_eksternal),
    catatan: emptyToNull(v.catatan),
  }
}

/** Only sends tokens when the user typed one (never blank existing tokens). */
export function toAkunPatchPayload(v: AkunValues): AkunMarketplacePatch {
  const body: AkunMarketplacePatch = {
    nama_toko: v.nama_toko.trim(),
    id_toko_eksternal: emptyToNull(v.id_toko_eksternal),
    catatan: emptyToNull(v.catatan),
  }
  if (v.status.trim()) body.status = v.status.trim()
  if (v.access_token.trim()) body.access_token = v.access_token.trim()
  if (v.refresh_token.trim()) body.refresh_token = v.refresh_token.trim()
  return body
}

// --- Produk ------------------------------------------------------------------------

export const produkSchema = z.object({
  sku_induk: z.string().trim().min(1, 'SKU induk wajib diisi').max(128, 'Maksimal 128 karakter'),
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(255, 'Maksimal 255 karakter'),
  deskripsi: z.string(),
  harga_dasar: moneyString('Harga dasar wajib diisi'),
  stok: optionalNonNegIntString,
  foto_url: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\//i.test(v), { message: 'URL harus diawali http(s)://' }),
  aktif: z.boolean(),
})
export type ProdukValues = z.infer<typeof produkSchema>

export const produkDefaults: ProdukValues = {
  sku_induk: '',
  nama: '',
  deskripsi: '',
  harga_dasar: '',
  stok: '0',
  foto_url: '',
  aktif: true,
}

export function toProdukCreatePayload(v: ProdukValues): ProdukIn {
  return {
    sku_induk: v.sku_induk.trim(),
    nama: v.nama.trim(),
    deskripsi: v.deskripsi,
    harga_dasar: v.harga_dasar.trim(),
    stok: v.stok.trim() === '' ? 0 : Number(v.stok),
    foto_url: emptyToNull(v.foto_url),
  }
}

/** PATCH must not include `stok` (BE returns 400; use /stok/adjust). */
export function toProdukPatchPayload(v: ProdukValues): ProdukPatch {
  return {
    nama: v.nama.trim(),
    deskripsi: v.deskripsi,
    harga_dasar: v.harga_dasar.trim(),
    foto_url: emptyToNull(v.foto_url),
    aktif: v.aktif,
  }
}

// --- Listing -------------------------------------------------------------------------

export const listingSchema = z.object({
  produk_id: z.string().min(1, 'Pilih produk (SKU induk)'),
  akun_id: z.string().min(1, 'Pilih toko'),
  id_eksternal: z.string().trim().min(1, 'ID listing di marketplace wajib diisi').max(255, 'Maksimal 255 karakter'),
  harga_jual: optionalMoneyString,
  stok_listing: optionalNonNegIntString,
  aktif: z.boolean(),
})
export type ListingValues = z.infer<typeof listingSchema>

export const listingDefaults: ListingValues = {
  produk_id: '',
  akun_id: '',
  id_eksternal: '',
  harga_jual: '',
  stok_listing: '',
  aktif: true,
}

/** `platform` is derived from the chosen akun so the BE mapping stays consistent. */
export function toListingCreatePayload(v: ListingValues, platform: string): ProdukListingIn {
  return {
    produk_id: v.produk_id,
    akun_id: v.akun_id,
    platform,
    id_eksternal: v.id_eksternal.trim(),
    harga_jual: v.harga_jual.trim() === '' ? null : v.harga_jual.trim(),
    stok_listing: numOrNull(v.stok_listing),
  }
}

export function toListingPatchPayload(v: ListingValues): ProdukListingPatch {
  return {
    harga_jual: v.harga_jual.trim() === '' ? null : v.harga_jual.trim(),
    stok_listing: numOrNull(v.stok_listing),
    aktif: v.aktif,
  }
}

// --- Stok adjust ------------------------------------------------------------------------

export const stokAdjustSchema = z.object({
  produk_id: z.string().min(1, 'Pilih produk'),
  arah: z.enum(['masuk', 'keluar']),
  qty: z
    .string()
    .trim()
    .min(1, 'Jumlah wajib diisi')
    .refine((v) => isNum(v) && Number.isInteger(Number(v)) && Number(v) >= 1, {
      message: 'Jumlah harus bilangan bulat ≥ 1',
    }),
  gudang_id: z.string(),
  catatan: z.string(),
})
export type StokAdjustValues = z.infer<typeof stokAdjustSchema>

export function toStokAdjustPayload(v: StokAdjustValues): StokAdjustIn {
  const qty = Number(v.qty)
  return {
    produk_id: v.produk_id,
    qty_delta: v.arah === 'keluar' ? -qty : qty,
    catatan: emptyToNull(v.catatan),
    gudang_id: emptyToNull(v.gudang_id),
  }
}

// --- Pesanan manual ----------------------------------------------------------------------

export const itemPesananSchema = z.object({
  produk_id: z.string(),
  nama_produk: z.string().trim().min(1, 'Nama produk wajib diisi'),
  harga_satuan: moneyString('Harga wajib diisi'),
  qty: z
    .string()
    .trim()
    .min(1, 'Qty wajib')
    .refine((v) => isNum(v) && Number.isInteger(Number(v)) && Number(v) >= 1, { message: 'Qty ≥ 1' }),
})

export const pesananSchema = z.object({
  platform: z.enum(PLATFORMS, { message: 'Pilih platform' }),
  akun_id: z.string(),
  id_eksternal: z.string().trim().min(1, 'No. pesanan marketplace wajib diisi'),
  nama_pembeli: z.string(),
  items: z.array(itemPesananSchema).min(1, 'Minimal 1 item'),
})
export type PesananValues = z.infer<typeof pesananSchema>

export const pesananDefaults: PesananValues = {
  platform: 'shopee',
  akun_id: '',
  id_eksternal: '',
  nama_pembeli: '',
  items: [{ produk_id: '', nama_produk: '', harga_satuan: '', qty: '1' }],
}

export function toPesananPayload(v: PesananValues): PesananIn {
  const items: ItemPesananIn[] = v.items.map((it) => ({
    nama_produk: it.nama_produk.trim(),
    harga_satuan: it.harga_satuan.trim(),
    qty: Number(it.qty),
    produk_id: emptyToNull(it.produk_id),
  }))
  return {
    platform: v.platform,
    id_eksternal: v.id_eksternal.trim(),
    akun_id: emptyToNull(v.akun_id),
    status: 'unpaid',
    nama_pembeli: v.nama_pembeli.trim(),
    items,
  }
}
