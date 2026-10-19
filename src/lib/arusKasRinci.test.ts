import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { applyRinci, GRUP_BARU, keyNama, keyNilaiDasar, keySembunyi, RINCI_TABEL } from './arusKasRinci'
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
    expect(line(b, 'k_cat')!.cells[0].value).toBe(50)
    expect(line(b, `${GRUP_BARU}:selisih`)).toBeUndefined()
  })

  it('lets the two rows be merged and split into any number of rows with the total unchanged', () => {
    const lembar = emptyLembar()
    const d = '2026-10-04'
    lembar.sel[`${keyNilaiDasar('k_prod')}|${d}`] = '0'
    lembar.sel[`${keyNilaiDasar('k_cat')}|${d}`] = '0'
    for (const [i, v] of [100, 200, 150, 100, 100].entries()) {
      lembar.baris.push({ id: `c:r${i}`, tabel: RINCI_TABEL, grup: GRUP_BARU, label: `Baris ${i}` })
      lembar.sel[`c:r${i}|${d}`] = String(v)
    }
    const b = build(lembar)
    expect([0, 1, 2, 3, 4].map((i) => line(b, `c:r${i}`)!.cells[0].value)).toEqual([100, 200, 150, 100, 100])
    expect(line(b, `${GRUP_BARU}:selisih`)).toBeUndefined()
    expect(line(b, 'kas_masuk')!.cells[0].value).toBe(650)
  })

  it('shows what is not yet divided, and can rename or remove an original row', () => {
    const lembar = emptyLembar()
    lembar.baris.push({ id: keyNama('k_cat'), tabel: RINCI_TABEL, grup: 'k_cat', label: 'Cat saja' })
    lembar.baris.push({ id: keySembunyi('k_prod'), tabel: RINCI_TABEL, grup: 'k_prod', label: 'sembunyi' })
    const b = build(lembar)
    expect(line(b, 'k_cat')!.def.label).toBe('Cat saja')
    expect(line(b, 'k_prod')).toBeUndefined()
    expect(line(b, `${GRUP_BARU}:selisih`)!.cells[0].value).toBe(600)
  })
})
