import { tautanPesanan } from '@/lib/tautanPesanan'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { useTokoAktif } from '@/lib/tokoAktif'
import Bantuan from '@/components/Bantuan'
import QueryError from '@/components/QueryError'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtDateTime, fmtRp } from '@/api/client'
import { qk } from '@/api/keys'
import type { Dashboard, DashboardProduk, DashboardToko, TahapPesanan } from '@/api/types'
import { BarHalaman, FilterPilih, type KolomTabel, TabelLokal } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableCell, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { TAHAP_LABELS } from '@/lib/pesanan'
import { PRESET_LABEL, rentangTanggal, type PresetTanggal } from '@/lib/rentang'

const PRESET_DASHBOARD: PresetTanggal[] = ['7', '30', '90', 'bulan_ini']


const Angka = ({ n, tebal }: { n: number; tebal?: boolean }) => (
  <span className={n === 0 ? 'text-muted-foreground' : tebal ? 'font-semibold' : ''}>{n.toLocaleString('id-ID')}</span>
)

function Kartu({ label, nilai, catatan, href }: { label: string; nilai: string; catatan?: string; href?: string }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="teks-kecil text-muted-foreground">{label}</div>
        <div className="text-base font-bold tabular-nums sm:text-2xl">{href ? <Link className="text-primary hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-primary" to={href}>{nilai}</Link> : nilai}</div>
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
  { kunci: 'nama_toko', judul: 'Toko', kelas: 'font-medium', sel: (t) => <Link className="font-medium text-primary hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-primary" to={tautanPesanan(t.akun_id ?? '')}>{t.nama_toko}</Link>, nilai: (t) => t.nama_toko },
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
  { kunci: 'nama', judul: 'Produk', kelas: 'min-w-[220px] max-w-[420px]', sel: (p) => p.nama_produk, nilai: (p) => p.nama_produk },
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
  const [preset, setPreset] = useState<PresetTanggal>('30')
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
  const hari = d?.per_hari ?? []
  const orderUrl = (tahap: TahapPesanan | '' = '', akun = toko) => tautanPesanan(akun, tahap, preset)
  const dataBaruSejak = d?.data_sejak && dari && new Date(d.data_sejak) > new Date(dari) ? d.data_sejak : null

  return (
    <div className="space-y-4">
      <BarHalaman
        judul="Dashboard"
        deskripsi={`${PRESET_LABEL[preset]} · ${d?.jumlah_toko ?? 0} toko terhubung${user?.role === 'staff' ? ' yang ditugaskan kepada Anda' : ''} · berdasarkan tanggal pelanggan memesan`}
      >
        {user && (
          <div className="w-48">
            <FilterPilih
              id="dashboard-periode"
              label="Periode"
              nilai={preset}
              onUbah={(v) => setPreset(v as PresetTanggal)}
              opsi={PRESET_DASHBOARD.map((k) => ({ value: k, label: PRESET_LABEL[k] }))}
            />
          </div>
        )}
        <div className="w-48"><FilterPilih id="dashboard-toko" label="Toko" nilai={toko} onUbah={setToko} semua="Seluruh toko" opsi={(semuaToko??[]).map(t=>({value:t.id,label:t.nama_toko}))}/></div>
        {isFetching && !isLoading && <Spinner size={18} />}
      </BarHalaman>

      {error ? <QueryError error={error} retry={refetch} /> : isLoading || !d ? (
        <Spinner column label="Memuat ringkasan…" />
      ) : (
        <>
          {dataBaruSejak && (
            <div role="status" className="teks-data rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
              Pesanan di ERP baru tercatat sejak <b>{fmtDate(dataBaruSejak)}</b>, jadi angka pada tanggal sebelum itu belum lengkap.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">
            <Kartu label="Nilai Pesanan" nilai={fmtRp(d.total_omzet)} catatan="Termasuk ongkir/promo; bukan pendapatan bersih" />
            <Kartu label="Pesanan" nilai={d.total_pesanan.toLocaleString('id-ID')} href={orderUrl()} />
            <Kartu label="Rata-rata per pesanan" nilai={fmtRp(d.rata_rata_pesanan)} />
            <Kartu label="Perlu Diproses" nilai={String(tahap.perlu_diproses?.jumlah ?? 0)} href={orderUrl('perlu_diproses')} />
            <Kartu label="Menunggu Penyerahan" nilai={String(tahap.menunggu_kurir?.jumlah ?? 0)} href={orderUrl('menunggu_kurir')} />
          </div>

          <section className="flex flex-wrap gap-2" aria-label="Pintasan pekerjaan"><Button asChild><Link to={orderUrl('perlu_diproses')}>Proses pesanan</Link></Button><Button asChild variant="outline"><Link to="/chat">Chat perlu dibalas</Link></Button><Button asChild variant="outline"><Link to="/pesanan/retur">Retur & Refund</Link></Button></section>
          <Bagian judul="Ringkasan per Toko">
            <TabelLokal
              label="Ringkasan pesanan per toko"
              items={d.per_toko}
              kolom={KOLOM_TOKO}
              idDari={(t) => t.akun_id ?? 'none'}
              namaDari={(t) => t.nama_toko}
              urutAwal={{ kunci: 'omzet', arah: 'desc' }}
              minWidth={820}
              footer={<TotalToko d={d} />}
            />
          </Bagian>

          <Bagian judul="Aktivitas Pesanan">
            {hari.length ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={hari.map(h=>({...h,nilai:Number(h.omzet)}))}><XAxis dataKey="tanggal" tickFormatter={v=>fmtDate(v)} minTickGap={35}/><YAxis width={55} tickFormatter={v=>new Intl.NumberFormat('id-ID',{notation:'compact'}).format(v)}/><Tooltip formatter={v=>fmtRp(Number(v))} labelFormatter={v=>fmtDate(String(v))}/><Area dataKey="nilai" name="Nilai pesanan" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15}/></AreaChart></ResponsiveContainer></div> : <p>Belum ada aktivitas pada periode ini.</p>}
            <Bantuan rincian judul="Rincian status pesanan">            <Bagian judul="Pesanan per Status">
              <TabelLokal
                label="Jumlah dan nilai pesanan per status"
                items={d.per_tahap}
                kolom={[
                  { kunci: 'tahap', judul: 'Status', sel: (t) => TAHAP_LABELS[t.tahap] },
                  { kunci: 'jumlah', judul: 'Jumlah', rata: 'kanan', sel: (t) => <Angka n={t.jumlah} />, nilai: (t) => t.jumlah },
                  {
                    kunci: 'porsi',
                    judul: 'Porsi',
                    rata: 'kanan',
                    kelas: 'text-muted-foreground',
                    sel: (t) => {
                      const semua = d.per_tahap.reduce((a, x) => a + x.jumlah, 0)
                      return semua ? `${Math.round((t.jumlah / semua) * 100)}%` : '—'
                    },
                    nilai: (t) => t.jumlah,
                  },
                  { kunci: 'nilai', judul: 'Nilai', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (t) => fmtRp(t.nilai), nilai: (t) => Number(t.nilai) },
                ]}
                idDari={(t) => t.tahap}
                namaDari={(t) => TAHAP_LABELS[t.tahap]}
                minWidth={380}
              />
            </Bagian>

</Bantuan>
          </Bagian>
          <Bagian judul="5 Produk Terlaris">
            {d.produk_terlaris.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Belum ada penjualan pada periode ini.</p>
            ) : (
              <TabelLokal
                label="5 produk terlaris"
                items={d.produk_terlaris.slice(0,5)}
                kolom={KOLOM_PRODUK}
                idDari={(p) => p.nama_produk}
                namaDari={(p) => p.nama_produk}
                urutAwal={{ kunci: 'qty', arah: 'desc' }}
                minWidth={700}
              />
            )}
          </Bagian>

          <Bagian judul="Stok Kritis ERP">
            {d.stok_kritis.length === 0 ? (
              <p className="text-muted-foreground">Tidak ada produk induk dengan stok kritis.</p>
            ) : (
              <TabelLokal
                label="Produk dengan stok kritis"
                items={d.stok_kritis.slice(0,5)}
                kolom={[
                  { kunci: 'sku', judul: 'SKU', kelas: 'font-mono', sel: (p) => p.sku_induk, nilai: (p) => p.sku_induk },
                  { kunci: 'nama', judul: 'Produk', sel: (p) => p.nama, nilai: (p) => p.nama },
                  { kunci: 'stok', judul: 'Stok', rata: 'kanan', kelas: 'font-semibold', sel: (p) => p.stok, nilai: (p) => p.stok },
                ]}
                idDari={(p) => p.produk_id}
                namaDari={(p) => p.nama}
                urutAwal={{ kunci: 'stok', arah: 'asc' }}
                minWidth={380}
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
