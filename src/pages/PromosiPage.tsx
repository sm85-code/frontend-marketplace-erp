import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { Promosi } from '@/api/types'
import { qk } from '@/api/keys'
import { BarHalaman, TabelData, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { useConfirm } from '@/components/ConfirmProvider'
import { epochPromosi, jadwalAwalPromosi, labelPromosi, validasiJadwalPromosi } from '@/lib/promosi'
import { waktuRetur } from '@/lib/retur'
import DetailPromosi from './promosi/DetailPromosi'

const columns: KolomTabel<Promosi>[] = [
  { kunci: 'nama', judul: 'Promosi', tetap: true, kelas: 'min-w-[180px]', sel: (p) => <div>{p.nama}<small className="block text-muted-foreground">#{p.id}</small></div> },
  { kunci: 'status', judul: 'Status', sel: (p) => <Badge variant="secondary">{labelPromosi(p.status)}</Badge> },
  { kunci: 'mulai', judul: 'Mulai (WIB)', sel: (p) => waktuRetur(p.mulai_at) },
  { kunci: 'selesai', judul: 'Selesai (WIB)', sel: (p) => waktuRetur(p.selesai_at) },
]
export default function PromosiPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [akun, setAkun] = useState('')
  const [status, setStatus] = useState('all')
  const [halaman, setHalaman] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [nama, setNama] = useState('')
  const [jadwal, setJadwal] = useState(() => jadwalAwalPromosi())
  const shops = useQuery({ queryKey: qk.akun(), queryFn: () => api.listAkun() })
  const list = useQuery({ queryKey: ['promosi', akun, status, halaman], queryFn: () => api.daftarPromosi(akun, status, halaman), enabled: !!akun, retry: false })
  const create = useMutation({
    retry: false,
    mutationFn: () => {
      const mulai_at = epochPromosi(jadwal.mulai), selesai_at = epochPromosi(jadwal.selesai)
      validasiJadwalPromosi(mulai_at, selesai_at)
      return api.buatPromosi(akun, { nama: nama.trim(), mulai_at, selesai_at })
    },
    onSuccess: (result) => {
      setCreating(false)
      setSelected(result.id ?? null)
      qc.invalidateQueries({ queryKey: ['promosi', akun] })
    },
  })
  async function submit() {
    if (await confirm({ title: 'Buat promosi di Shopee?', description: `${nama} · ${shops.data?.find((s) => s.id === akun)?.nama_toko}. Jadwal memakai WIB. Tambahkan produk setelah promosi dibuat.` })) create.mutate()
  }
  return <div className="space-y-4 pb-24">
    <BarHalaman judul="Promosi Diskon" deskripsi="Kelola promosi harga produk dan varian Shopee.">
      <Button asChild variant="outline"><Link to="/katalog">Kembali ke Katalog</Link></Button>
      <Button variant="outline" disabled={!akun || list.isFetching} onClick={() => { void list.refetch() }}>Segarkan</Button>
      <Button disabled={!akun || create.isPending} onClick={() => { create.reset(); setCreating(true); setNama(''); setJadwal(jadwalAwalPromosi()) }}>Buat Promosi</Button>
    </BarHalaman>
    <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Pilih toko, buat jadwal promosi, lalu buka Detail untuk menambahkan produk atau varian dan harga diskonnya. Harga mengikuti mata uang toko Shopee. Mengakhiri promosi menghentikan diskon; stok dan harga dasar ERP tidak diubah.</p>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      <div><Label htmlFor="promosi-toko">Toko Shopee</Label><Select value={akun} onValueChange={(v) => { setAkun(v); setHalaman(1); setSelected(null); setCreating(false); create.reset() }} disabled={create.isPending}>
        <SelectTrigger id="promosi-toko" className="w-full"><SelectValue placeholder="Pilih toko" /></SelectTrigger><SelectContent>{shops.data?.filter((s) => s.platform === 'shopee').map((s) => <SelectItem key={s.id} value={s.id}>{s.nama_toko}</SelectItem>)}</SelectContent>
      </Select></div>
      <div><Label htmlFor="promosi-status">Status</Label><Select value={status} onValueChange={(v) => { setStatus(v); setHalaman(1) }}><SelectTrigger id="promosi-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{['all', 'upcoming', 'ongoing', 'expired'].map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'Semua' : labelPromosi(s)}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {creating && <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <div><Label htmlFor="promosi-nama">Nama promosi</Label><Input id="promosi-nama" required maxLength={255} value={nama} onChange={(e) => setNama(e.target.value)} disabled={create.isPending} /></div>
      <div className="grid gap-3 sm:grid-cols-2">{(['mulai', 'selesai'] as const).map((key) => <div key={key}><Label htmlFor={`promosi-${key}`}>{key === 'mulai' ? 'Mulai' : 'Selesai'} (WIB)</Label><Input id={`promosi-${key}`} type="datetime-local" required value={jadwal[key]} onChange={(e) => setJadwal({ ...jadwal, [key]: e.target.value })} disabled={create.isPending} /></div>)}</div>
      <p className="text-xs text-muted-foreground">Mulai minimal 1 jam lagi; durasi minimal 1 jam dan kurang dari 180 hari.</p>
      <div className="flex gap-2"><Button type="submit" disabled={create.isPending || !nama.trim()}>Buat di Shopee</Button><Button type="button" variant="outline" disabled={create.isPending} onClick={() => setCreating(false)}>Batal</Button></div>
    </form>}
    {create.error && <p role="alert" className="break-words text-sm text-destructive">{getApiError(create.error)} Segarkan sebelum mencoba ulang.</p>}
    {create.data?.warnings.map((w) => <p key={w} role="status" className="text-sm">{w}</p>)}
    {list.error && <QueryError error={list.error} retry={list.refetch} />}
    {list.isFetching && <Spinner column label="Memuat promosi…" />}
    {!akun && <p className="text-sm text-muted-foreground">Pilih toko untuk memuat promosi.</p>}
    {list.data && !list.error && <>
      <TabelData label="Promosi diskon Shopee" items={list.data.items} kolom={columns} idDari={(p) => p.id} namaDari={(p) => p.nama} aksi={(p) => <Button variant="outline" size="sm" onClick={() => setSelected(p.id)}>Detail</Button>} />
      <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={halaman <= 1 || list.isFetching} onClick={() => setHalaman(halaman - 1)}>Sebelumnya</Button><span className="text-sm">Halaman {halaman}</span><Button variant="outline" disabled={!list.data.ada_lagi || list.isFetching} onClick={() => setHalaman(halaman + 1)}>Berikutnya</Button></div>
    </>}
    {selected && <DetailPromosi key={`${akun}:${selected}`} akun={akun} id={selected} close={() => setSelected(null)} />}
  </div>
}
