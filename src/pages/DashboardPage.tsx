import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtDateTime, fmtRp } from '@/api/client'
import { qk } from '@/api/keys'
import Medan from '@/components/Medan'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { isOwnerLevel } from '@/config/roles'
import { useAuth } from '@/lib/auth'
import { TAHAP_LABELS } from '@/lib/pesanan'
import { PRESET_LABEL, rentangTanggal, type PresetTanggal } from '@/lib/rentang'

const PRESET_DASHBOARD: PresetTanggal[] = ['7', '30', '90', 'bulan_ini']
const HARI_DITAMPILKAN = 14

function Angka({ n, tebal }: { n: number; tebal?: boolean }) {
  return <span className={n === 0 ? 'text-muted-foreground' : tebal ? 'font-semibold' : ''}>{n.toLocaleString('id-ID')}</span>
}

function Kartu({ label, nilai, catatan }: { label: string; nilai: string; catatan?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{nilai}</div>
        {catatan && <div className="mt-0.5 text-xs text-muted-foreground">{catatan}</div>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [preset, setPreset] = useState<PresetTanggal>('30')
  const [semuaHari, setSemuaHari] = useState(false)
  // Whole local days, so the key (and the request) stays the same all day long instead of changing every render.
  const { dari = '', sampai = '' } = rentangTanggal(preset)

  const { data: d, isLoading, isFetching } = useQuery({
    queryKey: qk.dashboard(dari, sampai),
    queryFn: () => endpoints.laporanDashboard(dari, sampai),
    enabled: isOwnerLevel(user?.role),
    placeholderData: (prev) => prev,
  })

  const totalPerToko = (d?.per_toko ?? []).reduce(
    (a, t) => ({
      pesanan: a.pesanan + t.pesanan,
      omzet: a.omzet + Number(t.omzet),
      belum_bayar: a.belum_bayar + t.belum_bayar,
      perlu_diproses: a.perlu_diproses + t.perlu_diproses,
      menunggu_kurir: a.menunggu_kurir + t.menunggu_kurir,
      dikirim: a.dikirim + t.dikirim,
      selesai: a.selesai + t.selesai,
      dibatalkan: a.dibatalkan + t.dibatalkan,
    }),
    { pesanan: 0, omzet: 0, belum_bayar: 0, perlu_diproses: 0, menunggu_kurir: 0, dikirim: 0, selesai: 0, dibatalkan: 0 },
  )
  const tahap = Object.fromEntries((d?.per_tahap ?? []).map((t) => [t.tahap, t])) as Record<string, { jumlah: number; nilai: string }>
  const jumlahSemua = (d?.per_tahap ?? []).reduce((a, t) => a + t.jumlah, 0)
  const hari = d?.per_hari ?? []
  const hariTampil = semuaHari ? hari : hari.slice(0, HARI_DITAMPILKAN)
  const dataBaruSejak = d?.data_sejak && dari && new Date(d.data_sejak) > new Date(dari) ? d.data_sejak : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-h1 font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {PRESET_LABEL[preset]} · {d?.jumlah_toko ?? 0} toko terhubung · berdasarkan tanggal pelanggan memesan
          </p>
        </div>
        {isOwnerLevel(user?.role) && (
          <div className="flex items-end gap-2">
            {isFetching && !isLoading && <Spinner size={18} />}
            <Medan label="Periode" untuk="dashboard-periode">
              <Select value={preset} onValueChange={(v) => setPreset(v as PresetTanggal)}>
                <SelectTrigger id="dashboard-periode" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_DASHBOARD.map((k) => (
                    <SelectItem key={k} value={k}>
                      {PRESET_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Medan>
          </div>
        )}
      </div>

      {!isOwnerLevel(user?.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Selamat datang, {user?.nama}</CardTitle>
            <CardDescription>Buka menu Pesanan untuk melihat toko yang ditugaskan ke Anda.</CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading || !d ? (
        <Spinner column label="Memuat ringkasan…" />
      ) : (
        <>
          {dataBaruSejak && (
            <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Pesanan di ERP baru tercatat sejak <b>{fmtDate(dataBaruSejak)}</b>, jadi angka pada tanggal sebelum itu belum lengkap.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kartu label="Omzet" nilai={fmtRp(d.total_omzet)} catatan="tidak termasuk belum bayar & batal" />
            <Kartu label="Pesanan" nilai={d.total_pesanan.toLocaleString('id-ID')} />
            <Kartu label="Rata-rata per pesanan" nilai={fmtRp(d.rata_rata_pesanan)} />
            <Kartu label="Perlu Diproses" nilai={String(tahap.perlu_diproses?.jumlah ?? 0)} catatan="harus diatur pengirimannya" />
            <Kartu label="Menunggu Kurir" nilai={String(tahap.menunggu_kurir?.jumlah ?? 0)} catatan="sudah diproses, belum diambil" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan per Toko</CardTitle>
              <CardDescription>Jumlah pesanan per tahap, diurutkan dari omzet terbesar.</CardDescription>
            </CardHeader>
            <CardContent>
              <TableShell minWidth={980} label="Ringkasan per toko">
                <Table>
                  <caption className="sr-only">Ringkasan pesanan per toko</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Toko</TableHead>
                      <TableHead className="text-right">Pesanan</TableHead>
                      <TableHead className="text-right">Omzet</TableHead>
                      <TableHead className="text-right">Belum Bayar</TableHead>
                      <TableHead className="text-right">Perlu Diproses</TableHead>
                      <TableHead className="text-right">Menunggu Kurir</TableHead>
                      <TableHead className="text-right">Dikirim</TableHead>
                      <TableHead className="text-right">Selesai</TableHead>
                      <TableHead className="text-right">Dibatalkan</TableHead>
                      <TableHead>Pesanan Terakhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.per_toko.map((t) => (
                      <TableRow key={t.akun_id ?? 'none'}>
                        <TableCell className="font-medium">{t.nama_toko}</TableCell>
                        <TableCell className="text-right"><Angka n={t.pesanan} /></TableCell>
                        <TableCell className="whitespace-nowrap text-right">{fmtRp(t.omzet)}</TableCell>
                        <TableCell className="text-right"><Angka n={t.belum_bayar} /></TableCell>
                        <TableCell className="text-right"><Angka n={t.perlu_diproses} tebal /></TableCell>
                        <TableCell className="text-right"><Angka n={t.menunggu_kurir} /></TableCell>
                        <TableCell className="text-right"><Angka n={t.dikirim} /></TableCell>
                        <TableCell className="text-right"><Angka n={t.selesai} /></TableCell>
                        <TableCell className="text-right"><Angka n={t.dibatalkan} /></TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{t.pesanan_terbaru ? fmtDateTime(t.pesanan_terbaru) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalPerToko.pesanan.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">{fmtRp(totalPerToko.omzet)}</TableCell>
                      <TableCell className="text-right">{totalPerToko.belum_bayar}</TableCell>
                      <TableCell className="text-right">{totalPerToko.perlu_diproses}</TableCell>
                      <TableCell className="text-right">{totalPerToko.menunggu_kurir}</TableCell>
                      <TableCell className="text-right">{totalPerToko.dikirim}</TableCell>
                      <TableCell className="text-right">{totalPerToko.selesai}</TableCell>
                      <TableCell className="text-right">{totalPerToko.dibatalkan}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableShell>
            </CardContent>
          </Card>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pesanan per Status</CardTitle>
              </CardHeader>
              <CardContent>
                <TableShell minWidth={420} label="Pesanan per status">
                  <Table>
                    <caption className="sr-only">Jumlah dan nilai pesanan per status</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Porsi</TableHead>
                        <TableHead className="text-right">Nilai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.per_tahap.map((t) => (
                        <TableRow key={t.tahap}>
                          <TableCell>{TAHAP_LABELS[t.tahap]}</TableCell>
                          <TableCell className="text-right"><Angka n={t.jumlah} /></TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {jumlahSemua ? `${Math.round((t.jumlah / jumlahSemua) * 100)}%` : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">{fmtRp(t.nilai)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-semibold">
                        <TableCell>Semua</TableCell>
                        <TableCell className="text-right">{jumlahSemua.toLocaleString('id-ID')}</TableCell>
                        <TableCell />
                        <TableCell className="whitespace-nowrap text-right">
                          {fmtRp(d.per_tahap.reduce((a, t) => a + Number(t.nilai), 0))}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TableShell>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Penjualan per Hari</CardTitle>
                <CardDescription>Tanggal pelanggan memesan (WIB), tidak termasuk belum bayar & batal.</CardDescription>
              </CardHeader>
              <CardContent>
                {hari.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan pada periode ini.</p>
                ) : (
                  <>
                    <TableShell minWidth={360} label="Penjualan per hari">
                      <Table>
                        <caption className="sr-only">Penjualan per hari</caption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead className="text-right">Pesanan</TableHead>
                            <TableHead className="text-right">Omzet</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hariTampil.map((h) => (
                            <TableRow key={h.tanggal}>
                              <TableCell>{fmtDate(h.tanggal)}</TableCell>
                              <TableCell className="text-right"><Angka n={h.pesanan} /></TableCell>
                              <TableCell className="whitespace-nowrap text-right">{fmtRp(h.omzet)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableShell>
                    {hari.length > HARI_DITAMPILKAN && (
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSemuaHari((v) => !v)}>
                        {semuaHari ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${hari.length} hari)`}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Produk Terlaris</CardTitle>
              <CardDescription>20 teratas menurut jumlah terjual, dengan toko tempat terjualnya.</CardDescription>
            </CardHeader>
            <CardContent>
              {d.produk_terlaris.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan pada periode ini.</p>
              ) : (
                <TableShell minWidth={760} label="Produk terlaris">
                  <Table>
                    <caption className="sr-only">20 produk terlaris</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Terjual</TableHead>
                        <TableHead className="text-right">Pesanan</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead>Terjual di</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.produk_terlaris.map((p, i) => (
                        <TableRow key={p.nama_produk}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="min-w-[240px] max-w-[420px]">{p.nama_produk}</TableCell>
                          <TableCell className="text-right font-semibold">{p.qty_terjual.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right">{p.pesanan.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{fmtRp(p.omzet)}</TableCell>
                          <TableCell className="min-w-[200px] text-sm">
                            {p.toko.slice(0, 3).map((t) => `${t.nama_toko} (${t.qty})`).join(', ')}
                            {p.toko.length > 3 ? ` +${p.toko.length - 3} toko` : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableShell>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stok Kritis</CardTitle>
              <CardDescription>Produk induk di ERP dengan stok tersedia ≤ 5. Stok toko Shopee tidak dihitung di sini.</CardDescription>
            </CardHeader>
            <CardContent>
              {d.stok_kritis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada produk induk dengan stok kritis.</p>
              ) : (
                <TableShell minWidth={420} label="Stok kritis">
                  <Table>
                    <caption className="sr-only">Produk dengan stok kritis</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.stok_kritis.map((p) => (
                        <TableRow key={p.produk_id}>
                          <TableCell className="font-mono text-xs">{p.sku_induk}</TableCell>
                          <TableCell>{p.nama}</TableCell>
                          <TableCell className="text-right font-semibold">{p.stok}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableShell>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
