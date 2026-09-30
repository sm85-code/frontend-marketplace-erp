import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { Platform } from '@/api/types'
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
import { PLATFORM_LABELS } from '@/config/roles'

export default function ListingPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ produk_id: '', akun_id: '', id_eksternal: '', harga_jual: '', stok_listing: '' })

  const { data: listing, isLoading } = useQuery({ queryKey: qk.listing(), queryFn: () => endpoints.listListing() })
  const { data: produkList } = useQuery({ queryKey: qk.produk(), queryFn: endpoints.listProduk })
  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })

  const produkMap = new Map((produkList ?? []).map((p) => [p.id, p]))
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))

  const createMut = useMutation({
    mutationFn: endpoints.createListing,
    onSuccess: () => {
      toast.success('Listing ditambahkan')
      qc.invalidateQueries({ queryKey: ['listing'] })
      setDialogOpen(false)
      setForm({ produk_id: '', akun_id: '', id_eksternal: '', harga_jual: '', stok_listing: '' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; aktif: boolean }) => endpoints.updateListing(vars.id, { aktif: vars.aktif }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing'] }),
    onError: (e) => toast.error(getApiError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: endpoints.deleteListing,
    onSuccess: () => {
      toast.success('Listing dihapus')
      qc.invalidateQueries({ queryKey: ['listing'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const selectedAkun = (akunList ?? []).find((a) => a.id === form.akun_id)

  function onSubmit() {
    createMut.mutate({
      produk_id: form.produk_id,
      akun_id: form.akun_id,
      platform: (selectedAkun?.platform ?? 'shopee') as Platform,
      id_eksternal: form.id_eksternal,
      harga_jual: form.harga_jual || null,
      stok_listing: form.stok_listing ? Number(form.stok_listing) : null,
    })
  }

  async function onDelete(id: string) {
    const ok = await confirm({ title: 'Hapus listing?', description: 'Mapping SKU ke listing ini akan dihapus.', destructive: true })
    if (ok) deleteMut.mutate(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Listing</h1>
        <Button onClick={() => setDialogOpen(true)} disabled={!produkList?.length || !akunList?.length}>
          Tambah Listing
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapping SKU Induk ↔ Listing Toko</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat listing…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU Induk</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>ID Eksternal</TableHead>
                    <TableHead>Harga/Stok Override</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listing ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{produkMap.get(l.produk_id)?.sku_induk ?? '—'}</TableCell>
                      <TableCell>{akunMap.get(l.akun_id)?.nama_toko ?? '—'}</TableCell>
                      <TableCell>{PLATFORM_LABELS[l.platform]}</TableCell>
                      <TableCell>{l.id_eksternal}</TableCell>
                      <TableCell>
                        {l.harga_jual ? fmtRp(l.harga_jual) : 'ikut dasar'} / {l.stok_listing ?? 'ikut stok'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.aktif ? 'default' : 'secondary'}>{l.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: l.id, aktif: !l.aktif })}>
                            {l.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(l.id)}>
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(listing ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Belum ada listing.
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
            <DialogTitle>Tambah Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Produk (SKU Induk)</Label>
              <Select value={form.produk_id} onValueChange={(v) => setForm((f) => ({ ...f, produk_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {(produkList ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama} ({p.sku_induk})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>ID Eksternal (id produk di toko)</Label>
              <Input value={form.id_eksternal} onChange={(e) => setForm((f) => ({ ...f, id_eksternal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Harga Jual Override (opsional)</Label>
              <Input type="number" value={form.harga_jual} onChange={(e) => setForm((f) => ({ ...f, harga_jual: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Stok Override (opsional)</Label>
              <Input
                type="number"
                value={form.stok_listing}
                onChange={(e) => setForm((f) => ({ ...f, stok_listing: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={!form.produk_id || !form.akun_id || !form.id_eksternal}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
