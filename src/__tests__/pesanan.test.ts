import { describe, expect, it } from 'vitest'
import {
  TRANSISI_STATUS,
  bisaDibatalkan,
  bisaDicetak,
  bisaDiproses,
  cocokFilterResi,
  ikutMarketplace,
  labelStatus,
  nextActionLabel,
  pdfDariBase64,
  pecahBatch,
  ringkasItem,
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
    expect(labelStatus({ status: 'to_ship', status_marketplace: 'PROCESSED' })).toBe('Menunggu Penyerahan')
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

  it('turns the joined label file from the server (base64) back into a pdf blob', async () => {
    const blob = pdfDariBase64(btoa('%PDF-1.4 isi'))
    expect(blob.type).toBe('application/pdf')
    expect(await blob.text()).toBe('%PDF-1.4 isi')
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

describe('ringkasItem', () => {
  const item = (nama_produk: string, qty: number) => ({ nama_produk, qty }) as never

  it('lists up to two products with quantity and counts the rest', () => {
    expect(ringkasItem({ items: [] })).toBe('—')
    expect(ringkasItem({ items: [item('Kursi', 2)] })).toBe('Kursi ×2')
    expect(ringkasItem({ items: [item('Kursi', 2), item('Meja', 1), item('Alas', 1), item('Rak', 3)] })).toBe(
      'Kursi ×2, Meja ×1 (+2 lainnya)',
    )
  })
})
