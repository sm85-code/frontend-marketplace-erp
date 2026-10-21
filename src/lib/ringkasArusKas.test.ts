import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { keyKategori, keyNilaiDasar, RINCI_TABEL } from './arusKasRinci'
import { kategoriRincian, setKategori } from './kategoriKeuangan'
import { KATEGORI_BAWAAN, KELOMPOK_BAWAAN, type KategoriTransaksi, type KelompokDaftar } from '@/api/kategori'
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

describe('editable categories', () => {
  const dengan = (ubah: (k: KategoriTransaksi[]) => KategoriTransaksi[], lembar: Lembar = emptyLembar()) => {
    const daftar = ubah(KATEGORI_BAWAAN.map((k) => ({ ...k })))
    return ringkasDariArusKas(computeSheet(sheetSections({ laporan: [record] } as unknown as Overview), [record], days, lembar), days, lembar, daftar)
  }
  it('a renamed category keeps its figures under the new name', () => {
    const b = dengan((k) => k.map((x) => (x.id === 'tukang' ? { ...x, nama: 'Upah tukang kayu' } : x)))
    const baris = b.flatMap((x) => x.lines).find((l): l is Line => !isGroup(l) && l.def.key === 'p:tukang')
    expect(baris?.def.label).toBe('Upah tukang kayu')
    expect(baris?.cells[0].value).toBe(200)
  })
  it('a new category lands in the group chosen for it and takes rows filed under it', () => {
    const baru: KategoriTransaksi = { ...KATEGORI_BAWAAN[0], id: 'sewa', arah: 'keluar', nama: 'Sewa', kelompok: 'Beban operasional', kelompok_id: 'beban', urut: 99, sistem: false, auto_sembunyi: true }
    const lembar = setKategori(emptyLembar(), 'k_pembelian', 'Kas keluar', 'sewa', 'non_kayu')
    const b = dengan((k) => [...k, baru], lembar)
    expect(val(b, 'p:sewa')).toBe(80)
    expect(val(b, 'p:non_kayu')).toBe(0)
  })
  it('a saved `bukan` still means "not an expense" and is kept out of the figures', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: keyKategori('k_operasional'), tabel: RINCI_TABEL, grup: 'kategori', label: 'bukan' })
    expect(val(dengan((k) => k, lembar), 'p:lain_keluar')).toBe(0)
  })
})

describe('salary as a cash-out and transfers to the operational cash accounts', () => {
  const baru = {
    ...record,
    input: { ...record.input, transfer_ke_ops_packing: '50' },
    hasil: { ...record.hasil, kas_keluar: '335', kas_keluar_gaji: '40', transfer_antar_kas: '-50', saldo_akhir: { ...zero, kas_utama: '1500', kas_operasional: '50' } },
  } as unknown as Report
  const make = (r: Report) => ringkasDariArusKas(computeSheet(sheetSections({ laporan: [r] } as unknown as Overview), [r], days, emptyLembar()), days, emptyLembar())
  it('shows salary under Kas keluar and the transfer to the packing cash, and the profit side still carries salary once', () => {
    const b = make(baru)
    expect(val(b, 'k_gaji')).toBe(40)
    expect(val(b, 'tr_packing')).toBe(-50)
    expect(val(b, 'n_kas_ops')).toBe(50)
    expect(val(b, 'gaji')).toBe(40)
    expect(val(b, 'jml_pengeluaran')).toBe(200 + 80 + 40 + 15 + 5 + 10)
  })
  it('reports saved before keep their salary expense and show no salary cash-out', () => {
    const b = make(record)
    expect(val(b, 'k_gaji')).toBe(0)
    expect(val(b, 'gaji')).toBe(40)
    expect(val(b, 'jml_pengeluaran')).toBe(200 + 80 + 40 + 15 + 5 + 10)
  })
  it('kas gaji and utang gaji in the balance sheet follow the Gaji row typed in Arus Kas, and the sheet still balances', () => {
    const base = make(baru)
    const lembar = emptyLembar()
    lembar.sel[`${keyNilaiDasar('k_gaji')}|${days[0]}`] = '100'
    const typed = ringkasDariArusKas(computeSheet(sheetSections({ laporan: [baru] } as unknown as Overview), [baru], days, lembar), days, lembar)
    expect(val(typed, 'k_gaji')).toBe(100)
    expect(val(typed, 'n_kas_gaji')).toBe(val(base, 'n_kas_gaji')! + 60)
    expect(val(typed, 'n_utang_gaji')).toBe(val(base, 'n_utang_gaji')! + 60)
    expect(val(typed, 'gaji')).toBe(100)
    expect(val(typed, 'selisih')).toBe(val(base, 'selisih'))
  })
  it('a report closed before the salary was listed under Kas keluar shows it there, with the same closing cash', () => {
    const lama = {
      ...record,
      input: { ...record.input, transfer_kas_gaji: '40' },
      hasil: { ...record.hasil, kas_keluar: '295', transfer_antar_kas: '-40' },
    } as unknown as Report
    const b = make(lama)
    expect(val(b, 'k_gaji')).toBe(40)
    expect(val(b, 'kas_keluar')).toBe(200 + 80 + 10 + 5 + 40 + 25) // the rows add up, gaji included
    expect(val(b, 'transfer')).toBe(0)
    expect(b.flatMap((x) => x.lines).some((l) => !isGroup(l) && l.def.key === 'tr_gaji')).toBe(false)
  })
})

describe('groups with ids', () => {
  const dengan = (kelompok: KelompokDaftar, daftar: KategoriTransaksi[] = KATEGORI_BAWAAN) =>
    ringkasDariArusKas(computeSheet(sheetSections({ laporan: [record] } as unknown as Overview), [record], days, emptyLembar()), days, emptyLembar(), daftar, kelompok)
  const grup = (b: ReturnType<typeof build>, tabel: string) => b.find((x) => x.tabel === tabel)!.lines.filter(isGroup)
  it('a renamed group shows its new name and keeps the identity saved sheets know it by', () => {
    const k = { ...KELOMPOK_BAWAAN, keluar: [{ id: 'hpp', nama: 'Biaya langsung' }, KELOMPOK_BAWAAN.keluar[1]] }
    const g = grup(dengan(k), 'pengeluaran')
    expect(g[0].label).toBe('Harga pokok penjualan')
    expect(g[0].tampil).toBe('Biaya langsung')
  })
  it('a group added by the user takes the categories placed in it, and its figures count in the total', () => {
    const k = { ...KELOMPOK_BAWAAN, keluar: [...KELOMPOK_BAWAAN.keluar, { id: 'kel_lain', nama: 'Biaya lain' }] }
    const daftar = KATEGORI_BAWAAN.map((c) => (c.id === 'langganan' ? { ...c, kelompok: 'Biaya lain', kelompok_id: 'kel_lain' } : c))
    const b = dengan(k, daftar)
    const g = grup(b, 'pengeluaran')
    expect(g.at(-1)).toMatchObject({ label: 'kel:kel_lain', tampil: 'Biaya lain' })
    expect(val(b, 'jml_pengeluaran')).toBe(200 + 80 + 40 + 15 + 5 + 10)
  })
})

