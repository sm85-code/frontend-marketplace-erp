import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDateTime, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { Gudang, Produk, StokLedger } from '@/api/types'
import { BarHalaman, FilterPilih, type KolomTabel, TabelLokal } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const kolomStok: KolomTabel<Produk>[] = [
  { kunci: 'sku', judul: 'SKU', kelas: 'font-mono', tetap: true, sel: (p) => p.sku_induk, nilai: (p) => p.sku_induk },
  { kunci: 'nama', judul: 'Nama', sel: (p) => p.nama, nilai: (p) => p.nama },
  { kunci: 'stok', judul: 'Stok Tersedia', rata: 'kanan', kelas: 'font-semibold', sel: (p) => p.stok, nilai: (p) => p.stok },
]

function kolomLedger({
  produkMap,
  gudangMap,
}: {
  produkMap: Map<string, Produk>
  gudangMap: Map<string, Gudang>
}): KolomTabel<StokLedger>[] {
  const sku = (r: StokLedger) => produkMap.get(r.produk_id)?.sku_induk ?? '—'
  const gudang = (r: StokLedger) => (r.gudang_id ? (gudangMap.get(r.gudang_id)?.kode ?? '—') : '—')
  return [
    { kunci: 'waktu', judul: 'Waktu', kelas: 'whitespace-nowrap', sel: (r) => fmtDateTime(r.created_at), nilai: (r) => new Date(r.created_at) },
    { kunci: 'produk', judul: 'Produk', kelas: 'font-mono', sel: sku, nilai: sku },
    { kunci: 'gudang', judul: 'Gudang', sel: gudang, nilai: gudang },
    { kunci: 'alasan', judul: 'Alasan', sel: (r) => <Badge variant="outline">{r.reason}</Badge>, nilai: (r) => r.reason },
    {
      kunci: 'delta',
      judul: 'Delta',
      rata: 'kanan',
      kelas: 'font-mono',
      sel: (r) => <span className={r.qty_delta < 0 ? 'text-destructive' : ''}>{`${r.qty_delta > 0 ? '+' : ''}${r.qty_delta}`}</span>,
      nilai: (r) => r.qty_delta,
    },
    { kunci: 'catatan', judul: 'Catatan', kelas: 'text-muted-foreground', sel: (r) => r.catatan ?? '—' },
  ]
}

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
      <BarHalaman judul="Gudang &amp; Stok">
        <Button variant="outline" onClick={() => setGudangDialog(true)}>
            Tambah Gudang
          </Button>
          <Button variant="outline" onClick={() => setTransferDialog(true)} disabled={(gudangList?.length ?? 0) < 2}>
            Transfer Antar Gudang
          </Button>
          <Button onClick={() => setAdjustDialog(true)}>Sesuaikan Stok</Button>
      </BarHalaman>

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
          <TabelLokal
            label="Stok tersedia per produk induk"
            items={produkList}
            kolom={kolomStok}
            idDari={(p) => p.id}
            namaDari={(p) => p.nama}
            urutAwal={{ kunci: 'sku', arah: 'asc' }}
            hp="tabel"
            minWidth={420}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kartu Stok (Ledger)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-full sm:w-72">
            <FilterPilih
              id="gudang-filter-produk"
              label="Produk"
              nilai={ledgerFilter}
              onUbah={setLedgerFilter}
              semua="Semua produk"
              opsi={(produkList ?? []).map((p) => ({ value: p.id, label: p.nama }))}
            />
          </div>
          {ledgerLoading ? (
            <Spinner column label="Memuat kartu stok…" />
          ) : (
            <>
              <TabelLokal
                label="Riwayat pergerakan stok"
                items={ledger}
                kolom={kolomLedger({ produkMap, gudangMap })}
                idDari={(r) => r.id}
                namaDari={(r) => r.reason}
                urutAwal={{ kunci: 'waktu', arah: 'desc' }}
                minWidth={640}
              />
              {(ledger ?? []).length === 0 && <p className="py-8 text-center text-muted-foreground">Belum ada pergerakan stok.</p>}
            </>
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
              <Label htmlFor="gudang-kode-1">Kode</Label>
              <Input id="gudang-kode-1" value={gudangForm.kode} onChange={(e) => setGudangForm((f) => ({ ...f, kode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gudang-nama-2">Nama</Label>
              <Input id="gudang-nama-2" value={gudangForm.nama} onChange={(e) => setGudangForm((f) => ({ ...f, nama: e.target.value }))} />
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
              <Label htmlFor="gudang-produk-3">Produk</Label>
              <Select value={adjustForm.produk_id} onValueChange={(v) => setAdjustForm((f) => ({ ...f, produk_id: v }))}>
                <SelectTrigger id="gudang-produk-3" className="w-full">
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
              <Label htmlFor="gudang-perubahan-masuk-keluar-4">Perubahan (+ masuk, - keluar)</Label>
              <Input id="gudang-perubahan-masuk-keluar-4"
                type="number"
                value={adjustForm.qty_delta}
                onChange={(e) => setAdjustForm((f) => ({ ...f, qty_delta: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gudang-gudang-opsional-default--5">Gudang (opsional, default: Gudang Utama)</Label>
              <Select
                value={adjustForm.gudang_id || 'default'}
                onValueChange={(v) => setAdjustForm((f) => ({ ...f, gudang_id: v === 'default' ? '' : v }))}
              >
                <SelectTrigger id="gudang-gudang-opsional-default--5" className="w-full">
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
              <Label htmlFor="gudang-catatan-6">Catatan</Label>
              <Textarea id="gudang-catatan-6" value={adjustForm.catatan} onChange={(e) => setAdjustForm((f) => ({ ...f, catatan: e.target.value }))} />
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
              <Label htmlFor="gudang-produk-7">Produk</Label>
              <Select value={transferForm.produk_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, produk_id: v }))}>
                <SelectTrigger id="gudang-produk-7" className="w-full">
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
                <Label htmlFor="gudang-dari-gudang-8">Dari Gudang</Label>
                <Select value={transferForm.dari_gudang_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, dari_gudang_id: v }))}>
                  <SelectTrigger id="gudang-dari-gudang-8" className="w-full">
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
                <Label htmlFor="gudang-ke-gudang-9">Ke Gudang</Label>
                <Select value={transferForm.ke_gudang_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, ke_gudang_id: v }))}>
                  <SelectTrigger id="gudang-ke-gudang-9" className="w-full">
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
              <Label htmlFor="gudang-qty-10">Qty</Label>
              <Input id="gudang-qty-10" type="number" value={transferForm.qty} onChange={(e) => setTransferForm((f) => ({ ...f, qty: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gudang-catatan-11">Catatan</Label>
              <Textarea id="gudang-catatan-11" value={transferForm.catatan} onChange={(e) => setTransferForm((f) => ({ ...f, catatan: e.target.value }))} />
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
