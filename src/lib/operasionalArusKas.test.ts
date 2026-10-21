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
