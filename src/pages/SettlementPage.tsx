import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PLATFORM_LABELS } from '@/config/roles'

const emptyForm = {
  akun_id: '',
  periode_mulai: '',
  periode_selesai: '',
  gross_sales: '0',
  fee_platform: '0',
  fee_payment: '0',
  ongkir_subsidi: '0',
  penalti: '0',
  net: '0',
  catatan: '',
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'matched' || status === 'paid') return 'default'
  if (status === 'discrepancy') return 'destructive'
  return 'secondary'
}

export default function SettlementPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))
  const { data, isLoading } = useQuery({ queryKey: qk.settlement({}), queryFn: () => endpoints.listSettlement() })

  const createMut = useMutation({
    mutationFn: endpoints.createSettlement,
    onSuccess: () => {
      toast.success('Settlement dicatat')
      qc.invalidateQueries({ queryKey: ['settlement'] })
      setDialogOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const markPaidMut = useMutation({
    mutationFn: (id: string) => endpoints.updateSettlement(id, { status: 'paid' }),
    onSuccess: () => {
      toast.success('Ditandai sudah dibayar')
      qc.invalidateQueries({ queryKey: ['settlement'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  function onSubmit() {
    createMut.mutate({
      akun_id: form.akun_id,
      periode_mulai: new Date(form.periode_mulai).toISOString(),
      periode_selesai: new Date(form.periode_selesai).toISOString(),
      gross_sales: form.gross_sales,
      fee_platform: form.fee_platform,
      fee_payment: form.fee_payment,
      ongkir_subsidi: form.ongkir_subsidi,
      penalti: form.penalti,
      net: form.net,
      catatan: form.catatan || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Settlement</h1>
        <Button onClick={() => setDialogOpen(true)} disabled={!akunList?.length}>
          Catat Settlement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rekonsiliasi Pencairan Dana</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat settlement…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {fmtDate(s.periode_mulai)} – {fmtDate(s.periode_selesai)}
                      </TableCell>
                      <TableCell>
                        {akunMap.get(s.akun_id)?.nama_toko ?? '—'} ({PLATFORM_LABELS[s.platform]})
                      </TableCell>
                      <TableCell>{fmtRp(s.gross_sales)}</TableCell>
                      <TableCell>
                        {fmtRp(Number(s.fee_platform) + Number(s.fee_payment) + Number(s.ongkir_subsidi) + Number(s.penalti))}
                      </TableCell>
                      <TableCell className="font-semibold">{fmtRp(s.net)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.status !== 'paid' && (
                          <Button size="sm" variant="outline" onClick={() => markPaidMut.mutate(s.id)}>
                            Tandai Dibayar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Belum ada catatan settlement.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catat Settlement</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Toko</Label>
              <Select value={form.akun_id} onValueChange={(v) => setForm((f) => ({ ...f, akun_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih toko" />
                </SelectTrigger>
                <SelectContent>
                  {(akunList ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nama_toko} — {PLATFORM_LABELS[a.platform]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Periode Mulai</Label>
                <Input type="date" value={form.periode_mulai} onChange={(e) => setForm((f) => ({ ...f, periode_mulai: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Periode Selesai</Label>
                <Input type="date" value={form.periode_selesai} onChange={(e) => setForm((f) => ({ ...f, periode_selesai: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gross Sales</Label>
                <Input type="number" value={form.gross_sales} onChange={(e) => setForm((f) => ({ ...f, gross_sales: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fee Platform</Label>
                <Input type="number" value={form.fee_platform} onChange={(e) => setForm((f) => ({ ...f, fee_platform: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fee Payment</Label>
                <Input type="number" value={form.fee_payment} onChange={(e) => setForm((f) => ({ ...f, fee_payment: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Subsidi Ongkir</Label>
                <Input type="number" value={form.ongkir_subsidi} onChange={(e) => setForm((f) => ({ ...f, ongkir_subsidi: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Penalti</Label>
                <Input type="number" value={form.penalti} onChange={(e) => setForm((f) => ({ ...f, penalti: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Net (dana masuk)</Label>
                <Input type="number" value={form.net} onChange={(e) => setForm((f) => ({ ...f, net: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={!form.akun_id || !form.periode_mulai || !form.periode_selesai}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
