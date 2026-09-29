import { describe, expect, it } from 'vitest'
import { getApiError, isPublicPath, resolveBackendOrigin } from '@/api/client'
import { cleanParams } from '@/api/endpoints'
import { fmtRp, fmtSignedQty, parseMoney } from '@/lib/format'
import { buildShopeeRedirectUri, parseShopeeCallback } from '@/lib/oauth'
import { CHANGE_PASSWORD_PATH, forcedPasswordRedirect, safeNext } from '@/lib/redirect'

describe('resolveBackendOrigin', () => {
  it('strips trailing slashes and /api or /api/marketplace-erp suffixes', () => {
    expect(resolveBackendOrigin('https://be.example.com/', 'x')).toBe('https://be.example.com')
    expect(resolveBackendOrigin('https://be.example.com/api', 'x')).toBe('https://be.example.com')
    expect(resolveBackendOrigin('https://be.example.com/api/marketplace-erp/', 'x')).toBe('https://be.example.com')
  })
  it('falls back to the page origin when empty', () => {
    expect(resolveBackendOrigin('', 'http://localhost:3000')).toBe('http://localhost:3000')
    expect(resolveBackendOrigin(undefined, 'http://localhost:3000')).toBe('http://localhost:3000')
  })
})

describe('getApiError', () => {
  it('reads FastAPI string detail', () => {
    expect(getApiError({ response: { data: { detail: 'Email atau password salah' } } })).toBe('Email atau password salah')
  })
  it('joins pydantic validation errors with field paths', () => {
    const err = { response: { data: { detail: [{ loc: ['body', 'email'], msg: 'invalid' }] } } }
    expect(getApiError(err)).toBe('email: invalid')
  })
  it('explains network / CORS failures', () => {
    expect(getApiError({ message: 'Network Error' })).toMatch(/CORS/)
  })
})

describe('misc helpers', () => {
  it('cleanParams drops empty values', () => {
    expect(cleanParams({ a: '', b: undefined, c: 'x', d: 0 })).toEqual({ c: 'x', d: 0 })
  })
  it('isPublicPath', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/oauth/shopee/callback/abc')).toBe(true)
    expect(isPublicPath('/pesanan')).toBe(false)
  })
  it('safeNext blocks open redirects', () => {
    expect(safeNext('/stok')).toBe('/stok')
    expect(safeNext(encodeURIComponent('/pesanan?status=unpaid'))).toBe('/pesanan?status=unpaid')
    expect(safeNext('https://evil.com')).toBe('/pesanan')
    expect(safeNext('//evil.com')).toBe('/pesanan')
    expect(safeNext('/login')).toBe('/pesanan')
    expect(safeNext(null)).toBe('/pesanan')
  })
  it('money formatting handles Decimal strings', () => {
    expect(parseMoney('15000.50')).toBe(15000.5)
    expect(fmtRp('15000.50')).toBe(`Rp ${(15001).toLocaleString('id-ID')}`)
    expect(fmtRp(null)).toBe('Rp 0')
    expect(fmtSignedQty(3)).toBe('+3')
    expect(fmtSignedQty(-2)).toBe('-2')
  })
})

describe('Shopee OAuth helpers', () => {
  it('builds FE callback redirect with akun id', () => {
    expect(buildShopeeRedirectUri('https://erp.example.com/', 'abc-1')).toBe(
      'https://erp.example.com/oauth/shopee/callback/abc-1',
    )
  })
  it('parses code + shop_id', () => {
    expect(parseShopeeCallback('?code=xyz&shop_id=123')).toEqual({ code: 'xyz', shop_id: '123' })
  })
  it('reports missing params / merchant auth', () => {
    expect(parseShopeeCallback('?shop_id=1')).toHaveProperty('error')
    expect(parseShopeeCallback('?code=a')).toHaveProperty('error')
    const merchant = parseShopeeCallback('?code=a&main_account_id=9')
    expect('error' in merchant && merchant.error).toMatch(/main_account_id/)
  })
})

describe('forcedPasswordRedirect', () => {
  it('does nothing for users without the flag', () => {
    expect(forcedPasswordRedirect(null, '/stok')).toBeNull()
    expect(forcedPasswordRedirect({}, '/stok')).toBeNull()
    expect(forcedPasswordRedirect({ must_change_password: false }, '/stok')).toBeNull()
  })

  it('pins flagged users to the Ganti Password page, keeping ?next=', () => {
    const u = { must_change_password: true }
    expect(forcedPasswordRedirect(u, '/stok', '?produk_id=1')).toBe(
      `${CHANGE_PASSWORD_PATH}?next=${encodeURIComponent('/stok?produk_id=1')}`,
    )
    expect(forcedPasswordRedirect(u, '/')).toBe(CHANGE_PASSWORD_PATH)
    expect(forcedPasswordRedirect(u, CHANGE_PASSWORD_PATH)).toBeNull()
  })

  it('round-trips through safeNext', () => {
    const target = forcedPasswordRedirect({ must_change_password: true }, '/pesanan', '?status=unpaid')!
    const next = new URL(target, 'http://x').searchParams.get('next')
    expect(safeNext(next)).toBe('/pesanan?status=unpaid')
  })
})
