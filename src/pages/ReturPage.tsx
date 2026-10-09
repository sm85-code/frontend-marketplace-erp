import Bantuan from '@/components/Bantuan'
import { useTokoAktif } from '@/lib/tokoAktif'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { ReturMarketplace, ReturItem } from '@/api/types'
import { qk } from '@/api/keys'
import { BarHalaman, TabelData, type KolomTabel } from '@/components/daftar'
import SengketaForm from './retur/SengketaForm'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { labelRetur, nominalRetur, rentangAwalRetur, solusiRetur, validasiRentangRetur, waktuRetur } from '@/lib/retur'
import { useConfirm } from '@/components/ConfirmProvider'

type Filter = { akunId: string; dari: string; sampai: string; halaman: number }
const columns: KolomTabel<ReturMarketplace>[] = [
  { kunci: 'retur', judul: 'No. Retur', tetap: true, kelas: 'min-w-[170px]', sel: (r) => <span className="font-mono">{r.nomor_retur}</span> },
  { kunci: 'pesanan', judul: 'Pesanan', sel: (r) => r.pesanan_id ? <Link className="text-primary underline" to={`/pesanan/${encodeURIComponent(r.pesanan_id)}`}>{r.nomor_pesanan}</Link> : <span>{r.nomor_pesanan}<small className="block text-muted-foreground">Belum tersinkron ke ERP</small></span> },
  { kunci: 'status', judul: 'Status Retur', kelas: 'min-w-[140px]', sel: (r) => <Badge variant="secondary">{labelRetur(r.status)}</Badge> },
  { kunci: 'solusi', judul: 'Solusi', sel: (r) => solusiRetur(r.solusi) },
  { kunci: 'refund', judul: 'Nominal Refund', rata: 'kanan', sel: (r) => nominalRetur(r.nominal_refund, r.mata_uang) },
  { kunci: 'alasan', judul: 'Alasan Pembeli', kelas: 'min-w-[180px] max-w-[280px] break-words', sel: (r) => r.alasan_pembeli || r.alasan || '—' },
  { kunci: 'dibuat', judul: 'Diajukan', sel: (r) => waktuRetur(r.dibuat_at) },
  { kunci: 'tenggat', judul: 'Tenggat Penjual', sel: (r) => { const t=r.tenggat_penjual_at??r.tenggat_at; const near=t&&t*1000-Date.now()<86400000&&!['CLOSED','CANCELLED','ACCEPTED'].includes(r.status); return <span className={near?'font-semibold text-destructive':''}>{waktuRetur(t)}{near&&<small className="block">{t*1000<Date.now()?'Tenggat terlewat':'Segera tangani'}</small>}</span> } },
]

