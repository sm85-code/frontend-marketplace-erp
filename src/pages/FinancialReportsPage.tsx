import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { fmtRp, getApiError } from '@/api/client'
import * as reports from '@/api/financialReports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BarHalaman from '@/components/daftar/BarHalaman'
import FinancialReportSheet from './FinancialReportSheet'
import Spinner from '@/components/Spinner'

const monthNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`
}
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export default function FinancialReportsPage() {
  const { user } = useAuth()
  const allowed = user?.role === 'admin'
  const [month, setMonth] = useState(monthNow)
  const overview = useQuery({
    queryKey: ['financial-reports', month],
    queryFn: () => reports.overview(month),
    enabled: allowed,
  })
  if (!allowed) return <p role="alert">Laporan keuangan hanya dapat diakses admin.</p>
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Laporan Keuangan" deskripsi="Laporan keuangan Bumi Lestari">
        <Label htmlFor="report-month">Bulan laporan</Label>
        <Input
          id="report-month"
          type="month"
          className="w-44"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </BarHalaman>
      {overview.isLoading && <Spinner label="Memuat laporan…" />}
      {overview.error && (
        <div role="alert">
          <p>{getApiError(overview.error)}</p>
          <Button onClick={() => void overview.refetch()}>Coba lagi</Button>
        </div>
      )}
      {overview.data && (
        <>
          <FinancialReportSheet
            data={overview.data}
            month={month}
            comparison={
              overview.data.laporan.length ? (
                <ReportComparison date={overview.data.laporan.at(-1)!.tanggal} />
              ) : undefined
            }
          />
        </>
      )}
    </div>
  )
}

function ReportComparison({ date }: { date: string }) {
  const q = useQuery({
    queryKey: ['financial-report-comparison', date],
    queryFn: () => reports.comparison(date),
    staleTime: 60_000,
  })
  const item = (label: string, amount: string | null) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {amount === null ? 'Belum lengkap' : fmtRp(amount)}
      </span>
    </div>
  )
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pembanding ERP</h2>
        <p className="mt-1 text-sm text-muted-foreground">Posisi laporan {dateLabel(date)}</p>
      </div>
      {q.isLoading && <Spinner label="Memuat pembanding…" />}
      {q.error && (
        <p role="alert" className="text-sm text-destructive">
          {getApiError(q.error)}
        </p>
      )}
      {q.data && (
        <>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Laporan utama</CardTitle>
                <p className="text-xs text-muted-foreground">Piutang dan saldo pada tanggal laporan</p>
              </CardHeader>
              <CardContent>
                {item('Piutang pengiriman', q.data.laporan.piutang_pengiriman)}
                {item('Saldo penjual belum ditarik', q.data.laporan.saldo_toko)}
                <div className="mt-4 rounded-xl bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total piutang laporan</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {fmtRp(q.data.laporan.piutang_total)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>ERP</CardTitle>
                {q.data.periode && (
                  <p className="text-xs text-muted-foreground">
                    {dateLabel(q.data.periode.mulai)}–{dateLabel(q.data.periode.akhir)} ·{' '}
                    {q.data.periode.hari} · 6 toko
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Pesanan dalam pengiriman (bruto)
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {fmtRp(q.data.erp.piutang_pengiriman_bruto)}
                  </p>
                </div>
                {(q.data.erp.estimasi_bumi_tani != null || q.data.erp.estimasi_cakupan_drive != null) && (
                  <details className="rounded-xl border bg-muted/20 p-3">
                    <summary className="cursor-pointer text-xs font-medium">
                      Rincian toko — sudah termasuk dalam total di atas
                    </summary>
                    <div className="mt-2 border-t">
                      {q.data.erp.estimasi_bumi_tani != null &&
                        item('BUMI TANI IND · Dana Cepat', q.data.erp.estimasi_bumi_tani)}
                      {q.data.erp.estimasi_cakupan_drive != null &&
                        item('Lima toko lainnya', q.data.erp.estimasi_cakupan_drive)}
                    </div>
                  </details>
                )}
                <div>
                  {item('Saldo penjual tiga toko belum ditarik', q.data.erp.saldo_toko)}
                  {q.data.erp.saldo_tertahan_cutoff && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Cut-off {dateLabel(q.data.erp.saldo_tertahan_cutoff)}, 23.59 WIB.
                    </p>
                  )}
                </div>
                <p className="rounded-xl bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  Nilai pengiriman ERP masih bruto. Total piutang ERP belum dihitung agar tidak tercampur
                  dengan saldo bersih.
                </p>
                {q.data.erp.rincian_toko?.some((t) => !t.akun_ditemukan) && (
                  <p role="status" className="text-xs text-destructive">
                    Sebagian akun toko belum ditemukan. Periksa rincian per toko.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Pemakaian iklan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Laporan utama
                  {q.data.periode_iklan_laporan && (
                    <>
                      {' '}
                      · {dateLabel(q.data.periode_iklan_laporan.mulai)}–
                      {dateLabel(q.data.periode_iklan_laporan.akhir)}
                    </>
                  )}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{fmtRp(q.data.laporan.biaya_iklan)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  ERP
                  {q.data.periode && (
                    <>
                      {' '}
                      · {dateLabel(q.data.periode.mulai)}–{dateLabel(q.data.periode.akhir)}
                    </>
                  )}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{fmtRp(q.data.erp.biaya_iklan)}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
