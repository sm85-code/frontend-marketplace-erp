import type { KampanyeIklan, KampanyeIklanDaftar } from '@/api/types'

const angka = (v: number | string | null | undefined) => (v == null || v === '' ? 0 : Number(v))

export type VarianStatus = 'default' | 'secondary' | 'destructive' | 'outline'

/** Shopee campaign_status -> label + badge colour. */
export function statusKampanye(status: string | null): { label: string; varian: VarianStatus } {
  switch (status) {
    case 'ongoing':
      return { label: 'Berjalan', varian: 'default' }
    case 'paused':
      return { label: 'Dijeda', varian: 'secondary' }
    case 'scheduled':
      return { label: 'Terjadwal', varian: 'outline' }
    case 'ended':
      return { label: 'Berakhir', varian: 'secondary' }
    case 'closed':
      return { label: 'Ditutup', varian: 'destructive' }
    case 'deleted':
      return { label: 'Dihapus', varian: 'destructive' }
    default:
      return { label: status ?? '—', varian: 'secondary' }
  }
}

/** What can be done to a campaign in this status (Shopee refuses the rest). */
export function aksiTersedia(status: string | null) {
  const hidup = status === 'ongoing' || status === 'paused' || status === 'scheduled'
  return {
    jeda: status === 'ongoing' || status === 'scheduled',
    lanjut: status === 'paused',
    hentikan: hidup,
    hapus: status !== 'deleted',
    ubahAnggaran: hidup,
  }
}

export const jenisKampanye = (k: Pick<KampanyeIklan, 'bidding'>) => (k.bidding === 'manual' ? 'Manual' : k.bidding === 'auto' ? 'GMV Max (otomatis)' : '—')
export const anggaranTeks = (v: number | string | null, fmt: (n: number) => string) => (v == null ? '—' : angka(v) === 0 ? 'Tanpa batas' : fmt(angka(v)))

export interface SaranOtomatis {
  tingkat: 'bahaya' | 'peringatan' | 'baik' | 'info'
  teks: string
}

/**
 * Plain rules over the numbers of the period, NOT a language model: they point at what deserves a look. Thresholds are
 * deliberately conservative so a campaign with little data is not judged.
 */
export function saranKampanye(k: KampanyeIklan): SaranOtomatis[] {
  const hasil: SaranOtomatis[] = []
  const f = k.kinerja
  const berjalan = k.status === 'ongoing'
  if (!f) {
    if (berjalan) hasil.push({ tingkat: 'info', teks: 'Belum ada data performa untuk periode ini.' })
    return hasil
  }
  const biaya = angka(f.expense)
  const roas = f.roas == null ? null : angka(f.roas)
  const ctr = f.ctr == null ? null : angka(f.ctr)
  if (berjalan && f.impression === 0) {
    hasil.push({ tingkat: 'peringatan', teks: 'Berjalan tapi tidak tayang sama sekali. Cek saldo iklan, anggaran, dan stok produk.' })
    return hasil
  }
  if (f.clicks >= 30 && f.direct_order === 0) {
    hasil.push({ tingkat: 'bahaya', teks: `${f.clicks} klik tanpa satu pesanan. Cek harga, foto, dan stok produk, atau jeda dulu.` })
  } else if (roas != null && biaya >= 20000 && roas < 1) {
    hasil.push({ tingkat: 'bahaya', teks: `ROAS ${roas.toFixed(2)}×: biaya iklan lebih besar dari penjualan. Turunkan anggaran atau jeda.` })
  } else if (roas != null && biaya >= 20000 && roas < 3) {
    hasil.push({ tingkat: 'peringatan', teks: `ROAS ${roas.toFixed(2)}× masih tipis. Periksa kata kunci yang boros atau naikkan target ROAS.` })
  }
  if (roas != null && roas >= 5 && f.direct_order >= 3 && berjalan) {
    hasil.push({ tingkat: 'baik', teks: `ROAS ${roas.toFixed(2)}× dengan ${f.direct_order} pesanan. Layak dinaikkan anggarannya bertahap.` })
  }
  if (ctr != null && f.impression >= 1000 && ctr < 0.01) {
    hasil.push({ tingkat: 'peringatan', teks: 'CTR di bawah 1%: tayang banyak tapi jarang diklik. Perbaiki foto utama atau judul produk.' })
  }
  return hasil
}

/** Totals of the campaigns that were running or spent money in the period. */
export function totalKampanye(d: KampanyeIklanDaftar | undefined) {
  const daftar = d?.kampanye ?? []
  let biaya = 0
  let gmv = 0
  let pesanan = 0
  let klik = 0
  for (const k of daftar) {
    biaya += angka(k.kinerja?.expense)
    gmv += angka(k.kinerja?.direct_gmv)
    pesanan += k.kinerja?.direct_order ?? 0
    klik += k.kinerja?.clicks ?? 0
  }
  return {
    jumlah: daftar.length,
    berjalan: daftar.filter((k) => k.status === 'ongoing').length,
    biaya,
    gmv,
    pesanan,
    klik,
    roas: biaya > 0 ? gmv / biaya : null,
  }
}

export const angkaDari = angka
