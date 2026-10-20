import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { ANAK, applyRinci, keyNama, keyNilaiDasar, keySelesai, keySembunyi, RINCI_TABEL } from './arusKasRinci'
import { computeSheet, emptyLembar, isGroup, type Line } from './sheetEngine'
import { sheetSections } from './sheetSections'

const zero = { kas_utama: '0', stok: '0', kas_operasional: '0', iklan_prabayar: '0', piutang_pengiriman: '0', saldo_toko: '0', kas_gaji: '0', utang_gaji: '0', utang_usaha: '0', modal: '0', saldo_laba: '0' }
const record = {
  tanggal: '2026-10-04',
  input: { pendapatan_produk: '500', jasa_proses: '100', jasa_cat_packing: '50', bayar_tukang: '0', gaji: '0', topup_iklan: '0', tambahan_modal: '0' },
  hasil: {
    pemasukan_toko: '0', perubahan_piutang: '0', pemasukan: '650', pengeluaran: '0', laba: '650', kas_masuk: '650', kas_keluar: '0', transfer_antar_kas: '0',
    penyesuaian_stok: '0', penyesuaian_utang: '0', biaya_iklan: '0', saldo_awal: { ...zero, kas_utama: '1000' }, saldo_akhir: { ...zero, kas_utama: '1650' },
    neraca: { aset: '0', utang: '0', ekuitas: '0', selisih: '0' },
  },
} as unknown as Report
const days = ['2026-10-04', '2026-10-11']
const build = (lembar = emptyLembar()) => {
  const plain = computeSheet(sheetSections({ laporan: [record] } as unknown as Overview), [record], days, lembar).find((b) => b.tabel === 'arus_kas')!
  return applyRinci(plain, days, lembar)
}
const line = (b: ReturnType<typeof build>, key: string) => b.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)

describe('arus kas breakdown', () => {
  const d = '2026-10-04'
  const child = (id: string, parent: string, label = id) => ({ id, tabel: RINCI_TABEL, grup: `${ANAK}${parent}`, label })
  const cell0 = (b: ReturnType<typeof build>, key: string) => line(b, key)!.cells[0].value

  it('keeps every figure when nothing is changed, and never shows a "Belum dirinci" row', () => {
    const b = build()
    expect(cell0(b, 'k_prod')).toBe(600)
    expect(cell0(b, 'k_cat')).toBe(50)
    expect(cell0(b, 'kas_masuk')).toBe(650)
    expect(b.lines.some((l) => !isGroup(l) && l.def.key.endsWith(':selisih'))).toBe(false)
  })

  it('totals follow the rows: merging and splitting rows moves the group total with their sum', () => {
    const lembar = emptyLembar()
    lembar.sel[`${keyNilaiDasar('k_prod')}|${d}`] = '0'
    lembar.sel[`${keyNilaiDasar('k_cat')}|${d}`] = '0'
    for (const [i, v] of [100, 200, 150].entries()) {
      lembar.baris.push({ id: `c:r${i}`, tabel: RINCI_TABEL, grup: 'Kas masuk', label: `Baris ${i}` })
      lembar.sel[`c:r${i}|${d}`] = String(v)
    }
    const b = build(lembar)
    expect(cell0(b, 'kas_masuk')).toBe(450)
    expect(line(b, 'kas_masuk')!.total).toBe(450 + 0) // second period has no data
  })

  it('cash out and transfers follow their rows, and the closing cash follows the totals', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: 'c:t1', tabel: RINCI_TABEL, grup: 'Transfer antar kas', label: 'Transfer lain' })
    lembar.sel['c:t1|2026-10-04'] = '75'
    lembar.sel[`${keyNilaiDasar('k_operasional')}|2026-10-04`] = '30'
    const b = build(lembar)
    expect(cell0(b, 'transfer')).toBe(75)
    expect(cell0(b, 'kas_keluar')).toBe(30)
    expect(cell0(b, 'awal')).toBe(1000)
    expect(cell0(b, 'akhir')).toBe(1000 + 650 - 30 + 75)
  })

  it('renames any row, totals included, and a removed row leaves the totals', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: keyNama('k_cat'), tabel: RINCI_TABEL, grup: 'nama', label: 'Cat saja' })
    lembar.baris.push({ id: keyNama('kas_masuk'), tabel: RINCI_TABEL, grup: 'nama', label: 'Total masuk' })
    lembar.baris.push({ id: keySembunyi('k_prod'), tabel: RINCI_TABEL, grup: 'sembunyi', label: 'sembunyi' })
    const b = build(lembar)
    expect(line(b, 'k_cat')!.def.label).toBe('Cat saja')
    expect(line(b, 'kas_masuk')!.def.label).toBe('Total masuk')
    expect(line(b, 'k_prod')).toBeUndefined()
    expect(cell0(b, 'kas_masuk')).toBe(50)
  })

  it('marks a period as done without touching its figure', () => {
    const lembar = emptyLembar()
    lembar.sel[keySelesai('k_prod', d)] = '1'
    const b = build(lembar)
    expect(line(b, 'k_prod')!.cells[0]).toMatchObject({ value: 600, manual: false, selesai: true })
    expect(line(b, 'k_prod')!.cells[1].selesai).toBeUndefined()
    expect(cell0(b, 'kas_masuk')).toBe(650)
  })

  it('a done flag alone does not make an empty period look filled', () => {
    const lembar = emptyLembar()
    lembar.sel[keySelesai('k_prod', '2026-10-11')] = '1'
    const b = build(lembar)
    expect(line(b, 'kas_masuk')!.cells[1].value).toBeNull()
  })

  it('a row with sub-rows shows their sum, which the totals follow; without sub-rows its own figure is the reference', () => {
    const lembar = emptyLembar()
    lembar.baris.push(child('c:a', 'k_prod', 'Toko A'), child('c:b', 'k_prod', 'Toko B'))
    lembar.sel[`c:a|${d}`] = '200'
    lembar.sel[`c:b|${d}`] = '300'
    const b = build(lembar)
    expect(b.lines.filter((l) => !isGroup(l) && l.def.induk).map((l) => (l as Line).def.key)).toEqual(['c:a', 'c:b'])
    expect(cell0(b, 'k_prod')).toBe(500)
    expect(cell0(b, 'k_cat')).toBe(50) // no sub-rows: its own figure
    expect(cell0(b, 'kas_masuk')).toBe(550)
    // Sub-rows exceeding the old figure simply raise it; sub-rows are never added in twice.
    lembar.sel[`c:b|${d}`] = '900'
    expect(cell0(build(lembar), 'k_prod')).toBe(1100)
    expect(cell0(build(lembar), 'kas_masuk')).toBe(1150)
  })

  it('removing a row drops its sub-rows from the table and the totals', () => {
    const lembar = emptyLembar()
    lembar.baris.push(child('c:a', 'k_prod', 'Toko A'))
    lembar.sel[`c:a|${d}`] = '700'
    lembar.baris.push({ id: keySembunyi('k_prod'), tabel: RINCI_TABEL, grup: 'sembunyi', label: 'sembunyi' })
    const b = build(lembar)
    expect(line(b, 'c:a')).toBeUndefined()
    expect(cell0(b, 'kas_masuk')).toBe(50)
  })

  it('carries the closing cash into the next period', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: 'c:t1', tabel: RINCI_TABEL, grup: 'Transfer antar kas', label: 'Transfer lain' })
    lembar.sel['c:t1|2026-10-04'] = '100'
    const b = build(lembar)
    expect(line(b, 'awal')!.cells[1].value).toBe(line(b, 'akhir')!.cells[0].value)
  })
})
