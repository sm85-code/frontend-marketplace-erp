import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import api, { API_BASE } from '@/api/client'
import { akunApi, authApi, listingApi, oauthApi, pesananApi, produkApi, stokApi } from '@/api/endpoints'

type Call = { method: string; url: string; params?: unknown; data?: unknown; withCredentials?: boolean }
let calls: Call[] = []

beforeEach(() => {
  calls = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push({
      method: (config.method || 'get').toUpperCase(),
      url: config.url || '',
      params: config.params,
      data: config.data ? JSON.parse(config.data as string) : undefined,
      withCredentials: config.withCredentials,
    })
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }
})

const last = () => calls[calls.length - 1]

describe('API surface matches sm85-arch marketplace_erp_router', () => {
  it('uses /api/marketplace-erp with cookie credentials', async () => {
    expect(API_BASE.endsWith('/api/marketplace-erp')).toBe(true)
    await authApi.me()
    expect(last()).toMatchObject({ method: 'GET', url: '/auth/me', withCredentials: true })
  })

  it('auth routes', async () => {
    await authApi.login({ email: 'a@b.co', password: 'x' })
    expect(last()).toMatchObject({ method: 'POST', url: '/auth/login', data: { email: 'a@b.co', password: 'x' } })
    await authApi.logout()
    expect(last()).toMatchObject({ method: 'POST', url: '/auth/logout' })
  })

  it('akun routes', async () => {
    await akunApi.list({ platform: '' })
    expect(last()).toMatchObject({ method: 'GET', url: '/akun', params: {} })
    await akunApi.list({ platform: 'shopee' })
    expect(last().params).toEqual({ platform: 'shopee' })
    await akunApi.create({ platform: 'shopee', nama_toko: 'A' })
    expect(last()).toMatchObject({ method: 'POST', url: '/akun' })
    await akunApi.update('id1', { status: 'nonaktif' })
    expect(last()).toMatchObject({ method: 'PATCH', url: '/akun/id1', data: { status: 'nonaktif' } })
    await akunApi.remove('id1')
    expect(last()).toMatchObject({ method: 'DELETE', url: '/akun/id1' })
    await akunApi.syncPesanan('id1')
    expect(last()).toMatchObject({ method: 'POST', url: '/akun/id1/sync/pesanan' })
  })

  it('oauth shopee routes', async () => {
    await oauthApi.shopeeStart('id1', 'https://fe/oauth/shopee/callback/id1')
    expect(last()).toMatchObject({
      method: 'GET',
      url: '/oauth/shopee/start',
      params: { akun_id: 'id1', redirect_uri: 'https://fe/oauth/shopee/callback/id1' },
    })
    await oauthApi.shopeeCallback('id1', { code: 'c', shop_id: '9' })
    expect(last()).toMatchObject({ method: 'GET', url: '/oauth/shopee/callback/id1', params: { code: 'c', shop_id: '9' } })
  })

  it('produk + listing routes', async () => {
    await produkApi.list()
    expect(last()).toMatchObject({ method: 'GET', url: '/produk' })
    await produkApi.update('p1', { nama: 'x' })
    expect(last()).toMatchObject({ method: 'PATCH', url: '/produk/p1' })
    await listingApi.list({ produk_id: 'p1' })
    expect(last()).toMatchObject({ method: 'GET', url: '/listing', params: { produk_id: 'p1' } })
    await listingApi.update('l1', { aktif: false })
    expect(last()).toMatchObject({ method: 'PATCH', url: '/listing/l1' })
  })

  it('stok routes', async () => {
    await stokApi.gudang()
    expect(last()).toMatchObject({ method: 'GET', url: '/gudang' })
    await stokApi.ledger({ produk_id: 'p1', limit: 50 })
    expect(last()).toMatchObject({ method: 'GET', url: '/stok/ledger', params: { produk_id: 'p1', limit: 50 } })
    await stokApi.adjust({ produk_id: 'p1', qty_delta: -2 })
    expect(last()).toMatchObject({ method: 'POST', url: '/stok/adjust', data: { produk_id: 'p1', qty_delta: -2 } })
  })

  it('pesanan routes', async () => {
    await pesananApi.list({ status: 'to_ship', platform: undefined, akun_id: '' })
    expect(last()).toMatchObject({ method: 'GET', url: '/pesanan', params: { status: 'to_ship' } })
    await pesananApi.get('o1')
    expect(last()).toMatchObject({ method: 'GET', url: '/pesanan/o1' })
    await pesananApi.ubahStatus('o1', 'shipped')
    expect(last()).toMatchObject({ method: 'POST', url: '/pesanan/o1/status', data: { status: 'shipped' } })
    await pesananApi.remove('o1')
    expect(last()).toMatchObject({ method: 'DELETE', url: '/pesanan/o1' })
  })
})
