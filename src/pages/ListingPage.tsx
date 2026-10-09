import PilihProduk from '@/components/PilihProduk'
import { useTokoAktif } from '@/lib/tokoAktif'
import { FilterPilih } from '@/components/daftar'
import AksiLainnya from '@/components/AksiLainnya'
import FormDialog from '@/components/FormDialog'
import MoneyInput from '@/components/MoneyInput'
import { useTerpilih } from '@/lib/terpilih'
import Sinkronisasi from '@/components/Sinkronisasi'
import QueryError from '@/components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { AkunMarketplace, Platform, Produk, ProdukListing } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { type KolomTabel, TabelLokal, BarHalaman } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ukuranPaket, teksBerat } from '@/lib/katalog'
import { PLATFORM_LABELS } from '@/config/roles'

function kolomListing({
  produkMap,
  akunMap,
}: {
  produkMap: Map<string, Produk>
  akunMap: Map<string, AkunMarketplace>
}): KolomTabel<ProdukListing>[] {
  const sku = (l: ProdukListing) => produkMap.get(l.produk_id)?.sku_induk ?? '—'
  const toko = (l: ProdukListing) => akunMap.get(l.akun_id)?.nama_toko ?? '—'
  return [
    { kunci: 'sku', judul: 'SKU ERP', kelas: 'font-mono', tetap: true, sel: sku, nilai: sku },
    { kunci: 'nama', judul: 'Nama Produk Marketplace', kelas: 'min-w-[180px]', sel: (l) => l.detail_marketplace?.nama_produk ?? 'Belum dipetakan', nilai: (l) => l.detail_marketplace?.nama_produk ?? '' },
    { kunci: 'tier', judul: 'Jenis Varian', sel: (l) => <div>{l.detail_marketplace?.opsi.length ? l.detail_marketplace.opsi.map((o, i) => <div key={i}>{o.tier}</div>) : '—'}</div> },
    { kunci: 'opsi', judul: 'Pilihan Varian', sel: (l) => <div>{l.detail_marketplace?.opsi.length ? l.detail_marketplace.opsi.map((o, i) => <div key={i}>{o.opsi}</div>) : '—'}</div> },
    { kunci: 'harga_marketplace', judul: 'Harga Marketplace', kelas: 'whitespace-nowrap', sel: (l) => l.detail_marketplace?.harga != null ? <div>{fmtRp(l.detail_marketplace.harga)}{l.detail_marketplace.harga_asli != null && <div className="text-muted-foreground line-through">{fmtRp(l.detail_marketplace.harga_asli)}</div>}</div> : '—' },
    { kunci: 'berat', judul: 'Berat Marketplace', kelas: 'whitespace-nowrap', sel: (l) => <span title={l.detail_marketplace?.ikut_produk.includes('berat_gram') ? 'Mengikuti berat produk' : undefined}>{teksBerat(l.detail_marketplace?.berat_gram)}</span> },
    { kunci: 'dimensi', judul: 'Dimensi Marketplace', kelas: 'whitespace-nowrap', sel: (l) => ukuranPaket(l.detail_marketplace?.panjang_cm, l.detail_marketplace?.lebar_cm, l.detail_marketplace?.tinggi_cm) },
    { kunci: 'preorder', judul: 'Preorder Marketplace', sel: (l) => l.detail_marketplace?.preorder == null ? '—' : l.detail_marketplace.preorder ? `Ya${l.detail_marketplace.hari_kirim != null ? ` · ${l.detail_marketplace.hari_kirim} hari` : ''}` : 'Tidak' },
    { kunci: 'sinkron', judul: 'Snapshot Marketplace', bawaan: false, kelas: 'whitespace-nowrap', sel: (l) => l.detail_marketplace ? fmtDate(l.detail_marketplace.diambil_at) : 'Sinkronkan katalog untuk memetakan' },
    { kunci: 'toko', judul: 'Toko', sel: toko, nilai: toko },
    { kunci: 'platform', judul: 'Platform', sel: (l) => PLATFORM_LABELS[l.platform], nilai: (l) => l.platform },
    { kunci: 'eksternal', judul: 'ID Eksternal', kelas: 'font-mono', sel: (l) => l.id_eksternal, nilai: (l) => l.id_eksternal },
    {
      kunci: 'override',
      judul: 'Harga/Stok Override',
      kelas: 'whitespace-nowrap',
      sel: (l) => `${l.harga_jual ? fmtRp(l.harga_jual) : 'ikut dasar'} / ${l.stok_listing ?? 'ikut stok'}`,
    },
    { kunci: 'status', judul: 'Status', sel: (l) => <Badge variant={l.aktif ? 'default' : 'secondary'}>{l.aktif ? 'Aktif' : 'Nonaktif'}</Badge>, nilai: (l) => l.aktif },
  ]
}

