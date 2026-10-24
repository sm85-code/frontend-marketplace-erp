import { describe, expect, it } from 'vitest'
import { kapitalManual } from './processing'
import type { ProcessingPrice } from './processing'

describe('kapitalManual', () => {
  const base = { id: 'x', version: 0, produk: 'sasag', sku: 'ab-1', ukuran: '80x40', harga: '1', catatan: 'catatan' } as ProcessingPrice
  it('uppercases manual catalog text including variants', () => {
    const r = kapitalManual({ ...base, kind: 'non_kayu', varian: [{ nama: 'Ukuran', nilai: '80x40' }] })
    expect([r.produk, r.sku, r.ukuran, r.catatan]).toEqual(['SASAG', 'AB-1', '80X40', 'CATATAN'])
    expect(r.varian).toEqual([{ nama: 'UKURAN', nilai: '80X40' }])
  })
  it('leaves other catalogs as typed', () => {
    expect(kapitalManual({ ...base, kind: 'produksi' }).produk).toBe('sasag')
  })
})
