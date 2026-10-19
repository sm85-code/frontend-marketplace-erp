import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { applyRinci, keyNama, keyNilaiDasar, RINCI_TABEL } from './arusKasRinci'
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
  it('leaves the table untouched without a breakdown', () => {
    const b = build()
    expect(line(b, 'k_prod')!.cells[0].value).toBe(600)
    expect(line(b, 'k_prod:selisih')).toBeUndefined()
  })

  it('splits a row without changing the cash-in total', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: 'c:a', tabel: RINCI_TABEL, grup: 'k_prod', label: 'Kayu jati' })
    lembar.sel['c:a|2026-10-04'] = '250'
    const b = build(lembar)
    expect(line(b, 'c:a')!.cells[0].value).toBe(250)
    expect(line(b, 'k_prod')!.cells[0].value).toBe(350)
    expect(line(b, 'kas_masuk')!.cells[0].value).toBe(650)
    expect(line(b, 'k_prod:selisih')).toBeUndefined()
  })

  it('shows the undistributed rest when the base row is typed over, and renames it', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: keyNama('k_cat'), tabel: RINCI_TABEL, grup: 'k_cat', label: 'Cat saja' })
    lembar.sel[`${keyNilaiDasar('k_cat')}|2026-10-04`] = '10'
    const b = build(lembar)
    expect(line(b, 'k_cat')!.def.label).toBe('Cat saja')
    expect(line(b, 'k_cat')!.cells[0].value).toBe(10)
    expect(line(b, 'k_cat:selisih')!.cells[0].value).toBe(40)
    expect(line(b, 'kas_masuk')!.cells[0].value).toBe(650)
  })
})
