import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { keyNilaiDasar, RINCI_TABEL } from './arusKasRinci'
import { setKategori } from './kategoriKeuangan'
import { ringkasDariArusKas } from './ringkasArusKas'
import { computeSheet, emptyLembar, isGroup, type Lembar, type Line } from './sheetEngine'
import { sheetSections } from './sheetSections'

const zero = { kas_utama: '0', stok: '0', kas_operasional: '0', iklan_prabayar: '0', piutang_pengiriman: '0', saldo_toko: '0', kas_gaji: '0', utang_gaji: '0', utang_usaha: '0', modal: '0', saldo_laba: '0' }
const record = {
  tanggal: '2026-10-04',
  input: { pendapatan_produk: '500', jasa_proses: '100', jasa_cat_packing: '50', bayar_tukang: '200', pembelian: '80', gaji: '40', operasional: '10', langganan: '5', topup_iklan: '25', tambahan_modal: '0' },
  hasil: {
    pemasukan_toko: '300', perubahan_piutang: '20', pemasukan: '0', pengeluaran: '0', laba: '0', kas_masuk: '950', kas_keluar: '295', transfer_antar_kas: '0',
    penyesuaian_stok: '0', penyesuaian_utang: '0', biaya_iklan: '15', saldo_awal: { ...zero, kas_utama: '1000' }, saldo_akhir: { ...zero, kas_utama: '1655' },
    neraca: { aset: '0', utang: '0', ekuitas: '0', selisih: '0' },
  },
} as unknown as Report
const days = ['2026-10-04', '2026-10-11']
const build = (lembar: Lembar = emptyLembar()) => ringkasDariArusKas(computeSheet(sheetSections({ laporan: [record] } as unknown as Overview), [record], days, lembar), days, lembar)
const val = (blocks: ReturnType<typeof build>, key: string, w = 0) => blocks.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)?.cells[w].value
const d = days[0]

describe('summarized tabs from Arus Kas', () => {
  it('components come from the Arus Kas rows filed under them', () => {
    const b = build()
    expect(val(b, 'p:saldo_toko')).toBe(300)
    expect(val(b, 'p:produk')).toBe(600)
    expect(val(b, 'p:cat')).toBe(50)
    expect(val(b, 'jml_pemasukan')).toBe(300 + 600 + 50 + 20 + 0)
    expect(val(b, 'p:tukang')).toBe(200)
    expect(val(b, 'p:non_kayu')).toBe(80)
    expect(val(b, 'p:langganan')).toBe(5)
    expect(val(b, 'p:lain_keluar')).toBe(10)
  })

  it('a top-up is not an expense; profit = income - expense', () => {
    const b = build()
    expect(val(b, 'jml_pengeluaran')).toBe(200 + 80 + 40 + 15 + 5 + 10)
    expect(val(b, 'laba')).toBe(val(b, 'jml_pemasukan')! - val(b, 'jml_pengeluaran')!)
  })

  it('moving an Arus Kas row to another category moves its figure, including when the row is split', () => {
    let lembar = setKategori(emptyLembar(), 'k_pembelian', 'Kas keluar', 'perl_packing')
    lembar.baris.push({ id: 'c:r1', tabel: RINCI_TABEL, grup: 'Kas masuk', label: 'Jasa proses' })
    lembar = setKategori(lembar, 'c:r1', 'Kas masuk', 'proses')
    lembar.sel[`${keyNilaiDasar('k_prod')}|${d}`] = '500'
    lembar.sel[`c:r1|${d}`] = '100'
    const b = build(lembar)
    expect(val(b, 'p:non_kayu')).toBe(0)
    expect(val(b, 'p:perl_packing')).toBe(80)
    expect(val(b, 'p:produk')).toBe(500)
    expect(val(b, 'p:proses')).toBe(100)
    expect(val(b, 'jml_pemasukan')).toBe(300 + 500 + 100 + 50 + 20)
  })

  it('a component with no Arus Kas row is filled by hand', () => {
    const lembar = emptyLembar()
    lembar.sel[`p:packing|${d}`] = '35'
    const b = build(lembar)
    const packing = b.flatMap((x) => x.lines).find((l): l is Line => !isGroup(l) && l.def.key === 'p:packing')!
    expect(packing.def.kind).toBe('input')
    expect(packing.cells[0]).toEqual({ value: 35, manual: true })
    expect(val(b, 'jml_pemasukan')).toBe(300 + 600 + 50 + 35 + 20)
  })

  it('salary and ads use the old figures until an Arus Kas row is filed under them', () => {
    expect(val(build(), 'gaji')).toBe(40)
    expect(val(build(), 'iklan')).toBe(15)
    const lembar = setKategori(emptyLembar(), 'k_operasional', 'Kas keluar', 'gaji')
    expect(val(build(lembar), 'gaji')).toBe(10)
  })

  it('a period without data stays empty', () => {
    expect(val(build(), 'jml_pemasukan', 1)).toBeNull()
    expect(val(build(), 'laba', 1)).toBeNull()
  })
})
