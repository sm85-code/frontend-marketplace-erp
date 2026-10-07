import { describe, expect, it } from 'vitest'
import type { ProdukListing, ListingMarketplaceDetail } from '@/api/types'
import { pemetaanProduk } from '@/lib/pemetaanProduk'

const detail: ListingMarketplaceDetail = {
  item_id: '1', model_id: '2', nama_produk: 'Kaos', sku: 'M',
  opsi: [{ tier: 'Warna', opsi: 'Merah' }], harga: '100', harga_asli: null,
  berat_gram: 500, panjang_cm: '20', lebar_cm: '10', tinggi_cm: '5',
  preorder: false, hari_kirim: 2, ikut_produk: [], diambil_at: '2026-10-07T00:00:00Z',
}
const listing = (d?: ListingMarketplaceDetail): ProdukListing => ({ id: 'l', produk_id: 'p', akun_id: 'a', platform: 'shopee', id_eksternal: '1:2', harga_jual: null, stok_listing: null, aktif: true, detail_marketplace: d })

describe('SKU product mapping', () => {
  it('keeps structured parent and option separate without parsing legacy titles', () => {
    expect(pemetaanProduk([listing(detail), listing(detail)]).get('p')).toEqual({ nama: 'Kaos', opsi: detail.opsi, berbeda: false })
    expect(pemetaanProduk([listing()]).has('p')).toBe(false)
  })
  it('does not choose an arbitrary shop title or option when mappings differ', () => {
    const mapping = pemetaanProduk([listing(detail), { ...listing({ ...detail, nama_produk: 'Judul lain', opsi: [{ tier: 'Warna', opsi: 'Biru' }] }), akun_id: 'b' }]).get('p')
    expect(mapping).toEqual({ nama: null, opsi: null, berbeda: true })
  })
})
