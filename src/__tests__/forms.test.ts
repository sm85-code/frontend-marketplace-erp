import { describe, expect, it } from 'vitest'
import {
  akunDefaults,
  changePasswordDefaults,
  changePasswordSchema,
  akunSchema,
  listingSchema,
  pesananSchema,
  produkDefaults,
  produkSchema,
  stokAdjustSchema,
  toAkunCreatePayload,
  toChangePasswordPayload,
  toAkunPatchPayload,
  toListingCreatePayload,
  toListingPatchPayload,
  toPesananPayload,
  toProdukCreatePayload,
  toProdukPatchPayload,
  toStokAdjustPayload,
} from '@/schemas/forms'

describe('akun form', () => {
  it('create payload maps blanks to null', () => {
    const v = akunSchema.parse({ ...akunDefaults, nama_toko: ' Toko A ' })
    expect(toAkunCreatePayload(v)).toEqual({
      platform: 'shopee',
      nama_toko: 'Toko A',
      id_toko_eksternal: null,
      catatan: null,
    })
  })

  it('patch payload never blanks stored tokens', () => {
    const v = akunSchema.parse({ ...akunDefaults, nama_toko: 'X', status: 'nonaktif' })
    const body = toAkunPatchPayload(v)
    expect(body.status).toBe('nonaktif')
    expect('access_token' in body).toBe(false)
    expect('refresh_token' in body).toBe(false)
    const withTok = toAkunPatchPayload({ ...v, access_token: 'abc' })
    expect(withTok.access_token).toBe('abc')
  })

  it('rejects unknown platform', () => {
    expect(akunSchema.safeParse({ ...akunDefaults, nama_toko: 'x', platform: 'tokopedia' }).success).toBe(false)
  })
})

describe('produk form', () => {
  it('create payload sends stok as integer and harga as string decimal', () => {
    const v = produkSchema.parse({ ...produkDefaults, sku_induk: 'SKU-1', nama: 'Kaos', harga_dasar: '15000.50', stok: '7' })
    expect(toProdukCreatePayload(v)).toEqual({
      sku_induk: 'SKU-1',
      nama: 'Kaos',
      deskripsi: '',
      harga_dasar: '15000.50',
      stok: 7,
      foto_url: null,
    })
  })

  it('patch payload excludes stok and sku (BE rejects stok on PATCH)', () => {
    const v = produkSchema.parse({ ...produkDefaults, sku_induk: 'S', nama: 'N', harga_dasar: '1', stok: '9' })
    const body = toProdukPatchPayload(v)
    expect('stok' in body).toBe(false)
    expect('sku_induk' in body).toBe(false)
    expect(body.aktif).toBe(true)
  })

  it('validates harga and foto url', () => {
    expect(produkSchema.safeParse({ ...produkDefaults, sku_induk: 'S', nama: 'N', harga_dasar: '-1' }).success).toBe(false)
    expect(
      produkSchema.safeParse({ ...produkDefaults, sku_induk: 'S', nama: 'N', harga_dasar: '1', foto_url: 'ftp://x' }).success,
    ).toBe(false)
  })
})

describe('listing form', () => {
  const base = { produk_id: 'p1', akun_id: 'a1', id_eksternal: ' 123 ', harga_jual: '', stok_listing: '', aktif: true }

  it('derives platform from akun and nulls empty overrides', () => {
    const v = listingSchema.parse(base)
    expect(toListingCreatePayload(v, 'shopee')).toEqual({
      produk_id: 'p1',
      akun_id: 'a1',
      platform: 'shopee',
      id_eksternal: '123',
      harga_jual: null,
      stok_listing: null,
    })
  })

  it('patch payload only has harga_jual/stok_listing/aktif', () => {
    const v = listingSchema.parse({ ...base, harga_jual: '20000', stok_listing: '5', aktif: false })
    expect(toListingPatchPayload(v)).toEqual({ harga_jual: '20000', stok_listing: 5, aktif: false })
  })
})

