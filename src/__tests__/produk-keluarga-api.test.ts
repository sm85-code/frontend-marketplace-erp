import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/api/client', () => ({ default: api }))
import { createProdukKeluarga, updateProduk, deleteProdukKeluarga } from '@/api/endpoints'
beforeEach(() => {
  vi.clearAllMocks()
  for (const method of Object.values(api)) method.mockResolvedValue({ data: {} })
})
it('creates a parent without inventory fields and explicitly groups or detaches SKU metadata', async () => {
  await createProdukKeluarga({ nama: 'Kaos', tiers: ['Warna', 'Ukuran'] })
  expect(api.post).toHaveBeenCalledWith('/produk-keluarga', { nama: 'Kaos', tiers: ['Warna', 'Ukuran'] })
  const options = [{ tier: 'Warna', opsi: 'Merah' }, { tier: 'Ukuran', opsi: 'M' }]
  await updateProduk('sku', { keluarga_id: 'parent', opsi_varian: options })
  expect(api.patch).toHaveBeenLastCalledWith('/produk/sku', { keluarga_id: 'parent', opsi_varian: options })
  await updateProduk('sku', { keluarga_id: null, opsi_varian: [] })
  expect(api.patch).toHaveBeenLastCalledWith('/produk/sku', { keluarga_id: null, opsi_varian: [] })
})
it('passes through a protected-parent deletion conflict instead of hiding it', async () => {
  const conflict = new Error('Produk induk masih memiliki SKU')
  api.delete.mockRejectedValueOnce(conflict)
  await expect(deleteProdukKeluarga('parent')).rejects.toBe(conflict)
})
