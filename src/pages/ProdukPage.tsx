import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { Produk } from '@/api/types'
import { publishDefaults, publishMessage } from '@/lib/publishToko'
import { useConfirm } from '@/components/ConfirmProvider'
import SesuaikanStokDialog from '@/components/SesuaikanStokDialog'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const emptyForm = {
  sku_induk: '', nama: '', deskripsi: '', harga_dasar: '', stok: '0',
  berat_gram: '0', panjang_cm: '0', lebar_cm: '0', tinggi_cm: '0', preorder: false, hari_proses: '2',
}
const fisik = (f: typeof emptyForm) => ({
  berat_gram: Number(f.berat_gram || 0),
  panjang_cm: f.panjang_cm || '0',
  lebar_cm: f.lebar_cm || '0',
  tinggi_cm: f.tinggi_cm || '0',
  preorder: f.preorder,
  hari_proses: f.preorder ? Number(f.hari_proses) : 2,
})
const prosesValid = (f: typeof emptyForm) => !f.preorder || (/^\d+$/.test(f.hari_proses) && Number(f.hari_proses) >= 3 && Number(f.hari_proses) <= 14)

export default function ProdukPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Produk | null>(null)
  const [stokProduk, setStokProduk] = useState<Produk | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [publishing, setPublishing] = useState<Produk | null>(null)
  const [pub, setPub] = useState(publishDefaults({ harga_dasar: '0', stok: 0 }))

  const { data, isLoading } = useQuery({ queryKey: qk.produk(), queryFn: endpoints.listProduk })

  const createMut = useMutation({
    mutationFn: endpoints.createProduk,
    onSuccess: () => {
      toast.success('Produk ditambahkan')
      qc.invalidateQueries({ queryKey: ['produk'] })
      setDialogOpen(false)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: Parameters<typeof endpoints.updateProduk>[1] }) =>
      endpoints.updateProduk(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('Produk diperbarui')
      qc.invalidateQueries({ queryKey: ['produk'] })
      setDialogOpen(false)
      setEditing(null)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: endpoints.deleteProduk,
    onSuccess: () => {
      toast.success('Produk dihapus')
      qc.invalidateQueries({ queryKey: ['produk'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const publishMut = useMutation({
    mutationFn: (vars: { id: string; payload: Parameters<typeof endpoints.publishProdukKeToko>[1] }) =>
      endpoints.publishProdukKeToko(vars.id, vars.payload),
    onSuccess: (r) => {
      toast.success(publishMessage(r))
      setPublishing(null)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const filtered = (data ?? []).filter(
    (p) => p.nama.toLowerCase().includes(q.toLowerCase()) || p.sku_induk.toLowerCase().includes(q.toLowerCase()),
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(p: Produk) {
    setEditing(p)
    setForm({
      sku_induk: p.sku_induk, nama: p.nama, deskripsi: p.deskripsi, harga_dasar: p.harga_dasar, stok: '',
      berat_gram: String(p.berat_gram ?? 0),
      panjang_cm: String(Number(p.panjang_cm ?? 0)),
      lebar_cm: String(Number(p.lebar_cm ?? 0)),
      tinggi_cm: String(Number(p.tinggi_cm ?? 0)),
      preorder: p.preorder ?? false,
      hari_proses: String(p.hari_proses ?? 2),
    })
    setDialogOpen(true)
  }

  function openPublish(p: Produk) {
    setPublishing(p)
    setPub(publishDefaults(p))
  }

  function onPublish() {
    if (!publishing) return
    publishMut.mutate({
      id: publishing.id,
      payload: { aktif: pub.aktif, harga: pub.harga, stok: Number(pub.stok || 0), salin_foto: pub.salinFoto },
    })
  }

  function onSubmit() {
    if (editing) {
      updateMut.mutate({
        id: editing.id,
        payload: { nama: form.nama, deskripsi: form.deskripsi, harga_dasar: form.harga_dasar, ...fisik(form) },
      })
    } else {
      createMut.mutate({
        sku_induk: form.sku_induk,
        nama: form.nama,
        deskripsi: form.deskripsi,
        harga_dasar: form.harga_dasar,
        stok: Number(form.stok || 0),
        ...fisik(form),
      })
    }
  }

  async function onToggleAktif(p: Produk) {
    updateMut.mutate({ id: p.id, payload: { aktif: !p.aktif } })
  }

  async function onDelete(p: Produk) {
    const ok = await confirm({
      title: 'Hapus produk?',
      description: `SKU "${p.sku_induk}" akan dihapus permanen, termasuk listing yang memetakannya.`,
      destructive: true,
    })
    if (ok) deleteMut.mutate(p.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Produk (SKU Induk)</h1>
        <Button onClick={openCreate}>Tambah Produk</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cari Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Cari nama atau SKU…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Spinner column label="Memuat produk…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Harga Dasar</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku_induk}</TableCell>
                      <TableCell className="font-medium">{p.nama}</TableCell>
                      <TableCell>{fmtRp(p.harga_dasar)}</TableCell>
                      <TableCell>{p.stok}</TableCell>
                      <TableCell>
                        <Badge variant={p.aktif ? 'default' : 'secondary'}>{p.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setStokProduk(p)}>
                            Sesuaikan Stok
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onToggleAktif(p)}>
                            {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openPublish(p)}>
                            Ke Toko
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(p)}>
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada produk.
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
            <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label>SKU Induk</Label>
                <Input value={form.sku_induk} onChange={(e) => setForm((f) => ({ ...f, sku_induk: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nama Produk</Label>
              <Input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Harga Dasar (Rp)</Label>
              <Input
                type="number"
                value={form.harga_dasar}
                onChange={(e) => setForm((f) => ({ ...f, harga_dasar: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['berat_gram', 'Berat (gram)'],
                  ['panjang_cm', 'Panjang (cm)'],
                  ['lebar_cm', 'Lebar (cm)'],
                  ['tinggi_cm', 'Tinggi (cm)'],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type="number" min={0} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.preorder} onChange={(e) => setForm((f) => ({ ...f, preorder: e.target.checked }))} />
                Pre-order
              </label>
              {form.preorder ? (
                <div className="space-y-1.5">
                  <Label>Lama proses (hari, 3–14)</Label>
                  <Input type="number" min={3} max={14} className="max-w-28" value={form.hari_proses} onChange={(e) => setForm((f) => ({ ...f, hari_proses: e.target.value }))} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Bukan pre-order: ready stock, diproses 2 hari.</p>
              )}
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Stok Awal</Label>
                <Input type="number" value={form.stok} onChange={(e) => setForm((f) => ({ ...f, stok: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={!form.nama || !form.harga_dasar || !prosesValid(form)}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishing !== null} onOpenChange={(open) => !open && setPublishing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish ke toko</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {publishing?.nama}. Stok toko berdiri sendiri: stok awal hanya dipakai saat pertama kali dipublikasikan.
              Publish ulang hanya memperbarui nama, deskripsi, harga, dan status.
            </p>
            <div className="space-y-1.5">
              <Label>Harga di toko (Rp)</Label>
              <Input type="number" value={pub.harga} onChange={(e) => setPub((v) => ({ ...v, harga: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Stok awal di toko</Label>
              <Input type="number" value={pub.stok} onChange={(e) => setPub((v) => ({ ...v, stok: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pub.aktif} onChange={(e) => setPub((v) => ({ ...v, aktif: e.target.checked }))} />
              Langsung tampil di toko
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pub.salinFoto}
                onChange={(e) => setPub((v) => ({ ...v, salinFoto: e.target.checked }))}
              />
              Salin foto produk
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishing(null)}>
              Batal
            </Button>
            <Button onClick={onPublish} disabled={!pub.harga || publishMut.isPending}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SesuaikanStokDialog produk={stokProduk} onClose={() => setStokProduk(null)} />
    </div>
  )
}
