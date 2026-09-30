import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDateTime, getApiError } from '@/api/client'
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

export default function GudangPage() {
  const qc = useQueryClient()
  const [gudangDialog, setGudangDialog] = useState(false)
  const [gudangForm, setGudangForm] = useState({ kode: '', nama: '' })
  const [adjustDialog, setAdjustDialog] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ produk_id: '', qty_delta: '', catatan: '', gudang_id: '' })
  const [transferDialog, setTransferDialog] = useState(false)
  const [transferForm, setTransferForm] = useState({ produk_id: '', dari_gudang_id: '', ke_gudang_id: '', qty: '', catatan: '' })
  const [ledgerFilter, setLedgerFilter] = useState('')

  const { data: gudangList } = useQuery({ queryKey: qk.gudang(), queryFn: endpoints.listGudang })
  const { data: produkList } = useQuery({ queryKey: qk.produk(), queryFn: endpoints.listProduk })
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: qk.stokLedger(ledgerFilter || undefined),
    queryFn: () => endpoints.listStokLedger(ledgerFilter || undefined),
  })

  const produkMap = new Map((produkList ?? []).map((p) => [p.id, p]))
  const gudangMap = new Map((gudangList ?? []).map((g) => [g.id, g]))

  const createGudangMut = useMutation({
    mutationFn: endpoints.createGudang,
    onSuccess: () => {
      toast.success('Gudang ditambahkan')
      qc.invalidateQueries({ queryKey: ['gudang'] })
      setGudangDialog(false)
      setGudangForm({ kode: '', nama: '' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const adjustMut = useMutation({
    mutationFn: endpoints.adjustStok,
    onSuccess: () => {
      toast.success('Stok disesuaikan')
      qc.invalidateQueries({ queryKey: ['produk'] })
      qc.invalidateQueries({ queryKey: ['stok-ledger'] })
      setAdjustDialog(false)
      setAdjustForm({ produk_id: '', qty_delta: '', catatan: '', gudang_id: '' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const transferMut = useMutation({
    mutationFn: endpoints.transferStok,
    onSuccess: () => {
      toast.success('Stok dipindahkan antar gudang')
      qc.invalidateQueries({ queryKey: ['stok-ledger'] })
      setTransferDialog(false)
      setTransferForm({ produk_id: '', dari_gudang_id: '', ke_gudang_id: '', qty: '', catatan: '' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Gudang &amp; Stok</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGudangDialog(true)}>
            Tambah Gudang
          </Button>
          <Button variant="outline" onClick={() => setTransferDialog(true)} disabled={(gudangList?.length ?? 0) < 2}>
            Transfer Antar Gudang
          </Button>
          <Button onClick={() => setAdjustDialog(true)}>Sesuaikan Stok</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gudang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(gudangList ?? []).map((g) => (
              <Badge key={g.id} variant="outline">
                {g.kode} — {g.nama}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stok Produk Saat Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Stok Tersedia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(produkList ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku_induk}</TableCell>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell className="text-right font-semibold">{p.stok}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kartu Stok (Ledger)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={ledgerFilter || 'all'} onValueChange={(v) => setLedgerFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Semua produk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua produk</SelectItem>
              {(produkList ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ledgerLoading ? (
            <Spinner column label="Memuat kartu stok…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Gudang</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ledger ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{fmtDateTime(row.created_at)}</TableCell>
                      <TableCell>{produkMap.get(row.produk_id)?.sku_induk ?? '—'}</TableCell>
                      <TableCell>{row.gudang_id ? (gudangMap.get(row.gudang_id)?.kode ?? '—') : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.reason}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${row.qty_delta < 0 ? 'text-destructive' : ''}`}>
                        {row.qty_delta > 0 ? '+' : ''}
                        {row.qty_delta}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.catatan ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {(ledger ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada pergerakan stok.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </CardContent>
      </Card>

      <Dialog open={gudangDialog} onOpenChange={setGudangDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Gudang</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kode</Label>
              <Input value={gudangForm.kode} onChange={(e) => setGudangForm((f) => ({ ...f, kode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={gudangForm.nama} onChange={(e) => setGudangForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGudangDialog(false)}>
              Batal
            </Button>
            <Button onClick={() => createGudangMut.mutate(gudangForm)} disabled={!gudangForm.kode || !gudangForm.nama}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan Stok</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Produk</Label>
              <Select value={adjustForm.produk_id} onValueChange={(v) => setAdjustForm((f) => ({ ...f, produk_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {(produkList ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama} (stok: {p.stok})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Perubahan (+ masuk, - keluar)</Label>
              <Input
                type="number"
                value={adjustForm.qty_delta}
                onChange={(e) => setAdjustForm((f) => ({ ...f, qty_delta: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gudang (opsional, default: Gudang Utama)</Label>
              <Select
                value={adjustForm.gudang_id || 'default'}
                onValueChange={(v) => setAdjustForm((f) => ({ ...f, gudang_id: v === 'default' ? '' : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Gudang Utama (default)</SelectItem>
                  {(gudangList ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={adjustForm.catatan} onChange={(e) => setAdjustForm((f) => ({ ...f, catatan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() =>
                adjustMut.mutate({
                  produk_id: adjustForm.produk_id,
                  qty_delta: Number(adjustForm.qty_delta),
                  catatan: adjustForm.catatan || undefined,
                  gudang_id: adjustForm.gudang_id || undefined,
                })
              }
              disabled={!adjustForm.produk_id || !adjustForm.qty_delta}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Stok Antar Gudang</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Produk</Label>
              <Select value={transferForm.produk_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, produk_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {(produkList ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dari Gudang</Label>
                <Select value={transferForm.dari_gudang_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, dari_gudang_id: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    {(gudangList ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.kode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ke Gudang</Label>
                <Select value={transferForm.ke_gudang_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, ke_gudang_id: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    {(gudangList ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.kode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input type="number" value={transferForm.qty} onChange={(e) => setTransferForm((f) => ({ ...f, qty: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={transferForm.catatan} onChange={(e) => setTransferForm((f) => ({ ...f, catatan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() =>
                transferMut.mutate({
                  produk_id: transferForm.produk_id,
                  dari_gudang_id: transferForm.dari_gudang_id,
                  ke_gudang_id: transferForm.ke_gudang_id,
                  qty: Number(transferForm.qty),
                  catatan: transferForm.catatan || undefined,
                })
              }
              disabled={
                !transferForm.produk_id ||
                !transferForm.dari_gudang_id ||
                !transferForm.ke_gudang_id ||
                !transferForm.qty
              }
            >
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
