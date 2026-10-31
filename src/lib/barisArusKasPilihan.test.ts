import { expect, test } from 'vitest'
import { barisKasKeluar, barisOtomatis, cocokOtomatis } from './barisArusKasPilihan'
import { emptyLembar } from './sheetEngine'
import { KATEGORI_BAWAAN } from '@/api/kategori'

test('auto match like Arus Kas does', () => {
  expect(cocokOtomatis('Tagihan Produk [PUDIN]', 'MAHPUDIN')).toBe(true)
  expect(cocokOtomatis('RIZKI', 'rizki')).toBe(true)
  expect(cocokOtomatis('Packing [AB]', 'ABDUL')).toBe(false)
  expect(cocokOtomatis('Operasional [UCI]', 'YUNI')).toBe(false)
})

test('lists Kas keluar rows, page categories first', () => {
  const l = emptyLembar()
  l.baris.push(
    { id: 'c:a', tabel: 'arus_rinci', grup: 'Kas keluar', label: 'Operasional [UCI]' },
    { id: 'c:b', tabel: 'arus_rinci', grup: 'Kas keluar', label: 'Tagihan Produk [YUNI]' },
    { id: 'c:kt-c_b', tabel: 'arus_rinci', grup: 'kategori', label: 'belanja_supplier' },
    { id: 'c:m', tabel: 'arus_rinci', grup: 'Kas masuk', label: 'Penjualan' },
  )
  const r = barisKasKeluar(l, KATEGORI_BAWAAN, new Set(['belanja_supplier']))
  expect(r.map((x) => x.id)).toEqual(['c:b', 'c:a'])
  expect(r[0].kategori).toBe('belanja_supplier')
})

test('includes the report rows of Kas keluar under their new names (Tukang Kayu [JOKO])', () => {
  const l = emptyLembar()
  l.baris.push({ id: 'c:nm-k_tukang', tabel: 'arus_rinci', grup: 'nama', label: 'Tukang Kayu [JOKO]' }, { id: 'c:kt-k_tukang', tabel: 'arus_rinci', grup: 'kategori', label: 'tukang' })
  const arus = { title: 'x', tabel: 'arus_kas', lines: [{ group: true, label: 'Kas keluar', tabel: 'arus_kas' }, { def: { key: 'k_tukang', label: 'Tukang', tabel: 'arus_kas', grup: 'Kas keluar', kind: 'input', total: 'sum', base: () => '0' }, custom: false, hidden: false, cells: [], total: null }] } as unknown as Parameters<typeof barisKasKeluar>[3]
  const r = barisKasKeluar(l, KATEGORI_BAWAAN, new Set(['tukang']), arus)
  expect(r[0]).toMatchObject({ id: 'k_tukang', nama: 'Tukang Kayu [JOKO]', kategori: 'tukang' })
  expect(cocokOtomatis(r[0].nama, 'JOKO WAHYONO')).toBe(true)
})

test('automatic row prefers an exact name', () => {
  const rows = [{ nama: 'Tukang Kayu [YONO]' }, { nama: 'Tukang Kayu [JOKO]' }]
  expect(barisOtomatis(rows, 'JOKO')?.nama).toBe('Tukang Kayu [JOKO]')
  expect(barisOtomatis(rows, 'CAHYONO')?.nama).toBe('Tukang Kayu [YONO]')
  expect(barisOtomatis(rows, 'SURYAMAN')).toBeUndefined()
})

test('whole-word JOKO beats YONO inside WAHYONO regardless of row order', () => {
  const rows = [{ nama: 'Tukang [YONO]' }, { nama: 'Tukang [JOKO]' }, { nama: 'Tukang [NUR]' }, { nama: 'Tukang [AYI]' }]
  for (const pilihan of [rows, [...rows].reverse()]) {
    expect(barisOtomatis(pilihan, ' JOKO   WAHYONO ')?.nama).toBe('Tukang [JOKO]')
    expect(barisOtomatis(pilihan, 'CAHYONO')?.nama).toBe('Tukang [YONO]')
    expect(barisOtomatis(pilihan, 'AHMAD NUR ALIM')?.nama).toBe('Tukang [NUR]')
    expect(barisOtomatis(pilihan, 'Tukang [AYI]')?.nama).toBe('Tukang [AYI]')
  }
})
