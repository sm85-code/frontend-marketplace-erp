import { tautanPesanan } from '@/lib/tautanPesanan'
import { Link } from 'react-router-dom'
import { useTokoAktif } from '@/lib/tokoAktif'
import QueryError from '@/components/QueryError'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as endpoints from '@/api/endpoints'
import { fmtDateTime, fmtRp } from '@/api/client'
import { qk } from '@/api/keys'
import type { Dashboard, DashboardProduk, DashboardToko, TahapPesanan } from '@/api/types'
import { BarHalaman, FilterPilih, type KolomTabel, TabelLokal } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableCell, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { PRESET_LABEL, rentangTanggal, type PresetTanggal } from '@/lib/rentang'

const PRESET_DASHBOARD: PresetTanggal[] = ['7', '15', '30', '90', 'bulan_ini']


const Angka = ({ n, tebal }: { n: number; tebal?: boolean }) => (
  <span className={n === 0 ? 'text-muted-foreground' : tebal ? 'font-semibold' : ''}>{n.toLocaleString('id-ID')}</span>
)

function Kartu({ label, nilai, catatan, href }: { label: string; nilai: string; catatan?: string; href?: string }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-2 p-3 md:p-4 xl:p-5">
        <div className="teks-kecil text-muted-foreground md:min-h-10 xl:min-h-0">{label}</div>
        <div className="text-xl font-bold tabular-nums md:text-3xl">{href ? <Link className="text-primary hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-primary" to={href}>{nilai}</Link> : nilai}</div>
        {catatan && <div className="teks-kecil mt-0.5 text-muted-foreground">{catatan}</div>}
      </CardContent>
    </Card>
  )
}

