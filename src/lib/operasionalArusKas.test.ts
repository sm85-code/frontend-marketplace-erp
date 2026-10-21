import { describe, expect, it } from 'vitest'
import { KATEGORI_BAWAAN } from '@/api/kategori'
import type { Overview, Report } from '@/api/financialReports'
import { keyNilaiDasar } from './arusKasRinci'
import { applyRinci } from './arusKasRinci'
import { denganOperasional, indeksPeriode, keyBarisOperasional } from './operasionalArusKas'
import { ringkasDariArusKas } from './ringkasArusKas'
import { computeSheet, emptyLembar, isGroup, type Line } from './sheetEngine'
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
const data = { laporan: [record(days[0]), record(days[1])] } as unknown as Overview
const items = [
  { tanggal: '2026-10-05', kategori: 'atk', jumlah: '150.00' },
  { tanggal: '2026-10-11', kategori: 'atk', jumlah: '25.00' },
  { tanggal: '2026-10-06', kategori: 'langganan', jumlah: '40.00' },
  { tanggal: '2026-10-02', kategori: 'gaji', jumlah: '999.00' },
]
const sel = (l: ReturnType<typeof emptyLembar>, kategori: string, w: number) => l.sel[`${keyNilaiDasar(keyBarisOperasional(kategori))}|${days[w]}`]

describe('Operasional entries in Arus Kas', () => {
  it('a date belongs to the period it falls in, the closing date included', () => {
    expect(indeksPeriode(days, '2026-10-01')).toBe(0)
    expect(indeksPeriode(days, '2026-10-04')).toBe(0)
    expect(indeksPeriode(days, '2026-10-05')).toBe(1)
    expect(indeksPeriode(days, '2026-10-11')).toBe(1)
    expect(indeksPeriode(days, '2026-10-12')).toBe(-1)
  })

  it('fills the row of each category per period; gaji is left to Arus Kas and a typed figure wins', () => {
    const l = denganOperasional(emptyLembar(), days, items, KATEGORI_BAWAAN)
    expect(sel(l, 'atk', 1)).toBe('175')
    expect(sel(l, 'atk', 0)).toBeUndefined()
    expect(sel(l, 'langganan', 1)).toBe('40')
    expect(Object.keys(l.sel).some((k) => k.includes('gaji'))).toBe(false)
    const typed = emptyLembar()
    typed.sel[`${keyNilaiDasar('op:atk')}|${days[1]}`] = '10'
    expect(sel(denganOperasional(typed, days, items, KATEGORI_BAWAAN), 'atk', 1)).toBe('10')
  })

  it('shows the new row with its amount, in the totals, the closing cash and the Pengeluaran tab', () => {
    const lembar = denganOperasional(emptyLembar(), days, items, KATEGORI_BAWAAN)
    const plain = computeSheet(sheetSections(data), [record(days[0]), record(days[1])], days, lembar)
    const arus = applyRinci(plain.find((b) => b.tabel === 'arus_kas')!, days, lembar)
    const row = (key: string) => arus.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)!
    expect(row('op:atk').hidden).toBe(false)
    expect(row('op:atk').cells.map((c) => c.value)).toEqual([0, 175])
    expect(row('k_langganan').cells[1].value).toBe(40) // replaces the report's own 5
    expect(row('kas_keluar').cells[1].value).toBe(100 + 175 + 40)
    expect(row('akhir').cells[1].value).toBe(1000 + 1000 - (100 + 5) + 1000 - 315)
    const ringkas = ringkasDariArusKas(plain, days, lembar, KATEGORI_BAWAAN)
    const comp = ringkas.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === 'p:atk')!
    expect(comp.cells.map((c) => c.value)).toEqual([0, 175])
  })

  it('leaves a row with no Operasional entries out of sight', () => {
    const plain = computeSheet(sheetSections(data), [record(days[0]), record(days[1])], days, emptyLembar())
    const arus = applyRinci(plain.find((b) => b.tabel === 'arus_kas')!, days, emptyLembar())
    expect(arus.lines.find((l): l is Line => !isGroup(l) && l.def.key === 'op:atk')!.hidden).toBe(true)
  })
})
