import { expect, test } from 'vitest'
import { geser, keyUrut, urutkanKasKeluar } from './urutArusKas'
import { emptyLembar, type Block, type Line } from './sheetEngine'
import { KATEGORI_BAWAAN } from '@/api/kategori'

const ln = (key: string, extra: Partial<Line['def']> = {}): Line => ({ def: { key, label: key, tabel: 'arus_kas', grup: 'Kas keluar', kind: 'input', total: 'sum', base: () => '0', ...extra }, custom: true, hidden: false, cells: [{ value: 1, manual: false }], total: 1 })
const blok = (): Block => ({ title: 'x', tabel: 'arus_kas', lines: [{ group: true, label: 'Kas keluar', tabel: 'arus_kas' }, ln('c:a'), ln('c:a1', { induk: 'c:a' }), ln('c:b'), ln('c:c'), ln('kas_keluar', { emphasis: true })] } as Block)
const kat = (l: ReturnType<typeof emptyLembar>, id: string, k: string) => l.baris.push({ id: `c:kt-${id.replace(/[^\w-]/g, '_')}`, tabel: 'arus_rinci', grup: 'kategori', label: k })
const keys = (b: Block) => b.lines.flatMap((l) => ('def' in l ? [l.def.key] : []))

test('category order, then own order; sub-rows stay; figures unchanged', () => {
  const l = emptyLembar()
  kat(l, 'c:a', 'tukang'); kat(l, 'c:b', 'belanja_supplier'); kat(l, 'c:c', 'belanja_supplier')
  const ord = KATEGORI_BAWAAN.filter((k) => k.arah === 'keluar').sort((a, b) => a.urut - b.urut).map((k) => k.id)
  const first = ord.indexOf('belanja_supplier') < ord.indexOf('tukang')
  const b = urutkanKasKeluar(blok(), l, KATEGORI_BAWAAN)
  expect(keys(b)).toEqual(first ? ['c:b', 'c:c', 'c:a', 'c:a1', 'kas_keluar'] : ['c:a', 'c:a1', 'c:b', 'c:c', 'kas_keluar'])
  expect(b.lines.length).toBe(blok().lines.length)
  const moved = geser(b, l, KATEGORI_BAWAAN, 'c:c', -1)!
  expect(moved.baris.find((x) => x.id === keyUrut('c:c'))?.label).toBe('1')
  const b2 = urutkanKasKeluar(blok(), moved, KATEGORI_BAWAAN)
  expect(keys(b2).indexOf('c:c')).toBeLessThan(keys(b2).indexOf('c:b'))
  expect(geser(b2, moved, KATEGORI_BAWAAN, 'c:c', -1)).toBeNull()
})
