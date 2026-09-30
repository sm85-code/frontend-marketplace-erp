import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as endpoints from '@/api/endpoints'
import { fmtRp } from '@/api/client'
import { qk } from '@/api/keys'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/pesanan'

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [range] = useState({ dari: isoDaysAgo(30), sampai: isoDaysAgo(0) })
  const dariIso = range.dari.toISOString()
  const sampaiIso = range.sampai.toISOString()

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const { data: laporan, isLoading } = useQuery({
    queryKey: qk.laporanRingkas(dariIso, sampaiIso),
    queryFn: () => endpoints.laporanRingkas(dariIso, sampaiIso),
    enabled: user?.role === 'owner',
  })

  const statusChartData = useMemo(
    () =>
      laporan
        ? STATUS_ORDER.map((s) => ({ status: STATUS_LABELS[s], jumlah: laporan.jumlah_pesanan_per_status[s] ?? 0 }))
        : [],
    [laporan],
  )

  const produkChartData = useMemo(
    () => (laporan?.produk_terlaris ?? []).slice(0, 5).map((p) => ({ nama: p.nama_produk, qty: p.qty_terjual })),
    [laporan],
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-h1 font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan 30 hari terakhir · {akunList?.length ?? 0} toko terhubung</p>
      </div>

      {user?.role !== 'owner' ? (
        <Card>
          <CardHeader>
            <CardTitle>Selamat datang, {user?.nama}</CardTitle>
            <CardDescription>Buka menu Pesanan untuk melihat toko yang ditugaskan ke Anda.</CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading ? (
        <Spinner column label="Memuat ringkasan…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Omzet (30 hari)</div>
                <div className="text-2xl font-bold">{fmtRp(laporan?.total_omzet)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Toko Terhubung</div>
                <div className="text-2xl font-bold">{akunList?.length ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Perlu Diproses</div>
                <div className="text-2xl font-bold">{laporan?.jumlah_pesanan_per_status.to_ship ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Stok Kritis</div>
                <div className="text-2xl font-bold">{laporan?.stok_kritis.length ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pesanan per Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="jumlah" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produk Terlaris</CardTitle>
              </CardHeader>
              <CardContent>
                {produkChartData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Belum ada penjualan pada periode ini.</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={produkChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="nama" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip />
                        <Bar dataKey="qty" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stok Kritis</CardTitle>
              <CardDescription>Produk dengan stok tersedia ≤ 5</CardDescription>
            </CardHeader>
            <CardContent>
              {(laporan?.stok_kritis ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada produk dengan stok kritis. Bagus!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(laporan?.stok_kritis ?? []).map((p) => (
                    <Badge key={p.produk_id} variant="destructive">
                      {p.nama} — sisa {p.stok}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
