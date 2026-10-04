import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { AkunMarketplace, IklanCampaign } from '@/api/types'
import { type KolomTabel, TabelLokal, BarHalaman } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORM_LABELS } from '@/config/roles'
import PerformaShopee from './iklan/PerformaShopee'
import IklanShopee from './IklanShopeePage'

const emptyForm = { akun_id: '', produk_id: '', nama: '', budget_harian: '0', tanggal_mulai: '' }

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'aktif') return 'default'
  if (status === 'selesai') return 'secondary'
  return 'secondary'
}

function kolomCampaign(akunMap: Map<string, AkunMarketplace>): KolomTabel<IklanCampaign>[] {
  const toko = (c: IklanCampaign) => `${akunMap.get(c.akun_id)?.nama_toko ?? '—'} (${PLATFORM_LABELS[c.platform]})`
  return [
    { kunci: 'nama', judul: 'Nama', kelas: 'font-medium', tetap: true, sel: (c) => c.nama, nilai: (c) => c.nama },
    { kunci: 'toko', judul: 'Toko', sel: toko, nilai: toko },
    { kunci: 'budget', judul: 'Budget/Hari', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (c) => fmtRp(c.budget_harian), nilai: (c) => Number(c.budget_harian) },
    { kunci: 'mulai', judul: 'Mulai', kelas: 'whitespace-nowrap', sel: (c) => fmtDate(c.tanggal_mulai), nilai: (c) => new Date(c.tanggal_mulai) },
    { kunci: 'status', judul: 'Status', sel: (c) => <Badge variant={statusVariant(c.status)}>{c.status}</Badge>, nilai: (c) => c.status },
  ]
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
      <BarHalaman judul="Iklan">
        <Button onClick={() => setDialogOpen(true)} disabled={!akunList?.length}>
          Buat Campaign Manual
        </Button>
      </BarHalaman>

      <PerformaShopee />

      <Card>
        <CardHeader>
          <CardTitle>Campaign Manual</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat campaign…" />
          ) : (
            <>
              <TabelLokal
                label="Daftar campaign iklan"
                items={data}
                kolom={kolomCampaign(akunMap)}
                idDari={(c) => c.id}
                namaDari={(c) => c.nama}
                urutAwal={{ kunci: 'mulai', arah: 'desc' }}
                aksi={(c) => (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/iklan/${c.id}`}>Kelola</Link>
                  </Button>
                )}
                minWidth={620}
              />
              {(data ?? []).length === 0 && <p className="py-8 text-center text-muted-foreground">Belum ada campaign iklan.</p>}
            </>
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
              <Label htmlFor="iklan-toko-1">Toko</Label>
              <Select value={form.akun_id} onValueChange={(v) => setForm((f) => ({ ...f, akun_id: v }))}>
                <SelectTrigger id="iklan-toko-1" className="w-full">
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
              <Label htmlFor="iklan-produk-yang-dipromosikan-2">Produk yang Dipromosikan (opsional, untuk hitung ROAS)</Label>
              <Select value={form.produk_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, produk_id: v === 'none' ? '' : v }))}>
                <SelectTrigger id="iklan-produk-yang-dipromosikan-2" className="w-full">
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
              <Label htmlFor="iklan-nama-campaign-3">Nama Campaign</Label>
              <Input id="iklan-nama-campaign-3" value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="iklan-budget-harian-rp-4">Budget Harian (Rp)</Label>
                <Input id="iklan-budget-harian-rp-4" type="number" value={form.budget_harian} onChange={(e) => setForm((f) => ({ ...f, budget_harian: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iklan-tanggal-mulai-5">Tanggal Mulai</Label>
                <Input id="iklan-tanggal-mulai-5" type="date" value={form.tanggal_mulai} onChange={(e) => setForm((f) => ({ ...f, tanggal_mulai: e.target.value }))} />
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
