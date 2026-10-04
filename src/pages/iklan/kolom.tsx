import { fmtDate, fmtRp } from '@/api/client'
import type { IklanHarianToko, IklanRingkasan } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'

const angka = (v: number) => v.toLocaleString('id-ID')
/** 0.0512 -> "5,12%" ; null (no impressions) -> "—". */
export const persen = (v: string | null) => (v == null ? '—' : `${(Number(v) * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`)
/** 4.25 -> "4,25×" ; null (no spend) -> "—". */
export const kali = (v: string | null) => (v == null ? '—' : `${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 })}×`)

/**
 * Every column of the per-day Shopee Ads list, declared once (table, column picker, sort dropdown). `urut.kunci`
 * must be a key the API knows: tanggal toko biaya tayang klik pesanan gmv roas.
 */
export function kolomIklanHarian(): KolomTabel<IklanHarianToko>[] {
  const a = 'whitespace-nowrap'
  return [
    {
      kunci: 'tanggal',
      judul: 'Tanggal',
      tetap: true,
      kelas: `${a} font-medium`,
      urut: { kunci: 'tanggal', arahAwal: 'desc', label: ['Terlama', 'Terbaru'] },
      sel: (r) => fmtDate(r.tanggal),
    },
    { kunci: 'toko', judul: 'Toko', kelas: 'min-w-[110px]', urut: { kunci: 'toko' }, sel: (r) => r.nama_toko ?? '—' },
    { kunci: 'biaya', judul: 'Biaya iklan', rata: 'kanan', kelas: a, urut: { kunci: 'biaya', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] }, sel: (r) => fmtRp(r.expense) },
    { kunci: 'tayang', judul: 'Tayang', rata: 'kanan', kelas: a, urut: { kunci: 'tayang', arahAwal: 'desc', label: ['Tersedikit', 'Terbanyak'] }, sel: (r) => angka(r.impression) },
    { kunci: 'klik', judul: 'Klik', rata: 'kanan', kelas: a, urut: { kunci: 'klik', arahAwal: 'desc', label: ['Tersedikit', 'Terbanyak'] }, sel: (r) => angka(r.clicks) },
    { kunci: 'ctr', judul: 'CTR', rata: 'kanan', kelas: a, sel: (r) => persen(r.ctr) },
    { kunci: 'pesanan', judul: 'Pesanan', rata: 'kanan', kelas: a, urut: { kunci: 'pesanan', arahAwal: 'desc', label: ['Tersedikit', 'Terbanyak'] }, sel: (r) => angka(r.direct_order) },
    { kunci: 'pesananLuas', judul: 'Pesanan (luas)', rata: 'kanan', kelas: a, bawaan: false, sel: (r) => angka(r.broad_order) },
    { kunci: 'gmv', judul: 'GMV iklan', rata: 'kanan', kelas: a, urut: { kunci: 'gmv', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] }, sel: (r) => fmtRp(r.direct_gmv) },
    { kunci: 'gmvLuas', judul: 'GMV iklan (luas)', rata: 'kanan', kelas: a, bawaan: false, sel: (r) => fmtRp(r.broad_gmv) },
    { kunci: 'roas', judul: 'ROAS', rata: 'kanan', kelas: `${a} font-semibold`, urut: { kunci: 'roas', arahAwal: 'desc', label: ['Terendah', 'Tertinggi'] }, sel: (r) => kali(r.roas_langsung) },
    { kunci: 'roasLuas', judul: 'ROAS (luas)', rata: 'kanan', kelas: a, bawaan: false, sel: (r) => kali(r.roas_luas) },
  ]
}

type BarisToko = IklanRingkasan['toko'][number]

/** Totals per shop: sorted in the browser (one row per shop). */
export function kolomRingkasanIklan(): KolomTabel<BarisToko>[] {
  const a = 'whitespace-nowrap'
  const num = (v: string | null) => (v == null ? null : Number(v))
  return [
    { kunci: 'toko', judul: 'Toko', tetap: true, kelas: 'font-medium', sel: (t) => t.nama_toko, nilai: (t) => t.nama_toko },
    { kunci: 'biaya', judul: 'Biaya iklan', rata: 'kanan', kelas: a, sel: (t) => fmtRp(t.expense), nilai: (t) => Number(t.expense) },
    { kunci: 'tayang', judul: 'Tayang', rata: 'kanan', kelas: a, sel: (t) => angka(t.impression), nilai: (t) => t.impression },
    { kunci: 'klik', judul: 'Klik', rata: 'kanan', kelas: a, sel: (t) => angka(t.clicks), nilai: (t) => t.clicks },
    { kunci: 'ctr', judul: 'CTR', rata: 'kanan', kelas: a, sel: (t) => persen(t.ctr), nilai: (t) => num(t.ctr) },
    { kunci: 'pesanan', judul: 'Pesanan', rata: 'kanan', kelas: a, sel: (t) => angka(t.direct_order), nilai: (t) => t.direct_order },
    { kunci: 'gmv', judul: 'GMV iklan', rata: 'kanan', kelas: a, sel: (t) => fmtRp(t.direct_gmv), nilai: (t) => Number(t.direct_gmv) },
    { kunci: 'roas', judul: 'ROAS', rata: 'kanan', kelas: `${a} font-semibold`, sel: (t) => kali(t.roas_langsung), nilai: (t) => num(t.roas_langsung) },
    { kunci: 'saldo', judul: 'Saldo iklan', rata: 'kanan', kelas: a, sel: (t) => (t.saldo == null ? '—' : fmtRp(t.saldo)), nilai: (t) => num(t.saldo) },
  ]
}
