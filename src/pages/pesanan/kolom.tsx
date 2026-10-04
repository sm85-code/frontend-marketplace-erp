import { Link } from 'react-router-dom'
import { fmtDate, fmtDateTime, fmtRp, fmtTime } from '@/api/client'
import type { Pesanan } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLATFORM_LABELS } from '@/config/roles'
import { bisaDicetak, labelStatus, ringkasItem, sudahDicetak } from '@/lib/pesanan'

function varianStatus(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'completed') return 'default'
  if (status === 'cancelled') return 'destructive'
  return 'secondary'
}

/**
 * Every column of the order list, declared once: it drives the table (desktop), the cards (phone),
 * the column picker and the sort dropdown. `urut.kunci` must be a sort key the API knows.
 */
export function kolomPesanan({
  namaToko,
  onCetak,
  cetakSibuk,
}: {
  namaToko: (akunId: string | null) => string
  /** Prints the label of this one order (the click opens the tab, so it must run inside the click handler). */
  onCetak: (p: Pesanan) => void
  cetakSibuk: boolean
}): KolomTabel<Pesanan>[] {
  return [
    {
      kunci: 'tanggal',
      judul: 'Tanggal pesan',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'tanggal', arahAwal: 'desc', label: ['Terlama', 'Terbaru'] },
      sel: (p) => (
        <>
          <div>{fmtDate(p.dipesan_at ?? p.created_at)}</div>
          <div className="teks-kecil text-muted-foreground">{fmtTime(p.dipesan_at ?? p.created_at)}</div>
        </>
      ),
    },
    {
      kunci: 'pesanan',
      judul: 'No. Pesanan',
      kartu: 'utama',
      urut: { kunci: 'nomor' },
      sel: (p) => (
        <>
          <div className="font-mono font-medium">{p.id_eksternal}</div>
          <div className="teks-kecil text-muted-foreground">
            {PLATFORM_LABELS[p.platform]}
            {p.nama_pembeli ? ` · ${p.nama_pembeli}` : ''}
          </div>
        </>
      ),
    },
    { kunci: 'toko', judul: 'Toko', kelas: 'min-w-[110px]', urut: { kunci: 'toko' }, sel: (p) => namaToko(p.akun_id) },
    {
      kunci: 'status',
      judul: 'Status',
      kelas: 'min-w-[120px]',
      kartu: 'utama',
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
    { kunci: 'produk', judul: 'Produk', kelas: 'min-w-[170px] max-w-[260px]', sel: (p) => ringkasItem(p) },
    {
      kunci: 'total',
      judul: 'Total',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'total', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (p) => fmtRp(p.total),
    },
    {
      kunci: 'kurir',
      judul: 'Kurir / No. resi',
      urut: { kunci: 'kurir' },
      sel: (p) => (
        <>
          <div>{p.kurir || '—'}</div>
          <div className="teks-kecil font-mono text-muted-foreground">{p.nomor_resi || ''}</div>
        </>
      ),
    },
    {
      kunci: 'cetak',
      judul: 'Cetak resi',
      kelas: 'whitespace-nowrap',
      sel: (p) =>
        bisaDicetak(p) ? (
          <Button variant={sudahDicetak(p) ? 'outline' : 'default'} size="sm" onClick={() => onCetak(p)} disabled={cetakSibuk}>
            {sudahDicetak(p) ? 'Cetak ulang' : 'Cetak resi'}
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]
}

/** The "Detail" link at the end of each row / card. */
export function AksiDetail({ p }: { p: Pesanan }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link to={`/pesanan/${p.id}`}>Detail</Link>
    </Button>
  )
}
