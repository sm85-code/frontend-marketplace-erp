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

  it('applies the Kelola Aplikasi texts below the per-month pencil and keeps ids', () => {
    const teks = (id: string, bawaan: string) =>
      ({ 'baris:produk': 'Global kayu', 'grupsheet:pemasukan:Penjualan dan jasa': 'Global grup', 'judul:pemasukan': 'Uang masuk', 'baris:shop:Toko A': 'Tidak boleh' })[id] ?? bawaan
    const dasar: Block[] = [{ ...blocks[0], title: 'A. PEMASUKAN' }]
    const [b] = namai(dasar, emptyLembar(), teks)
    expect(b.title).toBe('A. Uang masuk')
    expect(b.lines.find(isGroup)!.tampil).toBe('Global grup')
    const baris = (bl: Block) => Object.fromEntries(bl.lines.filter((l): l is Line => !isGroup(l)).map((l) => [l.def.key, l.def.label]))
    expect(baris(b)).toEqual({ produk: 'Global kayu', 'shop:Toko A': 'Toko A' })
    const bulan = setNamaBaris(setNamaGrup(emptyLembar(), 'pemasukan', 'Penjualan dan jasa', 'Bulan ini'), 'produk', 'Penjualan produk kayu', 'Khusus bulan')
    const [c] = namai(dasar, bulan, teks)
    expect(c.lines.find(isGroup)!.tampil).toBe('Bulan ini')
    expect(baris(c).produk).toBe('Khusus bulan')
  })
})

describe('judul tabel mengikuti Kelola Aplikasi', () => {
  const dasar: Block[] = [{ title: 'A. PEMASUKAN', tabel: 'pemasukan', lines: [] }]
  const lembarKosong = emptyLembar()
  it('a renamed tab renames the heading above its table', () => {
    const t = (id: string, bawaan: string) => ({ 'tab:pemasukan': 'Uang Masuk' } as Record<string, string>)[id] ?? bawaan
    expect(namai(dasar, lembarKosong, t)[0].title).toBe('A. Uang Masuk')
  })
  it('the "Judul tabel" text wins over the tab name', () => {
    const t = (id: string, bawaan: string) => ({ 'tab:pemasukan': 'Uang Masuk', 'judul:pemasukan': 'Rincian Pemasukan' } as Record<string, string>)[id] ?? bawaan
    expect(namai(dasar, lembarKosong, t)[0].title).toBe('A. Rincian Pemasukan')
  })
  it('nothing set: the built-in title', () => {
    expect(namai(dasar, lembarKosong)[0].title).toBe('A. PEMASUKAN')
  })
})
