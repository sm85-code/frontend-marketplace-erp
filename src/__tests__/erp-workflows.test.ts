import { describe, expect, it } from 'vitest'
import { listingModels, modelLabel, reachableAttributes } from '@/lib/publication'
import { panduanUntuk } from '@/lib/panduan'
import { NAV } from '@/config/nav'
import type { AttributeNode } from '@/api/workflows'
describe('publication variant mapping', () => {
  const tiers = [
    { name: 'Warna', options: [{ option: 'Merah' }, { option: 'Biru' }] },
    { name: 'Ukuran', options: [{ option: 'S' }, { option: 'L' }] },
  ]
  it('creates exactly the cartesian combinations with zero stock and distinct labels', () => {
    const models = listingModels(tiers, [], '123')
    expect(models.map((m) => m.tier_index)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ])
    expect(models.every((m) => m.stock === 0)).toBe(true)
    expect(modelLabel(tiers, [1, 0])).toBe('Warna: Biru · Ukuran: S')
  })
  it('does not silently truncate over 50 combinations', () => {
    expect(() => listingModels([{ name: 'A', options: Array.from({ length: 51 }, (_, i) => ({ option: String(i) })) }], [], '123')).toThrow(
      '50',
    )
  })
  it('removes stale conditional children after a parent selection changes', () => {
    const nodes: AttributeNode[] = [
      {
        attribute_id: 1,
        name: 'Bahan',
        mandatory: true,
        attribute_value_list: [
          {
            value_id: 10,
            name: 'Kayu',
            child_attribute_list: [{ attribute_id: 2, name: 'Jenis kayu', mandatory: true, attribute_value_list: [] }],
          },
          { value_id: 11, name: 'Besi' },
        ],
      },
    ]
    const values = [
      { attribute_id: 1, attribute_value_list: [{ value_id: 11, original_value_name: 'Besi' }] },
      { attribute_id: 2, attribute_value_list: [{ value_id: 0, original_value_name: 'Jati' }] },
    ]
    expect(reachableAttributes(nodes, values).map((a) => a.attribute_id)).toEqual([1])
  })
})
describe('beginner help', () => {
  it('covers every menu and prefers specific features over parent guidance', () => {
    for (const nav of NAV) expect(panduanUntuk(nav.to)?.langkah.length).toBeGreaterThan(0)
    expect(panduanUntuk('/pesanan/retur')?.judul).toBe('Retur & Refund')
    expect(panduanUntuk('/pesanan/123')?.judul).toBe('Detail Pesanan')
    expect(panduanUntuk('/katalog/publikasi')?.judul).toBe('Buat / Salin Produk')
  })
})
