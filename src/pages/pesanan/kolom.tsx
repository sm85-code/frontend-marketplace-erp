import { Link } from 'react-router-dom'
import { fmtDate, fmtDateTime, fmtRp, fmtTime } from '@/api/client'
import type { Pesanan } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLATFORM_LABELS } from '@/config/roles'
import { bisaDicetak, labelStatus, sudahDicetak } from '@/lib/pesanan'
import { ItemRingkas } from './ItemRingkas'

function varianStatus(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'completed') return 'default'
  if (status === 'cancelled') return 'destructive'
  return 'secondary'
}

/**
 * Every column of the order list, declared once: it drives the table (desktop), the cards (phone),
 * the column picker and the sort dropdown. `urut.kunci` must be a sort key the API knows.
 */
export function kolomPesanan({ namaToko }: { namaToko: (akunId: string | null) => string }): KolomTabel<Pesanan>[] {
  return [
    {
      kunci: 'pesanan',
      judul: 'No. Pesanan',
      kelas: 'max-w-[9.5rem] md:max-w-none',
      tetap: true,
      urut: { kunci: 'nomor' },
      sel: (p) => (
        <>
          <div className="font-mono font-medium">{p.id_eksternal}</div>
          <div className="teks-kecil truncate text-muted-foreground">
            {PLATFORM_LABELS[p.platform]}
            {p.nama_pembeli ? ` · ${p.nama_pembeli}` : ''}
          </div>
        </>
      ),
    },
    {
      kunci: 'tanggal',
      judul: 'Tanggal Pesan',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'tanggal', arahAwal: 'desc', label: ['Terlama', 'Terbaru'] },
      sel: (p) => (
        <>
          <div>{fmtDate(p.dipesan_at ?? p.created_at)}</div>
          <div className="teks-kecil text-muted-foreground">{fmtTime(p.dipesan_at ?? p.created_at)}</div>
        </>
      ),
    },
    { kunci: 'toko', judul: 'Toko', kelas: 'min-w-[110px]', urut: { kunci: 'toko' }, sel: (p) => namaToko(p.akun_id) },
    {
      kunci: 'status',
      judul: 'Status',
      kelas: 'min-w-[120px]',
      urut: { kunci: 'status', label: ['Belum bayar dulu', 'Dibatalkan dulu'] },
      sel: (p) => (
        <>
          <Badge variant={varianStatus(p.status)} className="whitespace-nowrap">
            {labelStatus(p)}
          </Badge>
          {bisaDicetak(p) && (
            <div className="teks-kecil mt-0.5 text-muted-foreground">
              {sudahDicetak(p) ? `Resi dicetak ${fmtDateTime(p.resi_dicetak_at)}` : 'Resi belum dicetak'}
            </div>
          )}
        </>
      ),
    },
    {
      kunci: 'produk',
      judul: 'Produk',
      kelas: 'min-w-[200px] max-w-[280px]',
      sel: (p) => <ItemRingkas items={p.items} />,
    },
    {
      kunci: 'varian',
      judul: 'Varian',
      bawaan: false,
      kelas: 'min-w-[100px]',
      sel: (p) => p.items.map((i) => i.model_name).filter(Boolean).join(", "),
    },
    { kunci: 'ship_by_date', judul: 'Kirim Sebelum', kelas: 'whitespace-nowrap', sel: (p) => p.ship_by_date ? fmtDate(new Date(Number(p.ship_by_date) * 1000).toISOString()) : "" },
    { kunci: 'sku', judul: 'SKU Produk', bawaan: false, sel: (p) => p.items.map((i) => i.item_sku).filter(Boolean).join(", ") },
    { kunci: 'sku_model', judul: 'SKU Varian', bawaan: false, sel: (p) => p.items.map((i) => i.model_sku).filter(Boolean).join(", ") },
    { kunci: 'bayar', judul: 'Metode Bayar', bawaan: false, sel: (p) => p.payment_method || "" },
    { kunci: 'cod', judul: 'COD', bawaan: false, sel: (p) => p.cod ? "Ya" : "" },
    { kunci: 'ongkir', judul: 'Ongkir', bawaan: false, sel: (p) => p.actual_shipping_fee || p.estimated_shipping_fee || "" },
    { kunci: 'penerima', judul: 'Nama Penerima', bawaan: false, sel: (p) => p.penerima || "" },
    { kunci: 'kota', judul: 'Kota Tujuan', bawaan: false, sel: (p) => p.kota || "" },
    { kunci: 'catatan', judul: 'Catatan Pembeli', bawaan: false, sel: (p) => p.note || "" },
    { kunci: 'batal', judul: 'Alasan Batal', bawaan: false, sel: (p) => [p.cancel_by, p.cancel_reason].filter(Boolean).join(" · ") },
    {
      kunci: 'total',
      judul: 'Total Pesanan',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'total', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (p) => fmtRp(p.total),
    },
    {
      kunci: 'kurir',
      judul: 'Kurir & Resi',
      urut: { kunci: 'kurir' },
      sel: (p) => (
        <>
          <div>{p.kurir || '—'}</div>
          <div className="teks-kecil font-mono text-muted-foreground">{p.nomor_resi || ''}</div>
        </>
      ),
    },
  ]
}

/** What each row / card offers: print the label (only when it can be printed) and open the detail. */
export function AksiPesanan({
  p,
  onCetak,
  cetakSibuk,
}: {
  p: Pesanan
  /** Prints the label of this one order (the click opens the tab, so it must run inside the click handler). */
  onCetak: (p: Pesanan) => void
  cetakSibuk: boolean
}) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-2">
      {bisaDicetak(p) && (
        <Button variant={sudahDicetak(p) ? 'outline' : 'default'} size="sm" className="h-9 px-3" onClick={() => onCetak(p)} disabled={cetakSibuk}>
          {sudahDicetak(p) ? 'Cetak ulang resi' : 'Cetak resi'}
        </Button>
      )}
      <Button asChild size="sm" variant="outline" className="h-9 px-3">
        <Link to={`/pesanan/${p.id}`}>Detail</Link>
      </Button>
    </div>
  )
}