export default function ReturPage() {
  const [activeShop, setActiveShop] = useTokoAktif(true)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(() => ({ akunId: activeShop, ...rentangAwalRetur() }))
  const [filter, setFilter] = useState<Filter | null>(null)
  const [selected, setSelected] = useState<{ akunId: string; nomor: string } | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  const shops = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const list = useQuery({
    queryKey: ['retur', 'daftar', filter],
    queryFn: () => endpoints.daftarRetur(filter!.akunId, { dari: filter!.dari, sampai: filter!.sampai, halaman: filter!.halaman }),
    enabled: !!filter,
    retry: false,
  })
  function apply() {
    const error = !draft.akunId ? 'Pilih toko Shopee terlebih dahulu.' : validasiRentangRetur(draft.dari, draft.sampai)
    setValidation(error)
    if (!error) {
      setSelected(null)
      setFilter({ ...draft, halaman: 1 })
    }
  }
  return <div className="space-y-4 pb-24">
    <BarHalaman judul="Retur & Refund" deskripsi="Permintaan retur/refund dari Shopee; status terpisah dari pesanan.">
      <Button asChild variant="outline"><Link to="/pesanan">Kembali ke Pesanan</Link></Button>
      <Button variant="outline" disabled={!filter || list.isFetching} onClick={() => { void list.refetch() }}>Refresh</Button>
    </BarHalaman>
    <Bantuan judul="Cara menangani retur">
      <p>Pilih toko dan tanggal pengajuan, lalu klik Tampilkan. Buka Detail untuk memeriksa barang, alasan, nominal refund, dan tenggat penanganan.</p>
      <p className="text-muted-foreground">Rentang maksimal 15 hari kalender (WIB). Gunakan halaman berikutnya untuk melihat semua hasil. Persetujuan tersedia di Detail. Permintaan maupun persetujuan retur tidak otomatis menambah stok atau mencatat dana settlement. Bukti foto dan pengajuan sengketa tersedia di Detail; persyaratan mengikuti Shopee.</p>
    </Bantuan>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    <form className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); apply() }}>
      <div className="space-y-1"><Label htmlFor="retur-toko">Toko Shopee</Label><Select value={draft.akunId} onValueChange={(akunId) => { setActiveShop(akunId); setDraft({ ...draft, akunId }) }}>
        <SelectTrigger id="retur-toko" className="w-full"><SelectValue placeholder="Pilih toko" /></SelectTrigger>
        <SelectContent>{(shops.data ?? []).filter((s) => s.platform === 'shopee').map((s) => <SelectItem key={s.id} value={s.id}>{s.nama_toko}</SelectItem>)}</SelectContent>
      </Select></div>
      <div className="space-y-1"><Label htmlFor="retur-dari">Tanggal awal (WIB)</Label><Input id="retur-dari" type="date" value={draft.dari} onChange={(e) => setDraft({ ...draft, dari: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor="retur-sampai">Tanggal akhir (WIB)</Label><Input id="retur-sampai" type="date" value={draft.sampai} onChange={(e) => setDraft({ ...draft, sampai: e.target.value })} /></div>
      <Button type="submit" className="self-end" disabled={list.isFetching}>Tampilkan</Button>
    </form>
    {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
    {list.error && <QueryError error={list.error} retry={list.refetch} />}
    {list.isFetching && <Spinner column label="Memuat retur dari Shopee…" />}
    {!filter && <p className="text-sm text-muted-foreground">Pilih toko dan klik Tampilkan untuk memuat data retur.</p>}
    {list.data && !list.error && filter && <>
      <p className="text-sm text-muted-foreground">{shops.data?.find((s) => s.id === filter.akunId)?.nama_toko} · Pengajuan {filter.dari} sampai {filter.sampai} WIB · Halaman {filter.halaman}</p>
      <Input aria-label="Cari retur pada halaman ini" placeholder="Cari nomor pesanan atau retur pada halaman ini…" value={search} onChange={e => setSearch(e.target.value)} />
      <TabelData label="Retur dan refund Shopee" items={list.data.items.filter(r => `${r.nomor_retur} ${r.nomor_pesanan}`.toLowerCase().includes(search.toLowerCase()))} kolom={columns} idDari={(r) => r.nomor_retur} namaDari={(r) => r.nomor_retur}
        aksi={(r) => <Button variant="outline" size="sm" onClick={() => setSelected({ akunId: r.akun_id, nomor: r.nomor_retur })}>Detail</Button>} />
      {list.data.items.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada retur pada halaman dan rentang pengajuan ini.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" disabled={filter.halaman <= 1 || list.isFetching} onClick={() => setFilter({ ...filter, halaman: filter.halaman - 1 })}>Sebelumnya</Button>
        <span className="text-sm">Halaman {filter.halaman}{list.data.ada_lagi ? ' · Masih ada hasil berikutnya' : ' · Halaman terakhir'}</span>
        <Button variant="outline" disabled={!list.data.ada_lagi || list.isFetching} onClick={() => setFilter({ ...filter, halaman: filter.halaman + 1 })}>Berikutnya</Button>
      </div>
    </>}
    {selected && <DetailRetur key={`${selected.akunId}:${selected.nomor}`} selected={selected} close={() => setSelected(null)} />}
  </div>
}

function DetailRetur({ selected, close }: { selected: { akunId: string; nomor: string }; close: () => void }) {
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [disputeBusy, setDisputeBusy] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const detail = useQuery({ queryKey: ['retur', 'detail', selected.akunId, selected.nomor], queryFn: () => endpoints.getRetur(selected.akunId, selected.nomor), retry: false })
  const approve = useMutation({
    retry: false,
    mutationFn: () => endpoints.konfirmasiRetur(selected.akunId, selected.nomor),
    onSuccess: (result) => {
      setConfirmed(true)
      if (result.retur) qc.setQueryData(['retur', 'detail', selected.akunId, selected.nomor], result.retur)
      qc.invalidateQueries({ queryKey: ['retur'] })
    },
  })
  async function onApprove() {
    if (await confirm({ title: 'Setujui retur/refund di Shopee?', description: `Retur ${selected.nomor} · ${detail.data?.nama_toko}. Anda menyetujui solusi dan refund yang sedang berlaku di Shopee. Keputusan tidak otomatis menambah stok atau settlement ERP.`, destructive: true })) approve.mutate()
  }
  const r = detail.data
  const items: KolomTabel<ReturItem>[] = [
    { kunci: 'nama', judul: 'Produk', tetap: true, kelas: 'min-w-[180px] max-w-[280px] break-words', sel: (i) => i.nama || '—' },
    { kunci: 'sku', judul: 'SKU / Varian', sel: (i) => <div>{i.sku_varian || i.sku || '—'}<small className="block text-muted-foreground">Item {i.item_id ?? '—'} · Model {i.model_id ?? '—'}</small></div> },
    { kunci: 'qty', judul: 'Qty Retur', sel: (i) => i.qty ?? '—' },
    { kunci: 'harga', judul: 'Harga Item', rata: 'kanan', sel: (i) => nominalRetur(i.harga, r?.mata_uang ?? null) },
    { kunci: 'refund', judul: 'Refund Item', rata: 'kanan', sel: (i) => nominalRetur(i.nominal_refund, r?.mata_uang ?? null) },
  ]
  return <Dialog open onOpenChange={(o) => !o && !approve.isPending && !disputeBusy && close()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
    <DialogHeader><DialogTitle>Retur #{selected.nomor}</DialogTitle></DialogHeader>
    {detail.error ? <QueryError error={detail.error} retry={detail.refetch} /> : !r ? <Spinner column label="Memuat detail retur…" /> : <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2"><Badge>{labelRetur(r.status)}</Badge><span>{r.nama_toko}</span><span>{solusiRetur(r.solusi)}</span></div>
      <p>Pesanan: {r.pesanan_id ? <Link className="text-primary underline" to={`/pesanan/${encodeURIComponent(r.pesanan_id)}`}>{r.nomor_pesanan}</Link> : `${r.nomor_pesanan} (belum tersinkron ke ERP)`}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ['Nominal refund', nominalRetur(r.nominal_refund, r.mata_uang)], ['Alasan', r.alasan],
          ['Penjelasan pembeli', r.alasan_pembeli], ['Alasan setelah peninjauan', r.alasan_peninjauan],
          ['Tenggat penanganan', waktuRetur(r.tenggat_at)], ['Tenggat penjual', waktuRetur(r.tenggat_penjual_at)],
          ['Tenggat pembeli kirim barang', waktuRetur(r.tenggat_kirim_at)], ['Diperbarui Shopee', waktuRetur(r.diperbarui_at)],
          ['Pengembalian barang diperlukan', r.perlu_pengembalian_barang == null ? '—' : r.perlu_pengembalian_barang ? 'Ya' : 'Tidak'],
          ['Resi retur', r.nomor_resi], ['Kurir retur', r.kurir], ['Negosiasi', r.status_negosiasi],
          ['Bukti penjual', r.status_bukti], ['Kompensasi penjual', r.status_kompensasi],
        ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value || '—'}</dd></div>)}
      </dl>
      <TabelData label="Barang dalam retur" items={r.items} kolom={items} idDari={(i) => `${i.item_id}:${i.model_id}:${r.items.indexOf(i)}`} namaDari={(i) => i.nama} />
      <p className="text-muted-foreground">Nominal refund item hanya ditampilkan jika diberikan Shopee; harga item bukan pengganti refund. Pastikan barang benar-benar diterima dan diperiksa sebelum mencatat penambahan stok ERP.</p>
      <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={approve.isPending || disputeBusy || confirmed || detail.isFetching} onClick={onApprove}>Setujui Retur / Refund</Button><Button variant="outline" disabled={approve.isPending || disputeBusy || detail.isFetching} onClick={() => { void detail.refetch() }}>Refresh Detail</Button></div>
      <SengketaForm shop={selected.akunId} sn={selected.nomor} disabled={approve.isPending || confirmed} onBusy={setDisputeBusy} onComplete={() => setConfirmed(true)} />
      {approve.error && <p role="alert" className="break-words text-destructive">{getApiError(approve.error)} Refresh detail sebelum mencoba ulang.</p>}
      {approve.data && <p role="status" className="break-words">Persetujuan dikonfirmasi Shopee. {approve.data.warnings.join(' ')} {approve.data.request_id && `Request ID: ${approve.data.request_id}`}</p>}
    </div>}
  </DialogContent></Dialog>
}
