/** Rules for the inline rows of Operasional Umum / Packing. */

export interface Isi {
  tanggal: string
  uraian: string
  /** Raw number as typed (digits and one dot), not the formatted text. */
  jumlah: string
}

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/

/** The date a new row starts with: today when it falls in the shown month, else the first day of that month. */
export function tanggalBawaan(periode: string, hariIni: string): string {
  return hariIni.startsWith(periode + '-') ? hariIni : `${periode}-01`
}

/** Strip a trailing ".00" so the saved amount reads like what was typed ("1500000.00" → "1500000"). */
export function jumlahTampil(dariServer: string): string {
  return dariServer.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

/** Why a row cannot be saved yet (null = it can). An empty amount on a new row just means "not filled in". */
export function alasanBelumBisa(isi: Isi): string | null {
  if (!TANGGAL.test(isi.tanggal) || Number.isNaN(Date.parse(isi.tanggal))) return 'Isi tanggal yang valid'
  if (!/^\d+(\.\d{1,2})?$/.test(isi.jumlah) || Number(isi.jumlah) <= 0) return 'Jumlah harus lebih dari 0 (maksimal 2 angka di belakang koma)'
  if (isi.uraian.length > 255) return 'Uraian maksimal 255 karakter'
  return null
}

export const sama = (a: Isi, b: Isi) => a.tanggal === b.tanggal && a.uraian.trim() === b.uraian.trim() && Number(a.jumlah) === Number(b.jumlah)

/** A new row is "started" once anything beyond the default date has been typed. */
export const barisBaruTerisi = (isi: Isi) => isi.jumlah.trim() !== '' || isi.uraian.trim() !== ''
