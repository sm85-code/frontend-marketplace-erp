import { describe, expect, it } from 'vitest'
import type { OperasionalDaftar } from '@/api/operasional'
import { isGroup, type Line } from './sheetEngine'
import { indeksMinggu, mingguBulan, susunOperasional } from './operasionalLembar'

describe('weeks of a month', () => {
  it('are Monday-Sunday weeks from the one holding the 1st, closed by their Sunday', () => {
    expect(mingguBulan('2026-10')).toEqual(['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'])
  })
  it('place a date in its week, Sunday with the week it closes', () => {
    expect(indeksMinggu('2026-10', '2026-10-01')).toBe(0)
    expect(indeksMinggu('2026-10', '2026-10-04')).toBe(0)
    expect(indeksMinggu('2026-10', '2026-10-05')).toBe(1)
    expect(indeksMinggu('2026-10', '2026-10-31')).toBe(4)
  })
})

describe('operasional as a table', () => {
  const data: OperasionalDaftar = {
    jenis: 'umum',
    periode: '2026-10',
    kategori: [{ id: 'gaji', label: 'Gaji', aktif: true }, { id: 'atk', label: 'Belanja ATK', aktif: true }],
    items: [
      { id: '1', kategori: 'gaji', tanggal: '2026-10-05', uraian: 'Gaji minggu 1', jumlah: '1000000.00' },
      { id: '2', kategori: 'gaji', tanggal: '2026-10-19', uraian: 'Gaji minggu 3', jumlah: '1000000.00' },
      { id: '3', kategori: 'atk', tanggal: '2026-10-12', uraian: 'Kertas', jumlah: '275000.00' },
    ],
    ringkasan: { per_kategori: {}, total: '2275000.00' },
    bisa_tulis: true,
  }
  const { block, item } = susunOperasional(data, 'Operasional Umum')
  const line = (key: string) => block.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)!
  it('puts each amount in the week of its date and sums per category and overall', () => {
    expect(line('1').cells.map((c) => c.value)).toEqual([null, 1000000, null, null, null])
    expect(line('jml:gaji').total).toBe(2000000)
    expect(line('jml:atk').cells[2].value).toBe(275000)
    expect(line('total').total).toBe(2275000)
    expect(line('total').cells.map((c) => c.value)).toEqual([null, 1000000, 275000, 1000000, null])
    expect(item.get('3')?.uraian).toBe('Kertas')
  })
})
