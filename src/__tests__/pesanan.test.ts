import { describe, expect, it } from 'vitest'
import { TRANSISI_STATUS, nextActionLabel } from '@/lib/pesanan'

describe('TRANSISI_STATUS', () => {
  it('mirrors the backend linear pipeline (no path back from completed/cancelled)', () => {
    expect(TRANSISI_STATUS.unpaid).toEqual(['to_ship', 'cancelled'])
    expect(TRANSISI_STATUS.to_ship).toEqual(['shipped', 'cancelled'])
    expect(TRANSISI_STATUS.shipped).toEqual(['completed'])
    expect(TRANSISI_STATUS.completed).toEqual([])
    expect(TRANSISI_STATUS.cancelled).toEqual([])
  })
})

describe('nextActionLabel', () => {
  it('returns the next pipeline step for unpaid/to_ship/shipped', () => {
    expect(nextActionLabel('unpaid')).toEqual({ to: 'to_ship', label: 'Konfirmasi & Proses' })
    expect(nextActionLabel('to_ship')).toEqual({ to: 'shipped', label: 'Kirim' })
    expect(nextActionLabel('shipped')).toEqual({ to: 'completed', label: 'Selesaikan' })
  })

  it('returns null for terminal statuses', () => {
    expect(nextActionLabel('completed')).toBeNull()
    expect(nextActionLabel('cancelled')).toBeNull()
  })
})
