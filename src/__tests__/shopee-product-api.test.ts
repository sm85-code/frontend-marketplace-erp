import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }))
vi.mock('@/api/client', () => ({ default: api }))
import { editProdukShopee, statusProdukShopee } from '@/api/endpoints'
beforeEach(() => {
  vi.clearAllMocks()
  api.patch.mockResolvedValue({ data: { ok: true, warnings: [] } })
  api.post.mockResolvedValue({ data: { ok: true, warnings: [] } })
})
it('preserves an explicit empty parent SKU and sends no unrelated fields', async () => {
  await editProdukShopee('catalog', { sku: '' })
  expect(api.patch).toHaveBeenCalledWith('/katalog-shopee/catalog/produk', { sku: '' })
})
it('distinguishes unlist from relist and propagates provider rejection', async () => {
  await statusProdukShopee('catalog', true)
  expect(api.post).toHaveBeenLastCalledWith('/katalog-shopee/catalog/status', { unlist: true })
  await statusProdukShopee('catalog', false)
  expect(api.post).toHaveBeenLastCalledWith('/katalog-shopee/catalog/status', { unlist: false })
  const rejection = new Error('Shopee rejected: request_id abc')
  api.post.mockRejectedValueOnce(rejection)
  await expect(statusProdukShopee('catalog', true)).rejects.toBe(rejection)
})