describe('stok adjust form', () => {
  it('turns keluar into a negative qty_delta', () => {
    const v = stokAdjustSchema.parse({ produk_id: 'p', arah: 'keluar', qty: '3', gudang_id: '', catatan: '' })
    expect(toStokAdjustPayload(v)).toEqual({ produk_id: 'p', qty_delta: -3, catatan: null, gudang_id: null })
  })

  it('rejects zero / fractional qty (BE rejects qty_delta 0)', () => {
    expect(stokAdjustSchema.safeParse({ produk_id: 'p', arah: 'masuk', qty: '0', gudang_id: '', catatan: '' }).success).toBe(false)
    expect(stokAdjustSchema.safeParse({ produk_id: 'p', arah: 'masuk', qty: '1.5', gudang_id: '', catatan: '' }).success).toBe(false)
  })
})

describe('pesanan manual form', () => {
  it('builds PesananIn with unpaid status and optional produk link', () => {
    const v = pesananSchema.parse({
      platform: 'shopee',
      akun_id: '',
      id_eksternal: 'SP-1',
      nama_pembeli: 'Budi',
      items: [{ produk_id: 'p1', nama_produk: 'Kaos', harga_satuan: '10000', qty: '2' }],
    })
    expect(toPesananPayload(v)).toEqual({
      platform: 'shopee',
      id_eksternal: 'SP-1',
      akun_id: null,
      status: 'unpaid',
      nama_pembeli: 'Budi',
      items: [{ nama_produk: 'Kaos', harga_satuan: '10000', qty: 2, produk_id: 'p1' }],
    })
  })

  it('requires at least one item with qty >= 1', () => {
    expect(
      pesananSchema.safeParse({ platform: 'shopee', akun_id: '', id_eksternal: 'x', nama_pembeli: '', items: [] }).success,
    ).toBe(false)
    expect(
      pesananSchema.safeParse({
        platform: 'shopee',
        akun_id: '',
        id_eksternal: 'x',
        nama_pembeli: '',
        items: [{ produk_id: '', nama_produk: 'a', harga_satuan: '1', qty: '0' }],
      }).success,
    ).toBe(false)
  })
})

describe('ganti password form', () => {
  const ok = { current_password: 'password123', new_password: 'RahasiaBaru1', confirm_password: 'RahasiaBaru1' }
  const firstError = (v: typeof ok) => {
    const r = changePasswordSchema.safeParse(v)
    return r.success ? null : { path: r.error.issues[0].path.join('.'), message: r.error.issues[0].message }
  }

  it('accepts a valid change and sends only BE fields', () => {
    const v = changePasswordSchema.parse(ok)
    expect(toChangePasswordPayload(v)).toEqual({ current_password: 'password123', new_password: 'RahasiaBaru1' })
  })

  it('requires current password', () => {
    expect(firstError({ ...ok, current_password: '' })?.path).toBe('current_password')
  })

  it('enforces min 8 chars on new password', () => {
    expect(firstError({ ...ok, new_password: 'pendek1', confirm_password: 'pendek1' })?.path).toBe('new_password')
    expect(changePasswordSchema.safeParse({ ...ok, new_password: '12345678', confirm_password: '12345678' }).success).toBe(true)
  })

  it('rejects over-long (bcrypt 72 byte) passwords', () => {
    const long = 'a'.repeat(73)
    expect(firstError({ ...ok, new_password: long, confirm_password: long })?.path).toBe('new_password')
  })

  it('new password must differ from current', () => {
    const same = { current_password: 'SamaSaja99', new_password: 'SamaSaja99', confirm_password: 'SamaSaja99' }
    expect(firstError(same)).toEqual({ path: 'new_password', message: 'Password baru harus berbeda dari password saat ini' })
  })

  it('rejects the seeded default password as new password', () => {
    const v = { current_password: 'LamaSekali1', new_password: 'password123', confirm_password: 'password123' }
    expect(firstError(v)?.path).toBe('new_password')
  })

  it('confirmation must match', () => {
    expect(firstError({ ...ok, confirm_password: 'Beda12345' })?.path).toBe('confirm_password')
  })

  it('defaults are empty and invalid', () => {
    expect(changePasswordSchema.safeParse(changePasswordDefaults).success).toBe(false)
  })
})
