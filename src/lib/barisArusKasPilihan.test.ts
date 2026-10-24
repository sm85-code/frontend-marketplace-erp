import { expect, test } from 'vitest'
import { barisKasKeluar, cocokOtomatis } from './barisArusKasPilihan'
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
