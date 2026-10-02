import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { AkunMarketplace, Platform } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
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
import { useAuth } from '@/lib/auth'

const PLATFORMS: Platform[] = ['shopee', 'tiktokshop', 'lazada', 'blibli']

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'aktif' || status === 'terhubung') return 'default'
  if (status === 'token_kadaluarsa' || status === 'nonaktif') return 'destructive'
  return 'secondary'
}

export default function AkunPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AkunMarketplace | null>(null)
  const [form, setForm] = useState({ platform: 'shopee', nama_toko: '', id_toko_eksternal: '', catatan: '' })

  const { data: akunList, isLoading } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })

  const createMut = useMutation({
    mutationFn: endpoints.createAkun,
    onSuccess: () => {
      toast.success('Toko ditambahkan')
      qc.invalidateQueries({ queryKey: ['akun'] })
      setDialogOpen(false)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: Parameters<typeof endpoints.updateAkun>[1] }) =>
      endpoints.updateAkun(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('Toko diperbarui')
      qc.invalidateQueries({ queryKey: ['akun'] })
      setDialogOpen(false)
      setEditing(null)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: endpoints.deleteAkun,
    onSuccess: () => {
      toast.success('Toko dihapus')
      qc.invalidateQueries({ queryKey: ['akun'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const connectMut = useMutation({
    mutationFn: (akunId: string) =>
      endpoints.oauthShopeeStart(akunId, `${window.location.origin}/oauth/shopee/callback`),
    onSuccess: (data) => {
      window.location.href = data.authorize_url
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const syncMut = useMutation({
    mutationFn: endpoints.syncPesananAkun,
    onSuccess: (data) => {
      toast.success(`Sync selesai — ${data.pulled} pesanan ditarik (${data.baru} baru, ${data.diperbarui} diperbarui)`)
      qc.invalidateQueries({ queryKey: ['pesanan'] })
    },
    onError: (e) => toast.error(getApiError(e, 'Sync belum tersedia untuk platform/akun ini')),
  })

  const syncProdukMut = useMutation({
    mutationFn: endpoints.syncProdukAkun,
    onSuccess: (data) => {
      toast.success(
        `Sync produk selesai — ${data.pulled} produk dibaca, ${data.listing_baru} listing baru tertaut, ` +
          `${data.tanpa_sku_cocok} tanpa SKU yang cocok`,
      )
      qc.invalidateQueries({ queryKey: ['listing'] })
    },
    onError: (e) => toast.error(getApiError(e, 'Sync produk belum tersedia untuk platform/akun ini')),
  })

  const pushMut = useMutation({
    mutationFn: async (akun: AkunMarketplace) => {
      // Preview first: pushing overwrites the stock and price that Shopee holds right now.
      const preview = await endpoints.pushStokHargaAkun(akun.id, true)
      const ok = await confirm({
        title: 'Kirim stok & harga ke Shopee?',
        description:
          `${preview.jumlah} listing toko "${akun.nama_toko}" akan dikirim. Stok dan harga di Shopee ` +
          'akan DITIMPA dengan angka dari ERP. Pastikan stok ERP sudah benar.',
        destructive: true,
      })
      return ok ? endpoints.pushStokHargaAkun(akun.id, false) : null
    },
    onSuccess: (data) => {
      if (!data) return
      const gagal = data.gagal?.length ?? 0
      if (gagal) toast.warning(`Terkirim sebagian — ${data.stok_ok} stok, ${data.harga_ok} harga; ${gagal} gagal`)
      else toast.success(`Terkirim — ${data.stok_ok} stok dan ${data.harga_ok} harga diperbarui`)
    },
    onError: (e) => toast.error(getApiError(e, 'Kirim stok & harga belum tersedia untuk platform/akun ini')),
  })

  function openCreate() {
    setEditing(null)
    setForm({ platform: 'shopee', nama_toko: '', id_toko_eksternal: '', catatan: '' })
    setDialogOpen(true)
  }

  function openEdit(akun: AkunMarketplace) {
    setEditing(akun)
    setForm({
      platform: akun.platform,
      nama_toko: akun.nama_toko,
      id_toko_eksternal: akun.id_toko_eksternal ?? '',
      catatan: akun.catatan ?? '',
    })
    setDialogOpen(true)
  }

  function onSubmit() {
    if (editing) {
      updateMut.mutate({
        id: editing.id,
        payload: {
          nama_toko: form.nama_toko,
          id_toko_eksternal: form.id_toko_eksternal || null,
          catatan: form.catatan || null,
        },
      })
    } else {
      createMut.mutate({
        platform: form.platform,
        nama_toko: form.nama_toko,
        id_toko_eksternal: form.id_toko_eksternal || null,
        catatan: form.catatan || null,
      })
    }
  }

  async function onDelete(akun: AkunMarketplace) {
    const ok = await confirm({
      title: 'Hapus toko?',
      description: `Toko "${akun.nama_toko}" akan dihapus permanen.`,
      destructive: true,
    })
    if (ok) deleteMut.mutate(akun.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Toko</h1>
        {user?.role === 'owner' && <Button onClick={openCreate}>Tambah Toko</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Toko Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat toko…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Nama Toko</TableHead>
                    <TableHead>Shop ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(akunList ?? []).map((akun) => (
                    <TableRow key={akun.id}>
                      <TableCell>{PLATFORM_LABELS[akun.platform]}</TableCell>
                      <TableCell className="font-medium">{akun.nama_toko}</TableCell>
                      <TableCell>{akun.id_toko_eksternal ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(akun.status)}>{akun.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {akun.platform === 'shopee' && !akun.id_toko_eksternal && user?.role === 'owner' && (
                            <Button size="sm" variant="outline" onClick={() => connectMut.mutate(akun.id)}>
                              Hubungkan Shopee
                            </Button>
                          )}
                          {akun.id_toko_eksternal && (
                            <Button size="sm" variant="outline" onClick={() => syncMut.mutate(akun.id)}>
                              Tarik Pesanan
                            </Button>
                          )}
                          {akun.id_toko_eksternal && user?.role === 'owner' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => syncProdukMut.mutate(akun.id)}>
                                Tarik Produk
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => pushMut.mutate(akun)}>
                                Kirim Stok &amp; Harga
                              </Button>
                            </>
                          )}
                          {user?.role === 'owner' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(akun)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onDelete(akun)}>
                                Hapus
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(akunList ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Belum ada toko. Tambahkan toko pertama Anda.
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
            <DialogTitle>{editing ? 'Edit Toko' : 'Tambah Toko'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLATFORM_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nama Toko</Label>
              <Input
                value={form.nama_toko}
                onChange={(e) => setForm((f) => ({ ...f, nama_toko: e.target.value }))}
                placeholder="mis. Toko Ampel Kuning 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shop ID (opsional, diisi otomatis saat OAuth)</Label>
              <Input
                value={form.id_toko_eksternal}
                onChange={(e) => setForm((f) => ({ ...f, id_toko_eksternal: e.target.value }))}
              />
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
            <Button onClick={onSubmit} disabled={!form.nama_toko || createMut.isPending || updateMut.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
