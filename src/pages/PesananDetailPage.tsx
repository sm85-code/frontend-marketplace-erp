import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDateTime, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import { useConfirm } from '@/components/ConfirmProvider'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLATFORM_LABELS } from '@/config/roles'
import { STATUS_LABELS, nextActionLabel } from '@/lib/pesanan'

export default function PesananDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [kirimDialog, setKirimDialog] = useState(false)
  const [kurir, setKurir] = useState('')
  const [nomorResi, setNomorResi] = useState('')

  const { data: pesanan, isLoading } = useQuery({
    queryKey: qk.pesananOne(id!),
    queryFn: () => endpoints.getPesanan(id!),
    enabled: Boolean(id),
  })

  const statusMut = useMutation({
    mutationFn: (status: string) => endpoints.ubahStatusPesanan(id!, status),
    onSuccess: () => {
      toast.success('Status pesanan diperbarui')
      qc.invalidateQueries({ queryKey: ['pesanan'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const pengirimanMut = useMutation({
    mutationFn: () => endpoints.setPengiriman(id!, { kurir, nomor_resi: nomorResi }),
    onSuccess: () => {
      toast.success('Info pengiriman disimpan')
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      setKirimDialog(false)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: () => endpoints.deletePesanan(id!),
    onSuccess: () => {
      toast.success('Pesanan dihapus')
      navigate('/pesanan')
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  if (isLoading || !pesanan) return <Spinner column label="Memuat pesanan…" />

  const action = nextActionLabel(pesanan.status)

  async function onAction() {
    if (!action) return
    if (action.to === 'shipped' && !pesanan!.nomor_resi) {
      setKirimDialog(true)
      return
    }
    statusMut.mutate(action.to)
  }

  async function onCancel() {
    const ok = await confirm({ title: 'Batalkan pesanan?', description: 'Reservasi stok akan dilepas.', destructive: true })
    if (ok) statusMut.mutate('cancelled')
  }

  async function onDelete() {
    const ok = await confirm({ title: 'Hapus pesanan?', description: 'Hanya pesanan belum bayar yang bisa dihapus.', destructive: true })
    if (ok) deleteMut.mutate()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/pesanan">← Kembali</Link>
        </Button>
        <h1 className="page-h1 font-heading text-xl font-bold">Pesanan #{pesanan.id_eksternal}</h1>
        <Badge>{STATUS_LABELS[pesanan.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Platform</div>
            <div className="font-medium">{PLATFORM_LABELS[pesanan.platform]}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pembeli</div>
            <div className="font-medium">{pesanan.nama_pembeli || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-medium">{fmtRp(pesanan.total)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Dibuat</div>
            <div className="font-medium">{fmtDateTime(pesanan.created_at)}</div>
          </div>
          {pesanan.kurir && (
            <>
              <div>
                <div className="text-xs text-muted-foreground">Kurir</div>
                <div className="font-medium">{pesanan.kurir}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">No. Resi</div>
                <div className="font-medium">{pesanan.nomor_resi}</div>
              </div>
            </>
          )}
          {pesanan.catatan_sinkron && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Catatan Sinkron Marketplace</div>
              <div className={pesanan.tersinkron_marketplace ? 'text-sm' : 'text-sm text-destructive'}>
                {pesanan.catatan_sinkron}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {pesanan.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium">{item.nama_produk}</div>
                <div className="text-xs text-muted-foreground">
                  {item.qty} × {fmtRp(item.harga_satuan)}
                </div>
              </div>
              <div className="font-semibold">{fmtRp(item.subtotal)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {action && (
          <Button onClick={onAction} disabled={statusMut.isPending}>
            {action.label}
          </Button>
        )}
        {(pesanan.status === 'unpaid' || pesanan.status === 'to_ship') && (
          <Button variant="destructive" onClick={onCancel} disabled={statusMut.isPending}>
            Batalkan
          </Button>
        )}
        {pesanan.status === 'unpaid' && (
          <Button variant="outline" onClick={onDelete} disabled={deleteMut.isPending}>
            Hapus
          </Button>
        )}
      </div>

      <Dialog open={kirimDialog} onOpenChange={setKirimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Info Pengiriman</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kurir</Label>
              <Input value={kurir} onChange={(e) => setKurir(e.target.value)} placeholder="mis. JNE, J&T, SiCepat" />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Resi</Label>
              <Input value={nomorResi} onChange={(e) => setNomorResi(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKirimDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={async () => {
                await pengirimanMut.mutateAsync()
                statusMut.mutate('shipped')
              }}
              disabled={!kurir || !nomorResi}
            >
              Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
