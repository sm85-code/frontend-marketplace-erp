import { describe, expect, it } from 'vitest'
import { kosongkanBerjalan } from '@/lib/susunLaporan'
import type { Block, Line, RowDef } from '@/lib/sheetEngine'

const def = (key: string, tabel: string, total: RowDef['total'], grup = 'g'): RowDef => ({ key, label: key, tabel, grup, kind: 'calc', total, base: () => '0' })
const line = (d: RowDef, v: (number | null)[]): Line => ({ def: d, custom: false, hidden: false, cells: v.map((value) => ({ value, manual: false })), total: null })
const days = ['2026-10-24', '2026-10-31']

describe('kosongkanBerjalan', () => {
  const blocks: Block[] = [
    { title: 'C', tabel: 'laba_rugi', lines: [line(def('laba', 'laba_rugi', 'sum'), [100, 50])] },
    { title: 'E', tabel: 'neraca', lines: [line(def('n_kas', 'neraca', 'last', 'Aset'), [10, 20]), line(def('n_laba_ini', 'neraca', 'sum', 'Ekuitas'), [100, 50])] },
    { title: 'D', tabel: 'arus_kas', lines: [line(def('akhir', 'arus_kas', 'last'), [10, 20])] },
  ]
  it('blanks the open week in Laba/Rugi and Neraca only', () => {
    const out = kosongkanBerjalan(blocks, days, [], '2026-10-27')
    const l = (b: number) => out[b].lines[0] as Line
    expect(l(0).cells[1].value).toBeNull()
    expect(l(0).total).toBe(100)
    expect(l(1).total).toBe(10)
    expect((out[1].lines[1] as Line).total).toBe(100)
    expect(out[2]).toBe(blocks[2])
  })
  it('keeps a finished month as it is', () => {
    expect(kosongkanBerjalan(blocks, days, [], '2026-11-01')).toBe(blocks)
  })
})
