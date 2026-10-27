import { kunciKasKecil } from '@/lib/operasionalArusKas'
import { describe, expect, it } from 'vitest'
import { KATEGORI_BAWAAN } from '@/api/kategori'
import type { Overview, Report } from '@/api/financialReports'
import { applyRinci, keyNilaiDasar, RINCI_TABEL } from './arusKasRinci'
import { setKategori } from './kategoriKeuangan'
import { denganOperasional, indeksPeriode } from './operasionalArusKas'
import { ringkasDariArusKas } from './ringkasArusKas'
import { computeSheet, emptyLembar, isGroup, type Lembar, type Line } from './sheetEngine'
import { sheetSections } from './sheetSections'

const zero = { kas_utama: '0', stok: '0', kas_operasional: '0', iklan_prabayar: '0', piutang_pengiriman: '0', saldo_toko: '0', kas_gaji: '0', utang_gaji: '0', utang_usaha: '0', modal: '0', saldo_laba: '0' }
const record = (tanggal: string) =>
  ({
    tanggal,
    input: { pendapatan_produk: '0', jasa_proses: '0', jasa_cat_packing: '0', bayar_tukang: '0', pembelian: '0', gaji: '0', operasional: '100', langganan: '5', topup_iklan: '0', tambahan_modal: '0' },
    hasil: {
      pemasukan_toko: '1000', perubahan_piutang: '0', pemasukan: '0', pengeluaran: '0', laba: '0', kas_masuk: '1000', kas_keluar: '105', transfer_antar_kas: '0',
      penyesuaian_stok: '0', penyesuaian_utang: '0', biaya_iklan: '0', saldo_awal: { ...zero, kas_utama: '1000' }, saldo_akhir: { ...zero, kas_utama: '1895' },
      neraca: { aset: '0', utang: '0', ekuitas: '0', selisih: '0' },
    },
  }) as unknown as Report
const days = ['2026-10-04', '2026-10-11']
const records = [record(days[0]), record(days[1])]
const data = { laporan: records } as unknown as Overview
const items = [
  { tanggal: '2026-10-05', kategori: 'atk', jumlah: '150.00' },
  { tanggal: '2026-10-11', kategori: 'atk', jumlah: '25.00' },
  { tanggal: '2026-10-06', kategori: 'langganan', jumlah: '40.00' },
  { tanggal: '2026-10-02', kategori: 'gaji', jumlah: '999.00' },
]
const sheet = (l: Lembar) => computeSheet(sheetSections(data), records, days, l)
const arusDari = (l: Lembar) => sheet(l).find((b) => b.tabel === 'arus_kas')!
const pakai = (l: Lembar) => denganOperasional(l, days, items, KATEGORI_BAWAAN, arusDari(l))

/** A row A the user made, broken down into 1.1 (filed under Belanja ATK) and 1.2 (left as it was). */
const barisA = () => {
  let l = emptyLembar()
  l.baris.push({ id: 'c:a', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'A' }, { id: 'c:a1', tabel: RINCI_TABEL, grup: 'anak:c:a', label: 'Rincian 1' }, { id: 'c:a2', tabel: RINCI_TABEL, grup: 'anak:c:a', label: 'Rincian 2' })
  l = setKategori(l, 'c:a1', 'Kas keluar', 'atk', 'lain_keluar')
  return l
}

describe('Operasional entries in Arus Kas', () => {
  it('a date belongs to the period it falls in, the closing date included', () => {
    expect(indeksPeriode(days, '2026-10-01')).toBe(0)
    expect(indeksPeriode(days, '2026-10-04')).toBe(0)
    expect(indeksPeriode(days, '2026-10-05')).toBe(1)
    expect(indeksPeriode(days, '2026-10-11')).toBe(1)
    expect(indeksPeriode(days, '2026-10-12')).toBe(-1)
  })

  it('without a row given the category, nothing is filled in and no row appears', () => {
    const l = emptyLembar()
    expect(pakai(l).sel).toEqual({})
    const keys = arusDari(l).lines.flatMap((x) => (isGroup(x) ? [] : [x.def.key]))
    expect(keys.some((k) => k.startsWith('op:'))).toBe(false)
  })

  it('fills the sub-row the user filed under the category, per period; a typed figure wins; gaji is never taken', () => {
    const l = pakai(barisA())
    expect(l.sel[`c:a1|${days[1]}`]).toBe('175')
    expect(l.sel[`c:a1|${days[0]}`]).toBeUndefined()
    expect(Object.keys(l.sel).some((k) => k.includes('gaji'))).toBe(false)
    const typed = barisA()
    typed.sel[`c:a1|${days[1]}`] = '10'
    expect(pakai(typed).sel[`c:a1|${days[1]}`]).toBe('10')
  })

  it('a row Arus Kas started with receives a category only once the user chose it for the row', () => {
    const l = setKategori(emptyLembar(), 'k_langganan', 'Kas keluar', 'atk')
    expect(pakai(l).sel[`${keyNilaiDasar('k_langganan')}|${days[1]}`]).toBe('175')
    // its own default category (langganan) was not chosen by the user, so the Operasional langganan entries stay out
    expect(pakai(emptyLembar()).sel[`${keyNilaiDasar('k_langganan')}|${days[1]}`]).toBeUndefined()
  })

  it('goes to the first row in table order when several share the category, and skips a hidden one', () => {
    let l = barisA()
    l = setKategori(l, 'k_operasional', 'Kas keluar', 'atk')
    expect(pakai(l).sel[`${keyNilaiDasar('k_operasional')}|${days[1]}`]).toBe('175')
    expect(pakai(l).sel[`c:a1|${days[1]}`]).toBeUndefined()
    l.baris.push({ id: 'c:hide-k_operasional', tabel: RINCI_TABEL, grup: 'sembunyi', label: 'sembunyi' })
    expect(pakai(l).sel[`c:a1|${days[1]}`]).toBe('175')
  })

  it('shows up in the totals, the closing cash and the Pengeluaran tab', () => {
    const lembar = pakai(barisA())
    const plain = sheet(lembar)
    const arus = applyRinci(plain.find((b) => b.tabel === 'arus_kas')!, days, lembar)
    const row = (key: string) => arus.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)!
    expect(row('c:a1').cells.map((c) => c.value)).toEqual([0, 175])
    expect(row('kas_keluar').cells[1].value).toBe(100 + 5 + 175)
    const comp = ringkasDariArusKas(plain, days, lembar, KATEGORI_BAWAAN).flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === 'p:atk')!
    expect(comp.cells.map((c) => c.value)).toEqual([0, 175])
  })
})

