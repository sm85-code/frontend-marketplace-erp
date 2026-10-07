import { expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/api/client', () => ({ default: api }))
import { buatPromosi, kelolaBarangPromosi, konfirmasiRetur, editProdukShopee } from '@/api/endpoints'
import { epochPromosi, jadwalAwalPromosi, labelPromosi, validasiJadwalPromosi } from '@/lib/promosi'
it('schedules in WIB and respects Shopee time limits', () => {
  expect(epochPromosi('2026-10-08T08:00')).toBe(Date.parse('2026-10-08T01:00:00Z') / 1000)
  expect(jadwalAwalPromosi(new Date('2026-10-07T18:00:00Z')).mulai).toBe('2026-10-08T03:00')
  expect(() => epochPromosi('2026-02-30T08:00')).toThrow()
  expect(() => validasiJadwalPromosi(100, 10000, 100)).toThrow()
  expect(() => validasiJadwalPromosi(7200, 10800, 0)).not.toThrow()
  expect(() => validasiJadwalPromosi(7200, 7200 + 180 * 86400, 0)).toThrow()
  expect(labelPromosi('NEW')).toBe('NEW')
})
it('keeps large activity IDs and exact variant price payload', async () => {
  api.post.mockResolvedValue({ data: { ok: false, gagal: [{ fail_error: 'discount.error_price' }], request_id: 'req' } })
  const data = { operasi: 'ubah' as const, katalog_id: 'catalog', model_id: '20', harga: '50.12', batas_pembelian: 0 }
  const result = await kelolaBarangPromosi('shop', '66512366666549900', data)
  expect(api.post).toHaveBeenLastCalledWith('/akun/shop/promosi/66512366666549900/barang', data)
  expect(result.ok).toBe(false)
  expect(result.gagal[0].fail_error).toBe('discount.error_price')
})
it('uses separate explicit endpoints for creation, return acceptance and description-only patches', async () => {
  api.post.mockResolvedValue({ data: { ok: true } })
  api.patch.mockResolvedValue({ data: {} })
  await buatPromosi('shop', { nama: 'Promo', mulai_at: 7200, selesai_at: 10800 })
  expect(api.post).toHaveBeenLastCalledWith('/akun/shop/promosi', { nama: 'Promo', mulai_at: 7200, selesai_at: 10800 })
  await konfirmasiRetur('shop', 'RET')
  expect(api.post).toHaveBeenLastCalledWith('/akun/shop/retur/RET/konfirmasi')
  await editProdukShopee('catalog', { deskripsi: 'Baru' })
  expect(api.patch).toHaveBeenLastCalledWith('/katalog-shopee/catalog/produk', { deskripsi: 'Baru' })
})
