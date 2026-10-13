import { fmtDate, fmtRp, fmtTime } from '@/api/client'
import type { SettlementPesanan, SettlementRingkasan } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'

const uang = (v: string) => Number(v)
/** Costs are shown with a minus sign so a column reads as "what was taken off". */
const potong = (v: string | null) => v == null ? '—' : (uang(v) === 0 ? fmtRp(0) : fmtRp(-Math.abs(uang(v))))

/** Reconciliation difference, not a provider-reported fee or an estimated payout. */
export function komponenLainNeto(r: Record<'penjualan' | 'komisi' | 'layanan' | 'ongkir' | 'jumlah_cair', string | number | null>): number | null {
  const values = [r.penjualan, r.komisi, r.layanan, r.ongkir, r.jumlah_cair]
  if (values.some(v => v == null || (typeof v !== 'string' && typeof v !== 'number') || String(v).trim() === '' || !Number.isFinite(Number(v)))) return null
  const [penjualan, komisi, layanan, ongkir, cair] = values.map(v => Math.round(Number(v) * 100))
  return (cair - (penjualan - Math.abs(komisi) - Math.abs(layanan) + ongkir)) / 100
}
const tampilKomponenLain = (r: Parameters<typeof komponenLainNeto>[0]) => {
  const nilai = komponenLainNeto(r)
  return nilai == null ? '—' : fmtRp(nilai)
}

/**
 * Every column of the released-money list, declared once: the table, the column picker and the sort dropdown all
 * come from it. `urut.kunci` must be a sort key the API knows (dirilis pesanan toko penjualan komisi layanan ongkir cair).
 */
export function kolomSettlementPesanan(): KolomTabel<SettlementPesanan>[] {
  const angka = 'whitespace-nowrap'
  return [
    {
      kunci: 'pesanan',
      judul: 'No. Pesanan',
      tetap: true,
      kelas: 'font-mono font-medium',
      urut: { kunci: 'pesanan' },
      sel: (r) => r.order_sn,
    },
    {
      kunci: 'dirilis',
      judul: 'Tanggal cair',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'dirilis', arahAwal: 'desc', label: ['Terlama', 'Terbaru'] },
      sel: (r) => (
        <>
          <div>{fmtDate(r.dirilis_at)}</div>
          <div className="teks-kecil text-muted-foreground">{fmtTime(r.dirilis_at)}</div>
        </>
      ),
    },
    { kunci: 'toko', judul: 'Toko', kelas: 'min-w-[110px]', urut: { kunci: 'toko' }, sel: (r) => r.nama_toko ?? '—' },
    {
      kunci: 'penjualan',
      judul: 'Penjualan sebelum Diskon',
      rata: 'kanan',
      kelas: angka,
      urut: { kunci: 'penjualan', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (r) => fmtRp(r.penjualan),
    },
    { kunci: 'voucher', judul: 'Voucher penjual', rata: 'kanan', kelas: angka, bawaan: false, sel: (r) => potong(r.voucher_penjual) },
    {
      kunci: 'komisi',
      judul: 'Komisi',
      rata: 'kanan',
      kelas: angka,
      urut: { kunci: 'komisi', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (r) => potong(r.komisi),
    },
    {
      kunci: 'layanan',
      judul: 'Layanan',
      rata: 'kanan',
      kelas: angka,
      urut: { kunci: 'layanan', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (r) => potong(r.layanan),
    },
    { kunci: 'transaksi', judul: 'Biaya transaksi', rata: 'kanan', kelas: angka, bawaan: false, sel: (r) => potong(r.transaksi) },
    {
      kunci: 'ongkir',
      judul: 'Ongkir',
      rata: 'kanan',
      kelas: angka,
      urut: { kunci: 'ongkir', label: ['Paling besar ditanggung', 'Paling kecil ditanggung'] },
      // Shopee reports the shipping the seller bears as a negative number: shown as is.
      sel: (r) => fmtRp(r.ongkir),
    },
    { kunci: 'subsidi', judul: 'Subsidi ongkir', rata: 'kanan', kelas: angka, bawaan: false, sel: (r) => fmtRp(r.subsidi_ongkir) },
    { kunci: 'penyesuaian', judul: 'Penyesuaian', rata: 'kanan', kelas: angka, bawaan: false, sel: (r) => fmtRp(r.penyesuaian) },
    { kunci: 'komponen_lain', judul: 'Komponen lain', rata: 'kanan', kelas: angka, sel: tampilKomponenLain },
    {
      kunci: 'cair',
      judul: 'Dana cair',
      rata: 'kanan',
      kelas: `${angka} font-semibold`,
      urut: { kunci: 'cair', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (r) => fmtRp(r.jumlah_cair),
    },
  ]
}

type BarisToko = SettlementRingkasan['toko'][number]

/** Totals per shop: sorted in the browser (the list is one row per shop). */
export function kolomRingkasanToko(): KolomTabel<BarisToko>[] {
  const a = 'whitespace-nowrap'
  return [
    { kunci: 'toko', judul: 'Toko', tetap: true, kelas: 'font-medium', sel: (t) => t.nama_toko, nilai: (t) => t.nama_toko },
    { kunci: 'pesanan', judul: 'Pesanan', rata: 'kanan', kelas: a, sel: (t) => t.pesanan, nilai: (t) => t.pesanan },
    { kunci: 'penjualan', judul: 'Penjualan sebelum Diskon', rata: 'kanan', kelas: a, sel: (t) => fmtRp(t.penjualan), nilai: (t) => uang(t.penjualan) },
    { kunci: 'komisi', judul: 'Komisi', rata: 'kanan', kelas: a, sel: (t) => potong(t.komisi), nilai: (t) => uang(t.komisi) },
    { kunci: 'layanan', judul: 'Layanan', rata: 'kanan', kelas: a, sel: (t) => potong(t.layanan), nilai: (t) => uang(t.layanan) },
    { kunci: 'ongkir', judul: 'Ongkir', rata: 'kanan', kelas: a, sel: (t) => fmtRp(t.ongkir), nilai: (t) => uang(t.ongkir) },
    { kunci: 'komponen_lain', judul: 'Komponen lain', rata: 'kanan', kelas: a, sel: tampilKomponenLain, nilai: komponenLainNeto },
    {
      kunci: 'cair',
      judul: 'Dana cair',
      rata: 'kanan',
      kelas: `${a} font-semibold`,
      sel: (t) => fmtRp(t.jumlah_cair),
      nilai: (t) => uang(t.jumlah_cair),
    },
    {
      kunci: 'terakhir',
      judul: 'Cair terakhir',
      kelas: a,
      sel: (t) => (t.dirilis_terakhir ? fmtDate(t.dirilis_terakhir) : '—'),
      nilai: (t) => (t.dirilis_terakhir ? new Date(t.dirilis_terakhir) : null),
    },
  ]
}
