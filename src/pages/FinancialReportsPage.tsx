import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { getApiError } from '@/api/client'
import * as reports from '@/api/financialReports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function FinancialReportsPage() {
  const { bisa } = useAuth()
  const allowed = bisa('laporan_keuangan')
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
          <FinancialReportSheet data={overview.data} month={month} />
        </>
      )}
    </div>
  )
}
