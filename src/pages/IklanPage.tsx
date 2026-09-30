import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { PLATFORM_LABELS } from '@/config/roles'

const emptyForm = { akun_id: '', produk_id: '', nama: '', budget_harian: '0', tanggal_mulai: '' }

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'aktif') return 'default'
  if (status === 'selesai') return 'secondary'
  return 'secondary'
}

export default function IklanPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const { data: produkList } = useQuery({ queryKey: qk.produk(), queryFn: endpoints.listProduk })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))
  const { data, isLoading } = useQuery({ queryKey: qk.campaign({}), queryFn: () => endpoints.listCampaign() })

  const createMut = useMutation({
    mutationFn: endpoints.createCampaign,
    onSuccess: () => {
      toast.success('Campaign dibuat')
      qc.invalidateQueries({ queryKey: ['iklan'] })
      setDialogOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  function onSubmit() {
    createMut.mutate({
      akun_id: form.akun_id,
      produk_id: form.produk_id || null,
      nama: form.nama,
      budget_harian: form.budget_harian,
      tanggal_mulai: new Date(form.tanggal_mulai || Date.now()).toISOString(),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Iklan</h1>
        <Button onClick={() => setDialogOpen(true)} disabled={!akunList?.length}>
          Buat Campaign
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Iklan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat campaign…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Budget/Hari</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nama}</TableCell>
                      <TableCell>
                        {akunMap.get(c.akun_id)?.nama_toko ?? '—'} ({PLATFORM_LABELS[c.platform]})
                      </TableCell>
                      <TableCell>{fmtRp(c.budget_harian)}</TableCell>
                      <TableCell>{fmtDate(c.tanggal_mulai)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/iklan/${c.id}`}>Kelola</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada campaign iklan.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <div className="space-y-1.5">
              <Label>Produk yang Dipromosikan (opsional, untuk hitung ROAS)</Label>
              <Select value={form.produk_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, produk_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tanpa produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa produk</SelectItem>
                  {(produkList ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Campaign</Label>
              <Input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget Harian (Rp)</Label>
                <Input type="number" value={form.budget_harian} onChange={(e) => setForm((f) => ({ ...f, budget_harian: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm((f) => ({ ...f, tanggal_mulai: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={!form.akun_id || !form.nama}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
