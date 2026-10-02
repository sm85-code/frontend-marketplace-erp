import { describe, expect, it } from 'vitest'
import { TRANSISI_STATUS, ikutMarketplace, labelStatus, nextActionLabel, sudahDiproses } from '@/lib/pesanan'

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

describe('marketplace-driven orders', () => {
  it('only orders with a raw marketplace status follow the marketplace', () => {
    expect(ikutMarketplace({ status_marketplace: 'READY_TO_SHIP' })).toBe(true)
    expect(ikutMarketplace({ status_marketplace: null })).toBe(false)
  })

  it('treats PROCESSED and later as already arranged', () => {
    expect(sudahDiproses({ status_marketplace: 'READY_TO_SHIP' })).toBe(false)
    expect(sudahDiproses({ status_marketplace: 'PROCESSED' })).toBe(true)
    expect(sudahDiproses({ status_marketplace: 'SHIPPED' })).toBe(true)
    expect(sudahDiproses({ status_marketplace: null })).toBe(false)
  })

  it('labels an arranged to_ship order as waiting for the courier', () => {
    expect(labelStatus({ status: 'to_ship', status_marketplace: 'READY_TO_SHIP' })).toBe('Perlu Diproses')
    expect(labelStatus({ status: 'to_ship', status_marketplace: 'PROCESSED' })).toBe('Menunggu Kurir')
    expect(labelStatus({ status: 'shipped', status_marketplace: 'SHIPPED' })).toBe('Dikirim')
  })
})
