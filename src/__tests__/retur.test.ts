import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/api/client', () => ({ default: api }))
import { daftarRetur, getRetur } from '@/api/endpoints'
import { labelRetur, nominalRetur, rentangAwalRetur, solusiRetur, validasiRentangRetur, waktuRetur } from '@/lib/retur'
beforeEach(() => vi.clearAllMocks())
it('uses 15 complete WIB days even when UTC is still the previous day', () => {
  expect(rentangAwalRetur(new Date('2026-10-07T18:00:00Z'))).toEqual({ dari: '2026-09-24', sampai: '2026-10-08' })
  expect(validasiRentangRetur('2026-10-01', '2026-10-15')).toBeNull()
  expect(validasiRentangRetur('2026-10-01', '2026-10-16')).not.toBeNull()
  expect(validasiRentangRetur('2026-10-03', '2026-10-02')).not.toBeNull()
  expect(validasiRentangRetur('2026-02-30', '2026-03-01')).not.toBeNull()
  expect(validasiRentangRetur('', '')).not.toBeNull()
})
it('keeps missing and zero refunds distinct and respects provider currency', () => {
  expect(nominalRetur(null, 'IDR')).toBe('—')
  expect(nominalRetur('0', 'IDR')).toContain('0')
  expect(nominalRetur('12.34', 'SGD')).toContain('12,34')
  expect(nominalRetur('12', null)).toContain('mata uang belum tersedia')
  expect(solusiRetur(0)).toBe('Retur barang dan refund')
  expect(solusiRetur(1)).toBe('Refund saja')
  expect(labelRetur('NEW_STATUS')).toBe('NEW_STATUS')
  expect(waktuRetur(null)).toBe('—')
  expect(waktuRetur(1791392400)).toContain('WIB')
})
it('retains shop, calendar filters, page and more flag without assuming a total', async () => {
  api.get.mockResolvedValue({ data: { items: [], halaman: 2, ada_lagi: true } })
  const params = { dari: '2026-10-01', sampai: '2026-10-15', halaman: 2 }
  const result = await daftarRetur('shop', params)
  expect(api.get).toHaveBeenCalledWith('/akun/shop/retur', { params })
  expect(result.ada_lagi).toBe(true)
  await getRetur('shop', 'ret/one')
  expect(api.get).toHaveBeenLastCalledWith('/akun/shop/retur/ret%2Fone')
})
it('passes permission errors through instead of turning them into an empty list', async () => {
  const error = new Error('error_permission (request_id: returns-id)')
  api.get.mockRejectedValue(error)
  await expect(daftarRetur('shop', { dari: '2026-10-01', sampai: '2026-10-02', halaman: 1 })).rejects.toBe(error)
})
