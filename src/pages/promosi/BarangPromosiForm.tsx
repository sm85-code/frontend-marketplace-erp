import MoneyInput from '@/components/MoneyInput'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { PromosiProdukInput } from '@/api/types'
import QueryError from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/ConfirmProvider'

export default function BarangPromosiForm({ akun, id, blocked, onPending }: { akun: string; id: string; blocked: boolean; onPending: (value: boolean) => void }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [katalog, setKatalog] = useState('')
  const [model, setModel] = useState('')
  const [operasi, setOperasi] = useState<PromosiProdukInput['operasi']>('tambah')
  const [harga, setHarga] = useState('')
  const [batas, setBatas] = useState('0')
  const [stok, setStok] = useState('')
  const products = useQuery({ queryKey: ['promosi-katalog', akun, search, page], queryFn: () => api.listKatalog({ akun_id: akun, q: search, halaman: page, per_halaman: 40 }), retry: false })
  const chosen = useQuery({ queryKey: ['katalog', 'one', katalog], queryFn: () => api.getKatalog(katalog), enabled: !!katalog, retry: false })
  const mutation = useMutation({
    retry: false,
    onMutate: () => onPending(true),
    onSettled: () => onPending(false),
    mutationFn: () => api.kelolaBarangPromosi(akun, id, {
      operasi, katalog_id: katalog, ...(model ? { model_id: model } : {}),
      ...(operasi !== 'hapus' ? { harga, batas_pembelian: Number(batas) } : {}),
      ...(operasi === 'tambah' && stok.trim() ? { stok_promo: Number(stok) } : {}),
    }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['promosi', akun] })
      qc.invalidateQueries({ queryKey: ['katalog'] })
      if (result.ok) { setHarga(''); setStok(''); setKatalog(''); setModel('') }
    },
  })
  const pending = blocked || mutation.isPending
  async function submit() {
    if (await confirm({ title: 'Ubah produk promosi di Shopee?', description: `${operasi}: ${chosen.data?.nama} ${model ? `· ${chosen.data?.varian.find((v) => v.model_id === model)?.nama}` : ''}${operasi !== 'hapus' ? ` · Harga ${harga} (mata uang toko)` : ''}${operasi === 'tambah' && stok.trim() ? ` · Stok promo ${stok}` : ''}. Perubahan berlaku di toko Shopee.`, destructive: operasi === 'hapus' })) mutation.mutate()
  }
  return <section className="space-y-3 rounded-lg border p-3" aria-label="Kelola produk promosi">
    <div className="flex gap-2"><Input aria-label="Cari produk untuk promosi" placeholder="Cari nama atau SKU" value={q} onChange={(e) => setQ(e.target.value)} /><Button variant="outline" disabled={pending} onClick={() => { setSearch(q); setPage(1) }}>Cari</Button></div>
    {products.error && <QueryError error={products.error} retry={products.refetch} />}
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <div><Label htmlFor="promo-operasi">Tindakan</Label><Select value={operasi} onValueChange={(v) => setOperasi(v as PromosiProdukInput['operasi'])} disabled={pending}><SelectTrigger id="promo-operasi" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tambah">Tambah produk/varian</SelectItem><SelectItem value="ubah">Ubah harga dan batas pembelian</SelectItem><SelectItem value="hapus">Hapus produk/varian dari promosi</SelectItem></SelectContent></Select></div>
      <div><Label htmlFor="promo-produk">Produk Shopee</Label><Select value={katalog} onValueChange={(v) => { setKatalog(v); setModel(''); mutation.reset() }} disabled={pending}><SelectTrigger id="promo-produk" className="w-full"><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{products.data?.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama} · {p.sku || p.item_id}</SelectItem>)}</SelectContent></Select></div>
      {!!chosen.data?.varian.length && <div><Label htmlFor="promo-model">Varian</Label><Select value={model} onValueChange={setModel} disabled={pending}><SelectTrigger id="promo-model" className="w-full"><SelectValue placeholder="Pilih varian" /></SelectTrigger><SelectContent>{chosen.data.varian.filter((v) => v.model_id).map((v) => <SelectItem key={v.model_id} value={v.model_id!}>{v.nama} · {v.sku || v.model_id}</SelectItem>)}</SelectContent></Select></div>}
      {operasi !== 'hapus' && <>
        <div><Label htmlFor="promo-harga">Harga promo (mata uang toko)</Label><MoneyInput id="promo-harga" type="number" min="0.0001" step="any" required value={harga} onChange={(e) => setHarga(e.target.value)} disabled={pending} /></div>
        <div><Label htmlFor="promo-batas">Batas pembelian (0 = tanpa batas)</Label><Input id="promo-batas" type="number" min="0" step="1" required value={batas} onChange={(e) => setBatas(e.target.value)} disabled={pending} /></div>
      </>}
      {operasi === 'tambah' && <div>
        <Label htmlFor="promo-stok">Stok khusus promosi (opsional)</Label>
        <Input id="promo-stok" type="number" min="1" max="2147483647" step="1" value={stok} onChange={(e) => setStok(e.target.value)} disabled={pending} aria-describedby="promo-stok-petunjuk" placeholder="Kosong: pengaturan bawaan Shopee" />
        <p id="promo-stok-petunjuk" className="mt-1 text-xs text-muted-foreground">Isi jumlah untuk produk atau varian yang dipilih saat ditambahkan. Shopee memeriksa ketersediaan stok. Stok promo yang sudah ditetapkan tidak bisa diubah langsung.</p>
      </div>}
      <Button type="submit" disabled={pending || !chosen.data || !!chosen.error || (!!chosen.data.varian.length && !model)}>Kirim ke Shopee</Button>
    </form>
    {chosen.error && <QueryError error={chosen.error} retry={chosen.refetch} />}
    {products.data && <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" size="sm" disabled={page <= 1 || products.isFetching || pending} onClick={() => setPage(page - 1)}>Produk sebelumnya</Button><span className="text-xs">Halaman katalog {page}</span><Button variant="ghost" size="sm" disabled={page * 40 >= products.data.total || products.isFetching || pending} onClick={() => setPage(page + 1)}>Produk berikutnya</Button></div>}
    {mutation.error && <p role="alert" className="break-words text-destructive">{getApiError(mutation.error)} Segarkan detail sebelum mencoba ulang.</p>}
    {mutation.data && <div role={mutation.data.ok ? 'status' : 'alert'} className="break-words">
      <p>{mutation.data.ok ? 'Perubahan dikonfirmasi Shopee.' : 'Shopee menolak sebagian atau seluruh perubahan.'} {mutation.data.request_id && `Request ID: ${mutation.data.request_id}`}</p>
      {mutation.data.gagal.map((f, i) => <p key={i}>{f.fail_error} {f.fail_message} · Item {f.item_id} · Model {f.model_id}</p>)}
      {mutation.data.warnings.map((w) => <p key={w}>{w}</p>)}
    </div>}
    <p className="text-xs text-muted-foreground">Pilihan berasal dari katalog toko ini. Jika belum lengkap, sinkronkan katalog. Pengaturan stok promo dikirim ke Shopee; pencatatan stok ERP tidak diubah oleh formulir ini.</p>
  </section>
}
