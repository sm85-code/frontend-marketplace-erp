import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { keyKategori, keyNilaiDasar, RINCI_TABEL } from './arusKasRinci'
import { kategoriRincian, setKategori } from './kategoriKeuangan'
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

  describe('category per sub-row (1.1, 1.2, ...)', () => {
    const dua = () => {
      const lembar = emptyLembar()
      lembar.baris.push({ id: 'c:a', tabel: RINCI_TABEL, grup: 'anak:k_prod', label: 'Penjualan' }, { id: 'c:b', tabel: RINCI_TABEL, grup: 'anak:k_prod', label: 'Jasa cat' })
      lembar.sel[`c:a|${d}`] = '400'
      lembar.sel[`c:b|${d}`] = '200'
      return lembar
    }

    it('sub-rows follow their row until one picks another category, and the total never changes', () => {
      const before = build(dua())
      expect(val(before, 'p:produk')).toBe(600)
      expect(val(before, 'p:cat')).toBe(50)
      const after = build(setKategori(dua(), 'c:b', 'Kas masuk', 'cat', 'produk'))
      expect(val(after, 'p:produk')).toBe(400) // 1.1 stays under the row's category
      expect(val(after, 'p:cat')).toBe(250) // 1.2 moved: 200 + the 50 of the other row
      expect(val(after, 'jml_pemasukan')).toBe(val(before, 'jml_pemasukan'))
    })

    it('one row can feed two components at once, in either order of the sub-rows', () => {
      let lembar = setKategori(dua(), 'c:a', 'Kas masuk', 'saldo_toko', 'produk')
      lembar = setKategori(lembar, 'c:b', 'Kas masuk', 'proses', 'produk')
      const b = build(lembar)
      expect(val(b, 'p:saldo_toko')).toBe(300 + 400)
      expect(val(b, 'p:proses')).toBe(200)
      expect(val(b, 'p:produk')).toBe(0)
    })

    it('changing the row category moves the sub-rows that have no choice of their own', () => {
      const b = build(setKategori(dua(), 'k_prod', 'Kas masuk', 'cat'))
      expect(val(b, 'p:produk')).toBe(0)
      expect(val(b, 'p:cat')).toBe(50 + 600)
    })

    it('a sub-row shows its own category, else its row\'s; choosing the row\'s again drops the choice', () => {
      const own = setKategori(dua(), 'c:b', 'Kas masuk', 'cat', 'produk')
      expect(kategoriRincian(own, 'c:a', 'k_prod', 'Kas masuk')).toBe('produk')
      expect(kategoriRincian(own, 'c:b', 'k_prod', 'Kas masuk')).toBe('cat')
      const back = setKategori(own, 'c:b', 'Kas masuk', 'produk', 'produk')
      expect(back.baris.some((x) => x.id === keyKategori('c:b'))).toBe(false)
    })

    it('works for cash out too', () => {
      const lembar = emptyLembar()
      lembar.baris.push({ id: 'c:x', tabel: RINCI_TABEL, grup: 'anak:k_pembelian', label: 'Cat' }, { id: 'c:y', tabel: RINCI_TABEL, grup: 'anak:k_pembelian', label: 'Kardus' })
      lembar.sel[`c:x|${d}`] = '30'
      lembar.sel[`c:y|${d}`] = '50'
      const b = build(setKategori(lembar, 'c:y', 'Kas keluar', 'perl_packing', 'non_kayu'))
      expect(val(b, 'p:non_kayu')).toBe(30)
      expect(val(b, 'p:perl_packing')).toBe(50)
    })
  })

  it('the two combined categories feed their own components, hidden until a row is filed under them', () => {
    const before = build()
    const hidden = (blocks: ReturnType<typeof build>, key: string) => blocks.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)?.hidden
    expect(hidden(before, 'p:produk_proses')).toBe(true)
    expect(hidden(before, 'p:cat_packing')).toBe(true)
    let lembar = setKategori(emptyLembar(), 'k_prod', 'Kas masuk', 'produk_proses')
    lembar = setKategori(lembar, 'k_cat', 'Kas masuk', 'cat_packing')
    const b = build(lembar)
    expect(val(b, 'p:produk_proses')).toBe(600)
    expect(val(b, 'p:cat_packing')).toBe(50)
    expect(val(b, 'p:produk')).toBe(0)
    expect(val(b, 'p:cat')).toBe(0)
    expect(hidden(b, 'p:produk_proses')).toBe(false)
    expect(val(b, 'jml_pemasukan')).toBe(val(before, 'jml_pemasukan')) // the same money, filed under other components
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

  it('the balance sheet takes cash from Arus Kas and profit from Laba/Rugi, and the balance check follows', () => {
    const b = build()
    expect(val(b, 'n_kas')).toBe(val(b, 'akhir'))
    expect(val(b, 'n_laba_ini')).toBe(val(b, 'laba'))
    const [aset, utang, ekuitas] = ['jml_aset', 'jml_utang', 'jml_ekuitas'].map((k) => val(b, k)!)
    expect(val(b, 'selisih')).toBe(aset - utang - ekuitas)
    expect(val(b, 'jml_kew_ekuitas')).toBe(utang + ekuitas)
  })

  it('editing a cash row changes cash and the balance check, and profit carries into the next period', () => {
    const lembar = emptyLembar()
    lembar.sel[`${keyNilaiDasar('k_toko')}|${d}`] = '1300'
    const base = build()
    const b = build(lembar)
    expect(val(b, 'n_kas')).toBe(val(base, 'n_kas')! + 1000)
    expect(val(b, 'n_laba_ini')).toBe(val(base, 'n_laba_ini')! + 1000)
    const second = emptyLembar()
    second.sel[`${keyNilaiDasar('k_toko')}|${days[1]}`] = '1'
    const c = build(second)
    expect(val(c, 'n_laba_lalu', 1)).toBe(val(c, 'n_laba_lalu', 0)! + val(c, 'n_laba_ini', 0)!)
  })
})
