import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { StatusIklan } from '@/api/types'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const TRANSISI: Record<StatusIklan, StatusIklan[]> = {
  draft: ['aktif', 'selesai'],
  aktif: ['dijeda', 'selesai'],
  dijeda: ['aktif', 'selesai'],
  selesai: [],
}

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function IklanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [dari, setDari] = useState(isoDaysAgo(30))
  const [sampai, setSampai] = useState(isoDaysAgo(0))
  const [metrikForm, setMetrikForm] = useState({ tanggal: isoDaysAgo(0), impression: '', klik: '', biaya: '' })

  const { data: campaign, isLoading } = useQuery({
    queryKey: qk.campaignOne(id!),
    queryFn: () => endpoints.getCampaign(id!),
    enabled: Boolean(id),
  })
  const { data: metrikList } = useQuery({
    queryKey: qk.metrikHarian(id!),
    queryFn: () => endpoints.listMetrikHarian(id!),
    enabled: Boolean(id),
  })
  const { data: laporan } = useQuery({
    queryKey: qk.laporanIklan(id!, dari, sampai),
    queryFn: () => endpoints.laporanIklan(id!, new Date(dari).toISOString(), new Date(sampai).toISOString()),
    enabled: Boolean(id),
  })

  const statusMut = useMutation({
    mutationFn: (status: string) => endpoints.updateCampaign(id!, { status }),
    onSuccess: () => {
      toast.success('Status campaign diperbarui')
      qc.invalidateQueries({ queryKey: ['iklan'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const metrikMut = useMutation({
    mutationFn: () =>
      endpoints.recordMetrikHarian(id!, {
        tanggal: new Date(metrikForm.tanggal).toISOString(),
        impression: Number(metrikForm.impression || 0),
        klik: Number(metrikForm.klik || 0),
        biaya: metrikForm.biaya || '0',
      }),
    onSuccess: () => {
      toast.success('Metrik harian disimpan')
      qc.invalidateQueries({ queryKey: ['iklan-metrik', id] })
      qc.invalidateQueries({ queryKey: ['iklan-laporan'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const chartData = useMemo(
    () => (metrikList ?? []).map((m) => ({ tanggal: fmtDate(m.tanggal), biaya: Number(m.biaya), klik: m.klik })),
    [metrikList],
  )

  if (isLoading || !campaign) return <Spinner column label="Memuat campaign…" />

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/iklan">← Kembali</Link>
        </Button>
        <h1 className="page-h1 font-heading text-xl font-bold">{campaign.nama}</h1>
        <Badge>{campaign.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {TRANSISI[campaign.status].map((next) => (
          <Button key={next} variant="outline" size="sm" onClick={() => statusMut.mutate(next)}>
            Ubah ke {next}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROAS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Dari</Label>
              <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sampai</Label>
              <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            </div>
          </div>
          {laporan && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Biaya</div>
                <div className="text-lg font-semibold">{fmtRp(laporan.total_biaya)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Omzet Atribusi</div>
                <div className="text-lg font-semibold">{fmtRp(laporan.omzet_atribusi)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">ROAS</div>
                <div className="text-lg font-semibold">{laporan.roas ? `${Number(laporan.roas).toFixed(2)}x` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CTR</div>
                <div className="text-lg font-semibold">{Number(laporan.ctr).toFixed(2)}%</div>
              </div>
            </div>
          )}
          {chartData.length > 0 && (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="biaya" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Input Spend Harian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={metrikForm.tanggal} onChange={(e) => setMetrikForm((f) => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Impression</Label>
              <Input type="number" value={metrikForm.impression} onChange={(e) => setMetrikForm((f) => ({ ...f, impression: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Klik</Label>
              <Input type="number" value={metrikForm.klik} onChange={(e) => setMetrikForm((f) => ({ ...f, klik: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Biaya (Rp)</Label>
              <Input type="number" value={metrikForm.biaya} onChange={(e) => setMetrikForm((f) => ({ ...f, biaya: e.target.value }))} />
            </div>
          </div>
          <Button onClick={() => metrikMut.mutate()} disabled={metrikMut.isPending}>
            Simpan Metrik Hari Ini
          </Button>

          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Impression</TableHead>
                  <TableHead>Klik</TableHead>
                  <TableHead className="text-right">Biaya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(metrikList ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtDate(m.tanggal)}</TableCell>
                    <TableCell>{m.impression}</TableCell>
                    <TableCell>{m.klik}</TableCell>
                    <TableCell className="text-right">{fmtRp(m.biaya)}</TableCell>
                  </TableRow>
                ))}
                {(metrikList ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Belum ada data spend harian.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableShell>
        </CardContent>
      </Card>
    </div>
  )
}
