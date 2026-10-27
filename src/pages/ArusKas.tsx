import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as reports from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BarHalaman from '@/components/daftar/BarHalaman'
import Spinner from '@/components/Spinner'
import TabelArusKas from './TabelArusKas'
import RekeningTukangKayu from './RekeningTukangKayu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const monthNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`
}
export default function ArusKas() {
  const { user, bisa } = useAuth()
  const allowed = !!user && bisa('arus_kas')
  const [month, setMonth] = useState(monthNow)
  const overview = useQuery({ queryKey: ['financial-reports', month], queryFn: () => reports.overviewArusKas(month), enabled: allowed })
  if (!allowed) return <p role="alert">Arus kas hanya dapat diakses admin dan staf.</p>
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Arus Kas" deskripsi="Arus kas Bumi Lestari, otomatis dari laporan keuangan">
        <Label htmlFor="cash-month">Bulan</Label>
        <Input id="cash-month" type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      </BarHalaman>
      <Tabs defaultValue="arus" className="min-w-0">
        <div className="min-w-0 overflow-x-auto">
          <TabsList className="section-tabs order-status-tabs" aria-label="Bagian arus kas">
            <TabsTrigger value="arus">Arus Kas</TabsTrigger>
            <TabsTrigger value="rekening">Rekening</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="arus" className="min-w-0 space-y-5">
          {overview.isLoading && <Spinner label="Memuat arus kas…" />}
          {overview.error && (
            <div role="alert">
              <p>{getApiError(overview.error)}</p>
              <Button onClick={() => void overview.refetch()}>Coba lagi</Button>
            </div>
          )}
          {overview.data && <TabelArusKas data={overview.data} month={month} hanyaLihat denganBulanan tanpaCentang={!bisa('arus_kas', 'tulis')} />}
        </TabsContent>
        <TabsContent value="rekening" className="min-w-0">
          <RekeningTukangKayu />
        </TabsContent>
      </Tabs>
    </div>
  )
}

