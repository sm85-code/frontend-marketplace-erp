import { afterEach, expect, it, vi } from 'vitest'
import { muatSaldoEasyBoss } from './saldoEasyBoss'
import api from './client'
vi.mock('./client', () => ({ default: { get: vi.fn() } }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

it('continues past loading responses until actual rows are available', async () => {
  vi.useFakeTimers()
  vi.mocked(api.get).mockResolvedValueOnce({ data: { loading: true } }).mockResolvedValueOnce({ data: { loading: true } }).mockResolvedValueOnce({ data: { jumlah: 33, pesanan: ['real-data'] } })
  const result = muatSaldoEasyBoss({}, undefined, 1000, 10)
  await vi.advanceTimersByTimeAsync(20)
  expect(await result).toEqual({ jumlah: 33, pesanan: ['real-data'] })
  expect(api.get).toHaveBeenCalledTimes(3)
})

it('finishes perpetual loading with an actionable error', async () => {
  vi.useFakeTimers()
  vi.mocked(api.get).mockResolvedValue({ data: { loading: true } })
  const check = expect(muatSaldoEasyBoss({}, undefined, 50, 10)).rejects.toThrow('Silakan coba lagi')
  await vi.advanceTimersByTimeAsync(51)
  await check
})

it('stops polling on API error and on navigation cancellation', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error('Sesi kedaluwarsa'))
  await expect(muatSaldoEasyBoss({})).rejects.toThrow('Sesi kedaluwarsa')
  expect(api.get).toHaveBeenCalledTimes(1)
  vi.mocked(api.get).mockResolvedValue({ data: { loading: true } })
  const controller = new AbortController()
  const result = muatSaldoEasyBoss({}, controller.signal)
  const check = expect(result).rejects.toThrow('dibatalkan')
  await Promise.resolve()
  controller.abort()
  await check
})
