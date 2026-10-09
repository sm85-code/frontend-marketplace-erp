import { useStockSettings } from '@/lib/stock-settings'
import AksiLainnya from '@/components/AksiLainnya'
import FormDialog from '@/components/FormDialog'
import MoneyInput from '@/components/MoneyInput'
import { useTerpilih } from '@/lib/terpilih'
import Sinkronisasi from '@/components/Sinkronisasi'
import ProdukKeluargaField from './ProdukKeluargaField'
import { pemetaanProduk } from '@/lib/pemetaanProduk'
import QueryError from '@/components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { Produk } from '@/api/types'
import { teksBerat, ukuranPaket } from '@/lib/katalog'
import { publishDefaults, publishMessage } from '@/lib/publishToko'
import { useConfirm } from '@/components/ConfirmProvider'
import SesuaikanStokDialog from '@/components/SesuaikanStokDialog'
import { type KolomTabel, TabelLokal, BarHalaman } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const emptyForm = {
  keluarga_id: '', opsi_varian: [] as { tier: string; opsi: string }[],
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

const kolomProduk = (mapping: ReturnType<typeof pemetaanProduk>): KolomTabel<Produk>[] => [
  { kunci: 'sku', judul: 'SKU', kelas: 'font-mono', tetap: true, sel: (p) => p.sku_induk, nilai: (p) => p.sku_induk },
  { kunci: 'nama', judul: 'Nama', kelas: 'font-medium min-w-[180px]', sel: (p) => p.nama_induk ?? mapping.get(p.id)?.nama ?? p.nama, nilai: (p) => p.nama_induk ?? mapping.get(p.id)?.nama ?? p.nama },
  { kunci: 'tier', judul: 'Jenis Varian', sel: (p) => <div>{(p.keluarga_id ? p.opsi_varian : mapping.get(p.id)?.opsi)?.map((o, i) => <div key={i}>{o.tier}</div>) ?? '—'}</div> },
  { kunci: 'opsi', judul: 'Pilihan Varian', sel: (p) => <div>{!p.keluarga_id && mapping.get(p.id)?.berbeda ? 'Berbeda antar listing · lihat Listing' : (p.keluarga_id ? p.opsi_varian : mapping.get(p.id)?.opsi)?.map((o, i) => <div key={i}>{o.opsi}</div>) ?? '—'}</div> },
  { kunci: 'harga', judul: 'Harga Dasar', rata: 'kanan', kelas: 'whitespace-nowrap', sel: (p) => fmtRp(p.harga_dasar), nilai: (p) => Number(p.harga_dasar) },
  { kunci: 'stok', judul: 'Stok referensi', rata: 'kanan', sel: (p) => p.stok_referensi ?? '—', nilai: (p) => p.stok_referensi },
  { kunci: 'berat', judul: 'Berat', kelas: 'whitespace-nowrap', sel: (p) => teksBerat(p.berat_gram), nilai: (p) => p.berat_gram ?? 0 },
  { kunci: 'dimensi', judul: 'Dimensi', kelas: 'whitespace-nowrap', sel: (p) => ukuranPaket(p.panjang_cm, p.lebar_cm, p.tinggi_cm) },
  { kunci: 'preorder', judul: 'Preorder', sel: (p) => p.preorder == null ? '—' : p.preorder ? `Ya · ${p.hari_proses ?? '—'} hari` : 'Tidak', nilai: (p) => p.preorder },
  { kunci: 'status', judul: 'Status', sel: (p) => <Badge variant={p.aktif ? 'default' : 'secondary'}>{p.aktif ? 'Aktif' : 'Nonaktif'}</Badge>, nilai: (p) => p.aktif },
]

export default function ProdukPage() {
  const { warehouseEnabled } = useStockSettings()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Produk | null>(null)
  const [stokProduk, setStokProduk] = useState<Produk | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [publishing, setPublishing] = useState<Produk | null>(null)
  const [pub, setPub] = useState(publishDefaults({ harga_dasar: '0', stok: 0 }))

  const { data, isLoading, error: queryError, refetch: retryQuery } = useQuery({ queryKey: qk.produk(), queryFn: endpoints.listProduk })
  const { data: listings } = useQuery({ queryKey: qk.listing(), queryFn: () => endpoints.listListing() })
  const mapping = pemetaanProduk(listings ?? [])

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
    (p) => (p.nama_induk ?? mapping.get(p.id)?.nama ?? p.nama).toLowerCase().includes(q.toLowerCase()) || p.nama.toLowerCase().includes(q.toLowerCase()) || p.sku_induk.toLowerCase().includes(q.toLowerCase()),
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(p: Produk) {
    setEditing(p)
    setForm({
      keluarga_id: p.keluarga_id ?? '', opsi_varian: p.opsi_varian ?? [],
      sku_induk: p.sku_induk, nama: p.nama, deskripsi: p.deskripsi, harga_dasar: p.harga_dasar, stok: p.stok_referensi == null ? '' : String(p.stok_referensi),
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
    setPub(publishDefaults({ ...p, stok: 0 }))
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
        payload: { stok_referensi: form.stok === '' ? null : Number(form.stok), keluarga_id: form.keluarga_id || null, opsi_varian: form.opsi_varian, nama: form.nama, deskripsi: form.deskripsi, harga_dasar: form.harga_dasar, ...fisik(form) },
      })
    } else {
      createMut.mutate({
        keluarga_id: form.keluarga_id || null, opsi_varian: form.opsi_varian,
        sku_induk: form.sku_induk,
        nama: form.nama,
        deskripsi: form.deskripsi,
        harga_dasar: form.harga_dasar,
        stok: 0,
        stok_referensi: form.stok === '' ? null : Number(form.stok),
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

  const pilih = useTerpilih<Produk>(data ?? [])

  return (
    <div className="space-y-4">
      {queryError && <QueryError error={queryError} retry={retryQuery} />}
      <BarHalaman judul="Produk & Varian">
        <Sinkronisasi jenis="produk" ids={pilih.daftar.map(p => p.id)} />
        <Button onClick={openCreate}>Tambah Produk</Button>
      </BarHalaman>

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
            <>
              <TabelLokal
                pilihan={{ terpilih: pilih.ada, onUbah: pilih.ubah, semuaDipilih: (filtered ?? []).length > 0 && (filtered ?? []).every(p => pilih.ada(p.id)), adaYangBisaDipilih: !!filtered?.length, onUbahSemua: value => pilih.ubahBanyak(filtered ?? [], value) }}
                label="Daftar SKU produk dan varian"
                items={filtered}
                kolom={kolomProduk(mapping)}
                idDari={(p) => p.id}
                namaDari={(p) => p.nama}
                urutAwal={{ kunci: 'sku', arah: 'asc' }}
                aksi={(p) => (
                  <AksiLainnya>
                    <Sinkronisasi jenis="produk" ids={[p.id]} satu />
                    {warehouseEnabled && <Button size="sm" variant="ghost" onClick={() => setStokProduk(p)}>
                      Sesuaikan Stok Gudang
                    </Button>}
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
                  </AksiLainnya>
                )}
                minWidth={780}
              />
              {filtered.length === 0 && <p className="py-8 text-center text-muted-foreground">Belum ada produk.</p>}
            </>
          )}
        </CardContent>
      </Card>

      <FormDialog open={dialogOpen} values={form} busy={createMut.isPending || updateMut.isPending} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="produk-sku-induk-1">Kode SKU</Label>
                <Input id="produk-sku-induk-1" value={form.sku_induk} onChange={(e) => setForm((f) => ({ ...f, sku_induk: e.target.value }))} />
              </div>
            )}
            <ProdukKeluargaField value={form.keluarga_id} options={form.opsi_varian} onChange={(keluarga_id, opsi_varian) => setForm((old) => ({ ...old, keluarga_id, opsi_varian }))} />
            <div className="space-y-1.5">
              <Label htmlFor="produk-nama-produk-2">Nama Produk</Label>
              <Input id="produk-nama-produk-2" value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produk-deskripsi-3">Deskripsi</Label>
              <Textarea id="produk-deskripsi-3" value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produk-harga-dasar-rp-4">Harga Dasar (Rp)</Label>
              <MoneyInput id="produk-harga-dasar-rp-4"
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
                  <Label htmlFor={`produk-${k}`}>{label}</Label>
                  <Input id={`produk-${k}`} type="number" min={0} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
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
                  <Label htmlFor="produk-lama-proses-hari-3-14-6">Lama proses (hari, 3–14)</Label>
                  <Input id="produk-lama-proses-hari-3-14-6" type="number" min={3} max={14} className="max-w-28" value={form.hari_proses} onChange={(e) => setForm((f) => ({ ...f, hari_proses: e.target.value }))} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Bukan pre-order: ready stock, diproses 2 hari.</p>
              )}
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="produk-stok-awal-7">Stok referensi</Label>
                <Input id="produk-stok-awal-7" type="number" min={0} step={1} value={form.stok} onChange={(e) => setForm((f) => ({ ...f, stok: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Angka referensi saja; tidak mengubah stok marketplace, Gudang, atau Toko Web.</p>
              </div>
          </div>
          {(createMut.error||updateMut.error)&&<p role="alert" className="text-sm text-destructive">{getApiError(createMut.error||updateMut.error)}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={createMut.isPending || updateMut.isPending || !form.nama || !form.harga_dasar || !prosesValid(form) || (Boolean(form.keluarga_id) && form.opsi_varian.some((option) => !option.opsi.trim()))}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </FormDialog>

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
              <Label htmlFor="produk-harga-di-toko-rp-8">Harga di toko (Rp)</Label>
              <MoneyInput id="produk-harga-di-toko-rp-8" type="number" value={pub.harga} onChange={(e) => setPub((v) => ({ ...v, harga: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produk-stok-awal-di-toko-9">Stok awal di toko</Label>
              <Input id="produk-stok-awal-di-toko-9" type="number" value={pub.stok} onChange={(e) => setPub((v) => ({ ...v, stok: e.target.value }))} />
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
