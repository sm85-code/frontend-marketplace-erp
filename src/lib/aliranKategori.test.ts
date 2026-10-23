import { describe, expect, it } from 'vitest'
import { aliranLaporan } from './aliranKategori'

const tab = (t: string) => ({ arus_kas: 'Arus Kas', pemasukan: 'Pemasukan', pengeluaran: 'Belanja', laba_rugi: 'Laba/Rugi' })[t] ?? t
const halaman = { umum: 'Operasional Umum', packing: 'Operasional Eceran' }

describe('aliranLaporan', () => {
  it('income goes to Pemasukan and the Pemasukan line of Laba/Rugi', () => {
    expect(aliranLaporan({ id: 'x', arah: 'masuk', kelompok: 'Penjualan', operasional: null }, tab, halaman)).toBe('Masuk ke: Arus Kas · Pemasukan › Penjualan · Laba/Rugi › Pemasukan')
  })
  it('expense names its group and the Operasional page it is taken from', () => {
    expect(aliranLaporan({ id: 'cat', arah: 'keluar', kelompok: 'Beban operasional', operasional: 'umum' }, tab, halaman)).toBe('Dari Operasional Umum → Masuk ke: Arus Kas · Belanja › Beban operasional · Laba/Rugi › Beban operasional')
  })
  it('gaji is typed in Arus Kas, never taken from an Operasional page', () => {
    expect(aliranLaporan({ id: 'gaji', arah: 'keluar', kelompok: 'Beban', operasional: 'umum' }, tab, halaman)).not.toContain('Dari')
  })
  it('no group: Arus Kas only', () => {
    expect(aliranLaporan({ id: 'bukan_masuk', arah: 'masuk', kelompok: '', operasional: null }, tab, halaman)).toContain('Tidak masuk laporan')
  })
})
