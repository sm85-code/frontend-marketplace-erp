import { describe, expect, it } from 'vitest'
import {
  TRANSISI_STATUS,
  bisaDibatalkan,
  bisaDicetak,
  bisaDiproses,
  cocokFilterResi,
  ikutMarketplace,
  kelompokResi,
  labelStatus,
  nextActionLabel,
  pecahBatch,
  sudahDicetak,
  sudahDiproses,
} from '@/lib/pesanan'

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

describe('bulk actions and cancel', () => {
  it('only pulled to_ship orders that are not arranged yet can be processed', () => {
    expect(bisaDiproses({ status: 'to_ship', status_marketplace: 'READY_TO_SHIP' })).toBe(true)
    expect(bisaDiproses({ status: 'to_ship', status_marketplace: 'PROCESSED' })).toBe(false)
    expect(bisaDiproses({ status: 'shipped', status_marketplace: 'SHIPPED' })).toBe(false)
    expect(bisaDiproses({ status: 'to_ship', status_marketplace: null })).toBe(false)
  })

  it('can cancel before shipment only', () => {
    expect(bisaDibatalkan({ status: 'to_ship', status_marketplace: 'READY_TO_SHIP' })).toBe(true)
    expect(bisaDibatalkan({ status: 'to_ship', status_marketplace: 'PROCESSED' })).toBe(true)
    expect(bisaDibatalkan({ status: 'unpaid', status_marketplace: 'UNPAID' })).toBe(true)
    expect(bisaDibatalkan({ status: 'shipped', status_marketplace: 'SHIPPED' })).toBe(false)
    expect(bisaDibatalkan({ status: 'to_ship', status_marketplace: null })).toBe(false)
  })

  it('splits ids into batches', () => {
    expect(pecahBatch([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(pecahBatch([], 10)).toEqual([])
  })
})

describe('printing labels in bulk', () => {
  it('only arranged orders that still wait for the courier can be printed', () => {
    expect(bisaDicetak({ status: 'to_ship', status_marketplace: 'PROCESSED' })).toBe(true)
    expect(bisaDicetak({ status: 'to_ship', status_marketplace: 'READY_TO_SHIP' })).toBe(false)
    expect(bisaDicetak({ status: 'shipped', status_marketplace: 'SHIPPED' })).toBe(false)
    expect(bisaDicetak({ status: 'to_ship', status_marketplace: null })).toBe(false)
  })

  it('splits a selection per shop and courier, and by the 50 label limit', () => {
    const p = (id: string, akun: string, kurir: string | null) => ({ id, akun_id: akun, kurir })
    const grup = kelompokResi([p('1', 'a', 'J&T'), p('2', 'a', ' j&t '), p('3', 'a', 'JNE'), p('4', 'b', 'J&T')])
    expect(grup.map((g) => g.map((x) => x.id))).toEqual([['1', '2'], ['3'], ['4']])
    const banyak = Array.from({ length: 120 }, (_, i) => p(String(i), 'a', 'J&T'))
    expect(kelompokResi(banyak).map((g) => g.length)).toEqual([50, 50, 20])
  })
})

describe('printed-label mark', () => {
  const siap = { status: 'to_ship' as const, status_marketplace: 'PROCESSED' }

  it('knows whether a label was printed', () => {
    expect(sudahDicetak({ resi_dicetak_at: '2026-10-02T09:00:00Z' })).toBe(true)
    expect(sudahDicetak({ resi_dicetak_at: null })).toBe(false)
    expect(sudahDicetak({})).toBe(false) // older backend without the field
  })

  it('filters printable orders by printed state', () => {
    const belum = { ...siap, resi_dicetak_at: null }
    const sudah = { ...siap, resi_dicetak_at: '2026-10-02T09:00:00Z' }
    const kirim = { status: 'shipped' as const, status_marketplace: 'SHIPPED', resi_dicetak_at: null }
    expect(cocokFilterResi(belum, 'belum')).toBe(true)
    expect(cocokFilterResi(sudah, 'belum')).toBe(false)
    expect(cocokFilterResi(sudah, 'sudah')).toBe(true)
    expect(cocokFilterResi(kirim, 'belum')).toBe(false) // not printable at all
    expect(cocokFilterResi(kirim, 'semua')).toBe(true)
  })
})
