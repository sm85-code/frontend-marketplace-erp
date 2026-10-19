import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { computeSheet, emptyLembar, isGroup, type Block, type Line } from './sheetEngine'
import { sheetSections } from './sheetSections'

const balances = (extra: Record<string, string>) => ({
  kas_utama: '0', stok: '0', kas_operasional: '0', iklan_prabayar: '0', piutang_pengiriman: '0', saldo_toko: '0',
  kas_gaji: '0', utang_gaji: '0', utang_usaha: '0', modal: '0', saldo_laba: '0', ...extra,
})
const record = {
  tanggal: '2026-10-04',
  input: { pendapatan_produk: '500', bayar_tukang: '200', gaji: '0', topup_iklan: '0', tambahan_modal: '0' },
  hasil: {
    pemasukan_toko: '0', pendapatan_lain: '500', perubahan_piutang: '0', pemasukan: '500', hpp: '200',
    penyesuaian_stok: '0', penyesuaian_utang: '0', biaya_iklan: '0', pengeluaran: '200', laba: '300',
    kas_masuk: '500', kas_keluar: '200', transfer_antar_kas: '0',
    saldo_awal: balances({ kas_utama: '1000', modal: '1000' }),
    saldo_akhir: balances({ kas_utama: '1300', modal: '1000', saldo_laba: '300' }),
    neraca: { aset: '1300', utang: '0', ekuitas: '1300', selisih: '0' },
  },
} as unknown as Report
const data = { laporan: [record] } as unknown as Overview
const days = ['2026-10-04']
const run = (lembar = emptyLembar()) => computeSheet(sheetSections(data), [record], days, lembar)
const total = (blocks: Block[], key: string) =>
  blocks.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)!.total

describe('sheet engine', () => {
  it('reproduces the closed books when nothing is typed', () => {
    const b = run()
    expect(total(b, 'jml_pemasukan')).toBe(500)
    expect(total(b, 'laba')).toBe(300)
    expect(total(b, 'akhir')).toBe(1300)
    expect(total(b, 'selisih')).toBe(0)
  })

  it('recalculates totals, profit, cash and keeps the balance sheet balanced when income is typed', () => {
    const b = run({ ...emptyLembar(), sel: { 'produk|2026-10-04': '800' } })
    expect(total(b, 'jml_pemasukan')).toBe(800)
    expect(total(b, 'laba')).toBe(600)
    expect(total(b, 'kas_masuk')).toBe(800)
    expect(total(b, 'akhir')).toBe(1600)
    expect(total(b, 'n_kas')).toBe(1600)
    expect(total(b, 'jml_ekuitas')).toBe(1600)
    expect(total(b, 'selisih')).toBe(0)
  })

  it('treats an expense the same way', () => {
    const b = run({ ...emptyLembar(), sel: { 'tukang|2026-10-04': '50' } })
    expect(total(b, 'jml_pengeluaran')).toBe(50)
    expect(total(b, 'laba')).toBe(450)
    expect(total(b, 'akhir')).toBe(1450)
    expect(total(b, 'selisih')).toBe(0)
  })

  it('counts rows added by hand in their group total', () => {
    const lembar = {
      sel: { 'c:abc|2026-10-04': '100' },
      baris: [{ id: 'c:abc', tabel: 'pemasukan', grup: 'Penjualan dan jasa', label: 'Penjualan lain' }],
      hapus: [],
    }
    const b = run(lembar)
    expect(total(b, 'c:abc')).toBe(100)
    expect(total(b, 'jml_pemasukan')).toBe(600)
    expect(total(b, 'laba')).toBe(400)
  })

  it('keeps cash and the balance sheet in step for rows added by hand', () => {
    const income = run({
      sel: { 'c:in|2026-10-04': '100' },
      baris: [{ id: 'c:in', tabel: 'pemasukan', grup: 'Penjualan dan jasa', label: 'Penjualan lain' }],
      hapus: [],
    })
    expect(total(income, 'akhir')).toBe(1400)
    expect(total(income, 'selisih')).toBe(0)
    const cost = run({
      sel: { 'c:out|2026-10-04': '40' },
      baris: [{ id: 'c:out', tabel: 'pengeluaran', grup: 'Beban operasional', label: 'Biaya lain' }],
      hapus: [],
    })
    expect(total(cost, 'jml_pengeluaran')).toBe(240)
    expect(total(cost, 'akhir')).toBe(1260)
    expect(total(cost, 'selisih')).toBe(0)
  })

  it('fills the opening cash of a week that has no closed report from the previous closing cash', () => {
    const two = computeSheet(sheetSections(data), [record], ['2026-10-04', '2026-10-11'], emptyLembar())
    const row = (key: string) => two.flatMap((x) => x.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)!
    expect(row('awal').cells[1].value).toBe(1300)
    expect(row('n_laba_lalu').cells[1].value).toBeNull()
    expect(row('akhir').cells[1].value).toBeNull()
    const typed = computeSheet(sheetSections(data), [record], ['2026-10-04', '2026-10-11'], { ...emptyLembar(), sel: { 'produk|2026-10-11': '200' } })
    const typedRow = (key: string) => typed.flatMap((x) => x.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)!
    expect(typedRow('awal').cells[1].value).toBe(1300)
    expect(typedRow('akhir').cells[1].value).toBe(1500)
    expect(typedRow('selisih').cells[1].value).toBe(0)
  })

  it('lets a typed value replace a closed-books figure and reports it as manual', () => {
    const b = run({ ...emptyLembar(), sel: { 'produk|2026-10-04': '0' } })
    const line = b.flatMap((x) => x.lines).find((l): l is Line => !isGroup(l) && l.def.key === 'produk')!
    expect(line.cells[0]).toEqual({ value: 0, manual: true })
    expect(total(b, 'jml_pemasukan')).toBe(0)
  })

  it('carries a change into the next week (opening cash, previous profit)', () => {
    const next = { ...record, tanggal: '2026-10-11', hasil: { ...record.hasil, saldo_awal: record.hasil.saldo_akhir, saldo_akhir: balances({ kas_utama: '1600', modal: '1000', saldo_laba: '600' }), neraca: { aset: '1600', utang: '0', ekuitas: '1600', selisih: '0' } } } as unknown as Report
    const two = computeSheet(sheetSections({ laporan: [record, next] } as unknown as Overview), [record, next], ['2026-10-04', '2026-10-11'], {
      ...emptyLembar(),
      sel: { 'produk|2026-10-04': '800' },
    })
    const row = (key: string) => two.flatMap((x) => x.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)!
    expect(row('awal').cells[1].value).toBe(1600)
    expect(row('akhir').cells[1].value).toBe(1900)
    expect(row('n_laba_lalu').cells[1].value).toBe(600)
    expect(row('selisih').cells[1].value).toBe(0)
  })
})