export default function ListingPage() {
  const qc = useQueryClient()
  const [q,setQ]=useState('')
  const [toko,setToko]=useTokoAktif()
  const [statusFilter,setStatusFilter]=useState('')
  const confirm = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ produk_id: '', akun_id: '', id_eksternal: '', harga_jual: '', stok_listing: '' })

  const { data: listing, isLoading, error: queryError, refetch: retryQuery } = useQuery({ queryKey: qk.listing(), queryFn: () => endpoints.listListing() })
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

  const pilih = useTerpilih<ProdukListing>(listing ?? [])

  return (
    <div className="space-y-4">
      {queryError && <QueryError error={queryError} retry={retryQuery} />}
      <BarHalaman judul="Pemetaan Produk Toko" deskripsi="Hubungkan master produk dengan produk dan varian toko.">
        <Sinkronisasi jenis="listing" ids={pilih.daftar.map(p => p.id)} />
        <Button onClick={() => setDialogOpen(true)} disabled={!produkList?.length || !akunList?.length}>
          Tambah Listing
        </Button>
      </BarHalaman>

      <div className="bar-filter"><Input aria-label="Cari pemetaan" placeholder="Cari nama, SKU, ID produk…" value={q} onChange={e=>setQ(e.target.value)}/><FilterPilih id="mapping-toko" label="Toko" nilai={toko} onUbah={setToko} semua="Seluruh toko" opsi={(akunList??[]).map(a=>({value:a.id,label:a.nama_toko}))}/><FilterPilih id="mapping-status" label="Status" nilai={statusFilter} onUbah={setStatusFilter} semua="Semua status" opsi={[{value:'aktif',label:'Aktif'},{value:'nonaktif',label:'Nonaktif'}]}/></div>
      <Card>
        <CardHeader>
          <CardTitle>Pemetaan Produk Toko</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat listing…" />
          ) : (
            <>
              <TabelLokal
                pilihan={{ terpilih: pilih.ada, onUbah: pilih.ubah, semuaDipilih: (listing ?? []).length > 0 && (listing ?? []).every(p => pilih.ada(p.id)), adaYangBisaDipilih: !!listing?.length, onUbahSemua: value => pilih.ubahBanyak(listing ?? [], value) }}
                label="Pemetaan produk ERP ke toko"
                items={listing?.filter(l=>(!toko||l.akun_id===toko)&&(!statusFilter||l.aktif===(statusFilter==='aktif'))&&(`${produkMap.get(l.produk_id)?.nama??''} ${produkMap.get(l.produk_id)?.sku_induk??''} ${l.detail_marketplace?.nama_produk??''} ${l.id_eksternal}`).toLowerCase().includes(q.toLowerCase()))}
                kolom={kolomListing({ produkMap, akunMap })}
                idDari={(l) => l.id}
                namaDari={(l) => l.id_eksternal}
                urutAwal={{ kunci: 'sku', arah: 'asc' }}
                aksi={(l) => (
                  <AksiLainnya>
                    <Sinkronisasi jenis="listing" ids={[l.id]} satu />
                    <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: l.id, aktif: !l.aktif })}>
                      {l.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(l.id)}>
                      Hapus
                    </Button>
                  </AksiLainnya>
                )}
                minWidth={760}
              />
              {(listing ?? []).length === 0 && <p className="py-8 text-center text-muted-foreground">Belum ada listing.</p>}
            </>
          )}
        </CardContent>
      </Card>

      <FormDialog open={dialogOpen} values={form} busy={createMut.isPending} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="listing-produk-sku-induk-1">Produk (SKU Induk)</Label>
              <PilihProduk id="listing-produk-1" value={form.produk_id} onChange={v=>setForm(f=>({...f,produk_id:v}))} items={produkList??[]}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-toko-2">Toko</Label>
              <Select value={form.akun_id} onValueChange={(v) => setForm((f) => ({ ...f, akun_id: v }))}>
                <SelectTrigger id="listing-toko-2" className="w-full">
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
              <Label htmlFor="listing-id-eksternal-id-produk-d-3">ID Eksternal (id produk di toko)</Label>
              <Input id="listing-id-eksternal-id-produk-d-3" value={form.id_eksternal} onChange={(e) => setForm((f) => ({ ...f, id_eksternal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-harga-jual-override-opsi-4">Harga Jual Override (opsional)</Label>
              <MoneyInput id="listing-harga-jual-override-opsi-4" type="number" value={form.harga_jual} onChange={(e) => setForm((f) => ({ ...f, harga_jual: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-stok-override-opsional-5">Stok Override (opsional)</Label>
              <Input id="listing-stok-override-opsional-5"
                type="number"
                value={form.stok_listing}
                onChange={(e) => setForm((f) => ({ ...f, stok_listing: e.target.value }))}
              />
            </div>
          </div>
          {createMut.error&&<p role="alert" className="text-sm text-destructive">{getApiError(createMut.error)}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={createMut.isPending || !form.produk_id || !form.akun_id || !form.id_eksternal}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </FormDialog>
    </div>
  )
}
