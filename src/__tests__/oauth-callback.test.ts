import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/api/client', () => ({ default: mocks }))
import { oauthShopeeCallback } from '@/api/endpoints'

describe('Shopee nonce callback', () => {
  it('forwards the nonce in the backend path with only provider query parameters', async () => {
    mocks.get.mockResolvedValue({ data: { ok: true, toko: [] } })
    await oauthShopeeCallback('shop', { nonce: 'once-only', code: 'code', shop_id: '123' })
    expect(mocks.get).toHaveBeenCalledWith('/oauth/shopee/callback/shop/once-only', {
      params: { code: 'code', shop_id: '123', main_account_id: undefined },
    })
  })
})
