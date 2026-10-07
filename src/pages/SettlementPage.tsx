import QueryError from '@/components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { AkunMarketplace, Settlement } from '@/api/types'
import { type KolomTabel, TabelLokal, BarHalaman } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PLATFORM_LABELS } from '@/config/roles'
import TransaksiDana from './settlement/TransaksiDana'
import DanaShopee from './settlement/DanaShopee'

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

const potongan = (s: Settlement) => Number(s.fee_platform) + Number(s.fee_payment) + Number(s.ongkir_subsidi) + Number(s.penalti)

function kolomSettlement(akunMap: Map<string, AkunMarketplace>): KolomTabel<Settlement>[] {
  const toko = (s: Settlement) => `${akunMap.get(s.akun_id)?.nama_toko ?? '—'} (${PLATFORM_LABELS[s.platform]})`
  return [
    {
      kunci: 'periode',
      judul: 'Periode',
      kelas: 'whitespace-nowrap',
      sel: (s) => `${fmtDate(s.periode_mulai)} – ${fmtDate(s.periode_selesai)}`,
      nilai: (s) => new Date(s.periode_mulai),
    },
    { kunci: 'toko', judul: 'Toko', sel: toko, nilai: toko },
    { kunci: 'gross', judul: 'Gross', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (s) => fmtRp(s.gross_sales), nilai: (s) => Number(s.gross_sales) },
    { kunci: 'fee', judul: 'Fee', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (s) => fmtRp(potongan(s)), nilai: potongan },
    { kunci: 'net', judul: 'Net', rata: 'kanan', kelas: 'whitespace-nowrap font-semibold', sel: (s) => fmtRp(s.net), nilai: (s) => Number(s.net) },
    { kunci: 'status', judul: 'Status', sel: (s) => <Badge variant={statusVariant(s.status)}>{s.status}</Badge>, nilai: (s) => s.status },
  ]
}

export default function SettlementPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))
  const { data, isLoading, error: queryError, refetch: retryQuery } = useQuery({ queryKey: qk.settlement({}), queryFn: () => endpoints.listSettlement() })

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
      {queryError && <QueryError error={queryError} retry={retryQuery} />}
      <BarHalaman judul="Settlement">
        <Button onClick={() => setDialogOpen(true)} disabled={!akunList?.length}>
          Catat Manual
        </Button>
      </BarHalaman>

      <DanaShopee />
      <TransaksiDana />

      <Card>
        <CardHeader>
          <CardTitle>Catatan Manual Pencairan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat settlement…" />
          ) : (
            <>
              <TabelLokal
                label="Daftar settlement"
                items={data}
                kolom={kolomSettlement(akunMap)}
                idDari={(s) => s.id}
                namaDari={(s) => `settlement ${fmtDate(s.periode_mulai)}`}
                urutAwal={{ kunci: 'periode', arah: 'desc' }}
                aksi={(s) =>
                  s.status !== 'paid' && (
                    <Button size="sm" variant="outline" onClick={() => markPaidMut.mutate(s.id)}>
                      Tandai Dibayar
                    </Button>
                  )
                }
                minWidth={760}
              />
              {(data ?? []).length === 0 && <p className="py-8 text-center text-muted-foreground">Belum ada catatan settlement.</p>}
            </>
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
              <Label htmlFor="settlement-toko-1">Toko</Label>
              <Select value={form.akun_id} onValueChange={(v) => setForm((f) => ({ ...f, akun_id: v }))}>
                <SelectTrigger id="settlement-toko-1" className="w-full">
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
                <Label htmlFor="settlement-periode-mulai-2">Periode Mulai</Label>
                <Input id="settlement-periode-mulai-2" type="date" value={form.periode_mulai} onChange={(e) => setForm((f) => ({ ...f, periode_mulai: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settlement-periode-selesai-3">Periode Selesai</Label>
                <Input id="settlement-periode-selesai-3" type="date" value={form.periode_selesai} onChange={(e) => setForm((f) => ({ ...f, periode_selesai: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="settlement-gross-sales-4">Gross Sales</Label>
                <Input id="settlement-gross-sales-4" type="number" value={form.gross_sales} onChange={(e) => setForm((f) => ({ ...f, gross_sales: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settlement-fee-platform-5">Fee Platform</Label>
                <Input id="settlement-fee-platform-5" type="number" value={form.fee_platform} onChange={(e) => setForm((f) => ({ ...f, fee_platform: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settlement-fee-payment-6">Fee Payment</Label>
                <Input id="settlement-fee-payment-6" type="number" value={form.fee_payment} onChange={(e) => setForm((f) => ({ ...f, fee_payment: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settlement-subsidi-ongkir-7">Subsidi Ongkir</Label>
                <Input id="settlement-subsidi-ongkir-7" type="number" value={form.ongkir_subsidi} onChange={(e) => setForm((f) => ({ ...f, ongkir_subsidi: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settlement-penalti-8">Penalti</Label>
                <Input id="settlement-penalti-8" type="number" value={form.penalti} onChange={(e) => setForm((f) => ({ ...f, penalti: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settlement-net-dana-masuk-9">Net (dana masuk)</Label>
                <Input id="settlement-net-dana-masuk-9" type="number" value={form.net} onChange={(e) => setForm((f) => ({ ...f, net: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settlement-catatan-10">Catatan</Label>
              <Textarea id="settlement-catatan-10" value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={createMut.isPending || !form.akun_id || !form.periode_mulai || !form.periode_selesai}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