function Bagian({ judul, deskripsi, children }: { judul: string; deskripsi?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
        <CardTitle>{judul}</CardTitle>
        {deskripsi && <CardDescription>{deskripsi}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  )
}

const KOLOM_TOKO: KolomTabel<DashboardToko>[] = [
  { kunci: 'nama_toko', judul: 'Toko', kelas: 'min-w-[180px] max-w-[260px] break-words font-medium', sel: (t) => <Link className="font-medium text-primary hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-primary" to={tautanPesanan(t.akun_id ?? '')}>{t.nama_toko}</Link>, nilai: (t) => t.nama_toko },
  { kunci: 'pesanan', judul: 'Pesanan', rata: 'kanan', sel: (t) => <Angka n={t.pesanan} />, nilai: (t) => t.pesanan },
  { kunci: 'omzet', judul: 'Nilai Pesanan', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (t) => fmtRp(t.omzet), nilai: (t) => Number(t.omzet) },
  { kunci: 'belum_bayar', judul: 'Belum Bayar', rata: 'kanan', sel: (t) => <Angka n={t.belum_bayar} />, nilai: (t) => t.belum_bayar },
  { kunci: 'perlu_diproses', judul: 'Perlu Diproses', rata: 'kanan', sel: (t) => <Angka n={t.perlu_diproses} tebal />, nilai: (t) => t.perlu_diproses },
  { kunci: 'menunggu_kurir', judul: 'Menunggu Penyerahan', rata: 'kanan', sel: (t) => <Angka n={t.menunggu_kurir} />, nilai: (t) => t.menunggu_kurir },
  { kunci: 'dikirim', judul: 'Dikirim', rata: 'kanan', sel: (t) => <Angka n={t.dikirim} />, nilai: (t) => t.dikirim },
  { kunci: 'selesai', judul: 'Selesai', rata: 'kanan', sel: (t) => <Angka n={t.selesai} />, nilai: (t) => t.selesai },
  { kunci: 'dibatalkan', judul: 'Dibatalkan', rata: 'kanan', sel: (t) => <Angka n={t.dibatalkan} />, nilai: (t) => t.dibatalkan },
  {
    kunci: 'terbaru',
    judul: 'Pesanan Terakhir',
    kelas: 'whitespace-nowrap',
    sel: (t) => (t.pesanan_terbaru ? fmtDateTime(t.pesanan_terbaru) : '—'),
    nilai: (t) => (t.pesanan_terbaru ? new Date(t.pesanan_terbaru) : null),
  },
]

const KOLOM_PRODUK: KolomTabel<DashboardProduk>[] = [
  { kunci: 'nama', judul: 'Produk', kelas: 'min-w-[260px] max-w-[480px] break-words', sel: (p) => p.nama_produk, nilai: (p) => p.nama_produk },
  { kunci: 'qty', judul: 'Terjual', rata: 'kanan', kelas: 'font-semibold', sel: (p) => p.qty_terjual.toLocaleString('id-ID'), nilai: (p) => p.qty_terjual },
  { kunci: 'pesanan', judul: 'Pesanan', rata: 'kanan', sel: (p) => p.pesanan.toLocaleString('id-ID'), nilai: (p) => p.pesanan },
  { kunci: 'omzet', judul: 'Nilai Pesanan', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (p) => fmtRp(p.omzet), nilai: (p) => Number(p.omzet) },
  {
    kunci: 'toko',
    judul: 'Terjual di',
    kelas: 'min-w-[200px]',
    sel: (p) => p.toko.slice(0, 3).map((t) => `${t.nama_toko} (${t.qty})`).join(', ') + (p.toko.length > 3 ? ` +${p.toko.length - 3} toko` : ''),
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: semuaToko } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const [preset, setPreset] = useState<PresetTanggal>('15')
  const [toko,setToko]=useTokoAktif()
  // Whole local days, so the key (and the request) stays the same all day long instead of changing every render.
  const { dari = '', sampai = '' } = rentangTanggal(preset)

  const { data: d, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...qk.dashboard(dari, sampai),toko],
    queryFn: () => endpoints.laporanDashboard(dari, sampai,toko||undefined),
    enabled: !!user,
    placeholderData: (prev) => prev,
  })

  const tahap = Object.fromEntries((d?.per_tahap ?? []).map((t) => [t.tahap, t])) as Record<string, { jumlah: number; nilai: string }>
  const orderUrl = (tahap: TahapPesanan | '' = '', akun = toko) => tautanPesanan(akun, tahap, preset)

  return (
    <div className="space-y-4">
      <BarHalaman judul="Dashboard">
        <div className="grid w-full grid-cols-2 items-end gap-3 md:w-auto md:grid-cols-[180px_minmax(220px,280px)_auto]">
          {user && <FilterPilih
            id="dashboard-periode"
            label="Periode"
            nilai={preset}
            onUbah={(v) => setPreset(v as PresetTanggal)}
            opsi={PRESET_DASHBOARD.map((k) => ({ value: k, label: PRESET_LABEL[k] }))}
          />}
          <FilterPilih id="dashboard-toko" label="Toko" nilai={toko} onUbah={setToko} semua="Seluruh toko" opsi={(semuaToko ?? []).map(t => ({ value: t.id, label: t.nama_toko }))} />
          {isFetching && !isLoading && <Spinner size={18} label={null} className="self-center" />}
        </div>
      </BarHalaman>

      {error ? <QueryError error={error} retry={refetch} /> : isLoading || !d ? (
        <Spinner column label="Memuat ringkasan…" />
      ) : (
        <>
          <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kartu label="Jumlah Pesanan" nilai={d.per_tahap.reduce((total, item) => total + item.jumlah, 0).toLocaleString('id-ID')} href={orderUrl()} />
            <Kartu label="Belum Bayar" nilai={String(tahap.belum_bayar?.jumlah ?? 0)} href={orderUrl('belum_bayar')} />
            <Kartu label="Perlu Diproses" nilai={String(tahap.perlu_diproses?.jumlah ?? 0)} href={orderUrl('perlu_diproses')} />
            <Kartu label="Menunggu Penyerahan" nilai={String(tahap.menunggu_kurir?.jumlah ?? 0)} href={orderUrl('menunggu_kurir')} />
            <Kartu label="Permintaan Pembatalan" nilai={d.permintaan_pembatalan == null ? '—' : String(d.permintaan_pembatalan)} />
          </div>

          <section className="flex flex-wrap gap-2" aria-label="Pintasan pekerjaan"><Button asChild variant="outline"><Link to="/chat">Chat perlu dibalas</Link></Button></section>
          <Bagian judul="Ringkasan per Toko">
            <TabelLokal
              label="Ringkasan pesanan per toko"
              items={d.per_toko}
              kolom={KOLOM_TOKO}
              idDari={(t) => t.akun_id ?? 'none'}
              namaDari={(t) => t.nama_toko}
              urutAwal={{ kunci: 'omzet', arah: 'desc' }}
              minWidth={1050}
              footer={<TotalToko d={d} />}
            />
          </Bagian>

          <Bagian judul="10 Produk Terlaris">
            {d.produk_terlaris.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Belum ada penjualan pada periode ini.</p>
            ) : (
              <TabelLokal
                label="10 produk terlaris"
                items={d.produk_terlaris.slice(0,10)}
                kolom={KOLOM_PRODUK}
                idDari={(p) => p.nama_produk}
                namaDari={(p) => p.nama_produk}
                urutAwal={{ kunci: 'qty', arah: 'desc' }}
                minWidth={700}
              />
            )}
          </Bagian>

        </>
      )}
    </div>
  )
}

/** Totals row under the per-shop table. */
function TotalToko({ d }: { d: Dashboard }) {
  const jumlah = (k: 'belum_bayar' | 'perlu_diproses' | 'menunggu_kurir' | 'dikirim' | 'selesai' | 'dibatalkan' | 'pesanan') =>
    d.per_toko.reduce((a, t) => a + t[k], 0).toLocaleString('id-ID')
  return (
    <TableRow className="font-semibold">
      <TableCell>Total</TableCell>
      <TableCell className="text-right">{jumlah('pesanan')}</TableCell>
      <TableCell className="whitespace-nowrap text-right">{fmtRp(d.per_toko.reduce((a, t) => a + Number(t.omzet), 0))}</TableCell>
      <TableCell className="text-right">{jumlah('belum_bayar')}</TableCell>
      <TableCell className="text-right">{jumlah('perlu_diproses')}</TableCell>
      <TableCell className="text-right">{jumlah('menunggu_kurir')}</TableCell>
      <TableCell className="text-right">{jumlah('dikirim')}</TableCell>
      <TableCell className="text-right">{jumlah('selesai')}</TableCell>
      <TableCell className="text-right">{jumlah('dibatalkan')}</TableCell>
      <TableCell />
    </TableRow>
  )
}
