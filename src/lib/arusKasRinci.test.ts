import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { applyRinci, keyNama, keyNilaiDasar, keySelesai, keySembunyi, RINCI_TABEL } from './arusKasRinci'
import { computeSheet, emptyLembar, isGroup, type Line } from './sheetEngine'
import { sheetSections } from './sheetSections'

const zero = { kas_utama: '0', stok: '0', kas_operasional: '0', iklan_prabayar: '0', piutang_pengiriman: '0', saldo_toko: '0', kas_gaji: '0', utang_gaji: '0', utang_usaha: '0', modal: '0', saldo_laba: '0' }
const record = {
  tanggal: '2026-10-04',
  input: { pendapatan_produk: '500', jasa_proses: '100', jasa_cat_packing: '50', bayar_tukang: '0', gaji: '0', topup_iklan: '0', tambahan_modal: '0' },
  hasil: {
    pemasukan_toko: '0', perubahan_piutang: '0', pemasukan: '650', pengeluaran: '0', laba: '650', kas_masuk: '650', kas_keluar: '0', transfer_antar_kas: '0',
    penyesuaian_stok: '0', penyesuaian_utang: '0', biaya_iklan: '0', saldo_awal: zero, saldo_akhir: zero,
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
  it('keeps every figure when nothing is changed', () => {
    const b = build()
    expect(line(b, 'k_prod')!.cells[0].value).toBe(600)
    expect(line(b, 'k_cat')!.cells[0].value).toBe(50)
    expect(line(b, 'Kas masuk:selisih')).toBeUndefined()
  })

  it('lets rows be merged and split into any number of rows with the total unchanged', () => {
    const lembar = emptyLembar()
    const d = '2026-10-04'
    lembar.sel[`${keyNilaiDasar('k_prod')}|${d}`] = '0'
    lembar.sel[`${keyNilaiDasar('k_cat')}|${d}`] = '0'
    for (const [i, v] of [100, 200, 150, 100, 100].entries()) {
      lembar.baris.push({ id: `c:r${i}`, tabel: RINCI_TABEL, grup: 'Kas masuk', label: `Baris ${i}` })
      lembar.sel[`c:r${i}|${d}`] = String(v)
    }
    const b = build(lembar)
    expect([0, 1, 2, 3, 4].map((i) => line(b, `c:r${i}`)!.cells[0].value)).toEqual([100, 200, 150, 100, 100])
    expect(line(b, 'Kas masuk:selisih')).toBeUndefined()
    expect(line(b, 'kas_masuk')!.cells[0].value).toBe(650)
  })

  it('works in the cash-out and transfer groups too and shows what is not yet divided', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: 'c:t1', tabel: RINCI_TABEL, grup: 'Transfer antar kas', label: 'Transfer lain' })
    lembar.sel['c:t1|2026-10-04'] = '75'
    lembar.sel[`${keyNilaiDasar('k_operasional')}|2026-10-04`] = '30'
    const b = build(lembar)
    expect(line(b, 'c:t1')!.cells[0].value).toBe(75)
    expect(line(b, 'transfer')!.cells[0].value).toBe(0)
    expect(line(b, 'Transfer antar kas:selisih')!.cells[0].value).toBe(-75)
    expect(line(b, 'Kas keluar:selisih')!.cells[0].value).toBe(-30)
    expect(line(b, 'kas_keluar')!.cells[0].value).toBe(0)
  })

  it('renames any row, totals included, and can remove a detail row', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: keyNama('k_cat'), tabel: RINCI_TABEL, grup: 'nama', label: 'Cat saja' })
    lembar.baris.push({ id: keyNama('kas_masuk'), tabel: RINCI_TABEL, grup: 'nama', label: 'Total masuk' })
    lembar.baris.push({ id: keySembunyi('k_prod'), tabel: RINCI_TABEL, grup: 'sembunyi', label: 'sembunyi' })
    const b = build(lembar)
    expect(line(b, 'k_cat')!.def.label).toBe('Cat saja')
    expect(line(b, 'kas_masuk')!.def.label).toBe('Total masuk')
    expect(line(b, 'k_prod')).toBeUndefined()
    expect(line(b, 'Kas masuk:selisih')!.cells[0].value).toBe(600)
  })

  it('marks a period as done without touching its figure', () => {
    const lembar = emptyLembar()
    const d = '2026-10-04'
    lembar.sel[keySelesai('k_prod', d)] = '1'
    const b = build(lembar)
    expect(line(b, 'k_prod')!.cells[0]).toMatchObject({ value: 600, manual: false, selesai: true })
    expect(line(b, 'k_prod')!.cells[1].selesai).toBeUndefined()
    expect(line(b, 'kas_masuk')!.cells[0].value).toBe(650)
  })

  it('a done flag alone does not make an empty period look filled', () => {
    const lembar = emptyLembar()
    lembar.sel[keySelesai('k_prod', '2026-10-11')] = '1'
    const b = build(lembar)
    expect(line(b, 'jml_pemasukan')).toBeUndefined()
    expect(line(b, 'kas_masuk')!.cells[1].value).toBeNull()
  })
})
