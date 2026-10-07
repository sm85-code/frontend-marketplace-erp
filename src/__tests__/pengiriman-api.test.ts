import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/api/client', () => ({ default: api }))
import { opsiPengirimanPesanan, prosesMassalPesanan, prosesPesananMarketplace } from '@/api/endpoints'
beforeEach(() => { vi.clearAllMocks(); api.post.mockResolvedValue({ data: {} }); api.get.mockResolvedValue({ data: { opsi: [] } }) })
it('loads order-specific options and forwards explicit Drop Off settings', async () => {
  await opsiPengirimanPesanan('order')
  expect(api.get).toHaveBeenCalledWith('/pesanan/order/opsi-pengiriman')
  await prosesPesananMarketplace('order', { metode: 'dropoff' })
  expect(api.post).toHaveBeenCalledWith('/pesanan/order/proses', { metode: 'dropoff' })
})
it('preserves the old bulk payload and sends per-order settings when supplied', async () => {
  await prosesMassalPesanan(['order'])
  expect(api.post).toHaveBeenLastCalledWith('/pesanan/proses-massal', { pesanan_ids: ['order'] })
  await prosesMassalPesanan(['order'], { order: { metode: 'pickup', address_id: 2, pickup_time_id: 'b' } })
  expect(api.post).toHaveBeenLastCalledWith('/pesanan/proses-massal', {
    pesanan_ids: ['order'], pengaturan: { order: { metode: 'pickup', address_id: 2, pickup_time_id: 'b' } },
  })
})
