import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/api/client', () => ({ default: api }))
import { tanganiPembatalanPembeli } from '@/api/endpoints'
import { adaPembatalanPembeli, bisaDiproses, bisaDicetak, bisaDibatalkan, labelStatus } from '@/lib/pesanan'
beforeEach(() => vi.clearAllMocks())
it('shows buyer cancellation separately and excludes it from all shipment actions', () => {
  const p = { platform: 'shopee' as const, status: 'to_ship' as const, status_marketplace: 'IN_CANCEL' }
  expect(labelStatus(p)).toBe('Permintaan Pembatalan Pembeli')
  expect(adaPembatalanPembeli(p)).toBe(true)
  expect(bisaDiproses(p)).toBe(false)
  expect(bisaDicetak(p)).toBe(false)
  expect(bisaDibatalkan(p)).toBe(false)
  expect(adaPembatalanPembeli({ ...p, platform: 'lazada' })).toBe(false)
  expect(adaPembatalanPembeli({ ...p, status_marketplace: 'CANCELLED', status: 'cancelled' })).toBe(false)
  expect(bisaDiproses({ ...p, status_marketplace: 'UNKNOWN' })).toBe(false)
  expect(bisaDiproses({ ...p, status_marketplace: 'RETRY_SHIP' })).toBe(true)
})
it.each(['ACCEPT', 'REJECT'] as const)('submits %s through the dedicated endpoint', async (operasi) => {
  api.post.mockResolvedValue({ data: { status_marketplace: 'IN_CANCEL' } })
  const result = await tanganiPembatalanPembeli('order-id', operasi)
  expect(api.post).toHaveBeenCalledWith('/pesanan/order-id/pembatalan-pembeli', { operasi })
  expect(result.status_marketplace).toBe('IN_CANCEL')
})
it('passes provider error through for display without automatic retry', async () => {
  const error = new Error('error_permission (request_id: rejection-id)')
  api.post.mockRejectedValue(error)
  await expect(tanganiPembatalanPembeli('order-id', 'ACCEPT')).rejects.toBe(error)
  expect(api.post).toHaveBeenCalledTimes(1)
})