describe('Belanja Supplier flows like Operasional Umum', () => {
  it('page entries -> Arus Kas row of that category -> Pengeluaran (Harga pokok penjualan) -> Laba/Rugi', () => {
    const supplier = [{ tanggal: '2026-10-06', kategori: 'belanja_supplier', jumlah: '300.00' }]
    let l = emptyLembar()
    l.baris.push({ id: 'c:sup', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Belanja supplier' })
    l = setKategori(l, 'c:sup', 'Kas keluar', 'belanja_supplier', 'lain_keluar')
    const tampil = denganOperasional(l, days, supplier, KATEGORI_BAWAAN, arusDari(l))
    expect(tampil.sel[`c:sup|${days[1]}`]).toBe('300')
    const blocks = ringkasDariArusKas(sheet(tampil), days, tampil, KATEGORI_BAWAAN)
    const baris = (tabel: string, key: string) => blocks.find((b) => b.tabel === tabel)!.lines.find((x): x is Line => !isGroup(x) && x.def.key === key)!
    expect(baris('pengeluaran', 'p:belanja_supplier').cells[1].value).toBe(300)
    expect(baris('laba_rugi', 'c_hpp').cells[1].value).toBe(300)
  })
})

describe('Belanja Supplier: one Arus Kas row per supplier, one Pengeluaran row', () => {
  it('an entry goes to the row named like its supplier; all rows add up in the single category', () => {
    const supplier = [
      { tanggal: '2026-10-06', kategori: 'belanja_supplier', jumlah: '300.00', uraian: 'CV Maju' },
      { tanggal: '2026-10-07', kategori: 'belanja_supplier', jumlah: '200.00', uraian: 'ud sejahtera' },
      { tanggal: '2026-10-08', kategori: 'belanja_supplier', jumlah: '50.00', uraian: 'Tanpa baris' },
    ]
    let l = emptyLembar()
    l.baris.push({ id: 'c:s1', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'CV Maju' }, { id: 'c:s2', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'UD Sejahtera' })
    l = setKategori(l, 'c:s1', 'Kas keluar', 'belanja_supplier', 'lain_keluar')
    l = setKategori(l, 'c:s2', 'Kas keluar', 'belanja_supplier', 'lain_keluar')
    const tampil = denganOperasional(l, days, supplier, KATEGORI_BAWAAN, arusDari(l))
    expect(tampil.sel[`c:s1|${days[1]}`]).toBe('350') // its own 300 + the unmatched 50 (first row of the category)
    expect(tampil.sel[`c:s2|${days[1]}`]).toBe('200')
    const blocks = ringkasDariArusKas(sheet(tampil), days, tampil, KATEGORI_BAWAAN)
    const p = blocks.find((b) => b.tabel === 'pengeluaran')!.lines.filter((x): x is Line => !isGroup(x) && x.def.key === 'p:belanja_supplier')
    expect(p).toHaveLength(1)
    expect(p[0].cells[1].value).toBe(550)
  })
})

describe('Belanja Tukang: one Arus Kas row per tukang, one Pengeluaran row', () => {
  it('routes by tukang name and adds up in the single category', () => {
    const items = [
      { tanggal: '2026-10-06', kategori: 'belanja_tukang', jumlah: '100.00', uraian: 'Pak Budi' },
      { tanggal: '2026-10-07', kategori: 'belanja_tukang', jumlah: '40.00', uraian: 'pak andi' },
    ]
    let l = emptyLembar()
    l.baris.push({ id: 'c:t1', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Pak Budi' }, { id: 'c:t2', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Pak Andi' })
    l = setKategori(l, 'c:t1', 'Kas keluar', 'belanja_tukang', 'lain_keluar')
    l = setKategori(l, 'c:t2', 'Kas keluar', 'belanja_tukang', 'lain_keluar')
    const tampil = denganOperasional(l, days, items, KATEGORI_BAWAAN, arusDari(l))
    expect(tampil.sel[`c:t1|${days[1]}`]).toBe('100')
    expect(tampil.sel[`c:t2|${days[1]}`]).toBe('40')
    const blocks = ringkasDariArusKas(sheet(tampil), days, tampil, KATEGORI_BAWAAN)
    const p = blocks.find((b) => b.tabel === 'pengeluaran')!.lines.filter((x): x is Line => !isGroup(x) && x.def.key === 'p:belanja_tukang')
    expect(p).toHaveLength(1)
    expect(p[0].cells[1].value).toBe(140)
  })
})

describe('party name matches a row by the name in brackets', () => {
  it('MAHPUDIN -> "Tagihan Produk [PUDIN]", YUNI -> "Tagihan Produk [YUNI]"', () => {
    const items = [
      { tanggal: '2026-10-06', kategori: 'belanja_supplier', jumlah: '10.00', uraian: 'MAHPUDIN' },
      { tanggal: '2026-10-06', kategori: 'belanja_supplier', jumlah: '5.00', uraian: 'YUNI' },
    ]
    let l = emptyLembar()
    l.baris.push({ id: 'c:a', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Tagihan Produk [YUNI]' }, { id: 'c:b', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Tagihan Produk [PUDIN]' })
    l = setKategori(l, 'c:a', 'Kas keluar', 'belanja_supplier', 'lain_keluar')
    l = setKategori(l, 'c:b', 'Kas keluar', 'belanja_supplier', 'lain_keluar')
    const tampil = denganOperasional(l, days, items, KATEGORI_BAWAAN, arusDari(l))
    expect(tampil.sel[`c:a|${days[1]}`]).toBe('5')
    expect(tampil.sel[`c:b|${days[1]}`]).toBe('10')
  })
})

describe('Kas Kecil (Operasional Eceran)', () => {
  const kecil = [{ tanggal: '2026-10-10', kategori: 'atk_eceran', jumlah: '30.00' }]
  const baris = (blok: ReturnType<typeof applyRinci>, key: string) => blok.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)!

  it('pays Kas Kecil spending out of Kas Kecil: not in Kas keluar (Kas Utama), lowers the Kas Kecil balance', () => {
    let l = emptyLembar()
    l.baris.push({ id: 'c:e', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Eceran' })
    l = setKategori(l, 'c:e', 'Kas keluar', 'atk_eceran', 'lain_keluar')
    // Week 2 is still open; Kas Kecil topped up by 10 that week (typed: a real top-up).
    l.sel['rb:tr_packing|2026-10-11'] = '-10'
    const lembar = denganOperasional(l, days, kecil, KATEGORI_BAWAAN, arusDari(l))
    expect(lembar.sel['rb:tr_kk|2026-10-11']).toBeUndefined()
    const kk = kunciKasKecil(l, arusDari(l), KATEGORI_BAWAAN)
    expect([...kk]).toEqual(['c:e'])
    const blok = applyRinci(arusDari(l), days, lembar, kk)
    // The row keeps its figure (Laba/Rugi still counts it as an expense) ...
    expect(baris(blok, 'c:e').cells[1].value).toBe(30)
    // ... Kas Utama only lost the top-up, and Kas Kecil: +10 top-up - 30 spending.
    const lama = applyRinci(arusDari(l), days, lembar)
    expect(baris(blok, 'kas_keluar').cells[1].value).toBe(baris(lama, 'kas_keluar').cells[1].value! - 30)
    expect(baris(blok, 'transfer').cells[1].value).toBe(-10)
    expect(baris(blok, 'kk_akhir').cells[1].value).toBe(-20)
  })

  it('tops Kas Kecil up from Kas Utama by what it spent (imprest), through Transfer antar kas', () => {
    let l = emptyLembar()
    l.baris.push({ id: 'c:e', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Eceran' })
    l = setKategori(l, 'c:e', 'Kas keluar', 'atk_eceran', 'lain_keluar')
    const lembar = denganOperasional(l, days, kecil, KATEGORI_BAWAAN, arusDari(l), '2026-12-01')
    // While the week is still running there is no top-up yet.
    expect(denganOperasional(l, days, kecil, KATEGORI_BAWAAN, arusDari(l), '2026-10-11').sel['rb:tr_packing|2026-10-11']).toBeUndefined()
    expect(lembar.sel['rb:tr_packing|2026-10-11']).toBe('-30')
    const blok = applyRinci(arusDari(l), days, lembar, kunciKasKecil(l, arusDari(l), KATEGORI_BAWAAN))
    expect(baris(blok, 'kk_akhir').cells[1].value).toBe(0)
    expect(baris(blok, 'transfer').cells[1].value).toBe(-30)
  })
})
