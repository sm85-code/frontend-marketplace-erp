import { describe, expect, it } from 'vitest'
import { emptyLembar, isGroup, type Block, type Line } from './sheetEngine'
import { keyGrup, namai, setNamaBaris, setNamaGrup } from './namaBaris'

const line = (key: string, label: string): Line => ({ def: { key, label, tabel: 'pemasukan', grup: 'G', kind: 'input', total: 'sum', base: () => '0' }, custom: false, hidden: false, cells: [], total: null })
const blocks: Block[] = [{ title: 'A', tabel: 'pemasukan', lines: [{ group: true, label: 'Penjualan dan jasa', tabel: 'pemasukan' }, line('produk', 'Penjualan produk kayu'), line('shop:Toko A', 'Toko A')] }]

describe('row and group names', () => {
  it('renames rows and group titles for display only, never shop rows', () => {
    let lembar = setNamaBaris(emptyLembar(), 'produk', 'Penjualan produk kayu', 'Jual kayu')
    lembar = setNamaBaris(lembar, 'shop:Toko A', 'Toko A', 'Dilarang')
    lembar = setNamaGrup(lembar, 'pemasukan', 'Penjualan dan jasa', 'Hasil jual')
    const [b] = namai(blocks, lembar)
    const g = b.lines.find(isGroup)!
    expect(g.tampil).toBe('Hasil jual')
    expect(g.label).toBe('Penjualan dan jasa')
    const names = Object.fromEntries(b.lines.filter((l): l is Line => !isGroup(l)).map((l) => [l.def.key, l.def.label]))
    expect(names).toEqual({ produk: 'Jual kayu', 'shop:Toko A': 'Toko A' })
  })

  it('restores the original name and keeps ids within the backend pattern', () => {
    const lembar = setNamaBaris(setNamaBaris(emptyLembar(), 'produk', 'Penjualan produk kayu', 'X'), 'produk', 'Penjualan produk kayu', 'Penjualan produk kayu')
    expect(lembar.baris).toEqual([])
    expect(keyGrup('arus_kas', 'Transfer antar kas')).toMatch(/^c:[\w-]{1,40}$/)
  })
})
