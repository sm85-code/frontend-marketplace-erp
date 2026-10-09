import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { fmtDate, fmtDateTime, fmtMoney, fmtTime } from '@/api/client'
import type { Pesanan } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLATFORM_LABELS } from '@/config/roles'
import { bisaDicetak, bisaDiproses, labelProses, labelStatus, sudahDicetak } from '@/lib/pesanan'
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
  const kolom: KolomTabel<Pesanan>[] = [
    {
      kunci: 'pesanan',
      judul: 'No. Pesanan',
      kelas: 'max-w-[9.5rem] md:max-w-none',
      tetap: true,
      urut: { kunci: 'nomor' },
      sel: (p) => (
        <>
          <div className="flex items-center gap-1">
            <span className="min-w-0 break-all font-mono font-medium">{p.id_eksternal}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Salin kode pesanan ${p.id_eksternal}`} title="Salin kode pesanan" disabled={!p.id_eksternal} onClick={async () => {
              try {
                await navigator.clipboard.writeText(p.id_eksternal || '')
                toast.success('Kode pesanan disalin')
              } catch {
                toast.error('Gagal menyalin kode pesanan. Coba lagi.')
              }
            }}><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="teks-kecil truncate text-muted-foreground">
            {PLATFORM_LABELS[p.platform]}
            {p.nama_pembeli ? ` · ${p.nama_pembeli}` : ''}
          </div>
        </>
      ),
    },
    {
      kunci: 'tanggal',
      bawaan: false,
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
    { kunci: 'toko',
      bawaan: false, judul: 'Toko', kelas: 'min-w-[110px]', urut: { kunci: 'toko' }, sel: (p) => namaToko(p.akun_id) },
    {
      kunci: 'status',
      judul: 'Status',
      kelas: 'min-w-[120px]',
      urut: { kunci: 'status', label: ['Belum bayar dulu', 'Dibatalkan dulu'] },
      sel: (p) => (
        <>
          <Badge variant={varianStatus(p.status)} className="max-w-full whitespace-normal break-words leading-snug">
            {labelStatus(p)}
          </Badge>
          {p.status_marketplace === 'IN_CANCEL' && (
            <div className="teks-kecil mt-0.5 text-muted-foreground">Buka detail untuk menerima atau menolak.</div>
          )}
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
      kelas: 'min-w-[260px] max-w-[360px]',
      sel: (p) => <ItemRingkas items={p.items} />,
    },
    {
      kunci: 'varian',
      bawaan: false,
      judul: 'Varian',
      kelas: 'min-w-[120px]',
      sel: (p) => <div className="space-y-1.5">{p.items.map((i) => <div key={i.id} className="min-h-16">{i.model_name || '—'}</div>)}</div>,
    },
    { kunci: 'ship_by_date', judul: 'Kirim Sebelum', kelas: 'whitespace-nowrap', sel: (p) => {
      const timestamp = Number(p.ship_by_date)
      const date = new Date(timestamp * 1000)
      if (!timestamp || !Number.isFinite(date.getTime())) return '—'
      const iso = date.toISOString()
      return <div><div>{fmtDate(iso)}</div><div className="text-xs text-muted-foreground">{fmtTime(iso)} WIB</div></div>
    } },
    { kunci: 'sku', judul: 'SKU Produk', bawaan: false, sel: (p) => <div className="space-y-1.5">{p.items.map(i => <div key={i.id} className="min-h-16">{i.item_sku || '—'}</div>)}</div> },
    { kunci: 'sku_model', judul: 'SKU Varian', bawaan: false, sel: (p) => <div className="space-y-1.5">{p.items.map(i => <div key={i.id} className="min-h-16">{i.model_sku || '—'}</div>)}</div> },
    { kunci: 'jumlah', judul: 'Jumlah', bawaan: false, sel: p => <div className="space-y-1.5">{p.items.map(i => <div key={i.id} className="min-h-16">{i.qty}</div>)}</div> },
    { kunci: 'bayar', judul: 'Metode Bayar', bawaan: false, sel: (p) => p.payment_method || "" },
    { kunci: 'cod', judul: 'COD', bawaan: false, sel: (p) => p.cod ? "Ya" : "Tidak" },
    { kunci: 'ongkir', judul: 'Ongkir', bawaan: false, sel: (p) => <div>{p.actual_shipping_fee != null ? `${fmtMoney(p.actual_shipping_fee, p.currency)} (aktual${p.actual_shipping_fee_confirmed === false ? ' belum final' : ''})` : p.estimated_shipping_fee != null ? `${fmtMoney(p.estimated_shipping_fee, p.currency)} (estimasi)` : '—'}</div> },
    { kunci: 'penerima', judul: 'Nama Penerima', bawaan: false, sel: (p) => p.penerima || "" },
    { kunci: 'kota', judul: 'Kota Tujuan', bawaan: false, sel: (p) => p.kota || "" },
    { kunci: 'catatan', judul: 'Catatan untuk Penjual', bawaan: false, sel: (p) => <p className="whitespace-pre-wrap break-words">{p.message_to_seller || "—"}</p> },
    { kunci: 'batal', judul: 'Alasan Batal', bawaan: false, sel: (p) => [p.cancel_by, p.cancel_reason].filter(Boolean).join(" · ") },
    {
      kunci: 'total',
      judul: 'Total Pesanan',
      rata: 'kanan',
      bawaan: false,
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'total', arahAwal: 'desc', label: ['Terkecil', 'Terbesar'] },
      sel: (p) => fmtMoney(p.total, p.currency),
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
  const first=['pesanan','produk','status','ship_by_date']
  return kolom.sort((a,b)=>(first.includes(a.kunci)?first.indexOf(a.kunci):99)-(first.includes(b.kunci)?first.indexOf(b.kunci):99))
}

/** What each row / card offers: print the label (only when it can be printed) and open the detail. */
export function AksiPesanan({
  p,
  onCetak,
  onProses,
  cetakSibuk,
}: {
  p: Pesanan
  /** Prints the label of this one order (the click opens the tab, so it must run inside the click handler). */
  onCetak: (p: Pesanan) => void
  onProses: (p: Pesanan) => void
  cetakSibuk: boolean
}) {
  return (
    <div className="flex items-stretch justify-end gap-2">
      {bisaDiproses(p) && <Button size="sm" className="h-auto min-h-11 min-w-0 flex-1 whitespace-normal px-3 py-2 leading-snug md:flex-none" onClick={() => onProses(p)} disabled={cetakSibuk}>{labelProses(p)}</Button>}
      {bisaDicetak(p) && (
        <Button variant={sudahDicetak(p) ? 'outline' : 'default'} size="sm" className="h-auto min-h-11 min-w-0 flex-1 whitespace-normal px-3 py-2 leading-snug md:flex-none" onClick={() => onCetak(p)} disabled={cetakSibuk}>
          {sudahDicetak(p) ? 'Cetak ulang resi' : 'Cetak resi'}
        </Button>
      )}
      <Button asChild size="sm" variant="outline" className="h-auto min-h-11 shrink-0 px-4">
        <Link to={`/pesanan/${p.id}`}>Detail</Link>
      </Button>
    </div>
  )
}
