import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { fmtRp, fmtDate } from '@/api/client'
import { BarHalaman, TabelLokal, type KolomTabel } from '@/components/daftar'
import PilihNative from '@/components/PilihNative'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'

type Row = { key: string; platform: string; toko: string; no_pesanan: string; dibuat: string | null; status_label: string; nilai_pesanan: number | null; perkiraan_dana_cair: number | null; biaya_sudah_dipotong: boolean | null; status_pencairan: string; catatan?: string }
type Store = { id: string; nama: string; platform: string; total: number; jumlah: number; tanpa_angka: number }
type Result = { loading?: boolean; pesanan: Row[]; jumlah: number; total: number; total_platform: Record<string, number>; per_toko: Store[]; toko: Store[]; status: string[]; lengkap: boolean; tanpa_angka: number; diambil_wib: string; catatan: string; cakupan: { platform: string; tab: string; terbaca: number; total: number; lengkap: boolean }[] }
const marketplace = (p: string) => p === 'tiktok' ? 'TikTok Shop' : 'Lazada'
const biaya = (v: boolean | null) => v === true ? 'Sudah diperhitungkan' : v === false ? 'Belum diperhitungkan' : 'Belum terverifikasi'
const field = 'w-full rounded-lg border bg-background p-2 text-sm'
const columns: KolomTabel<Row>[] = [
  { kunci: 'number', judul: 'Kode Pesanan', sel: r => <span className="break-all">{r.no_pesanan}</span>, nilai: r => r.no_pesanan, tetap: true },
  { kunci: 'shop', judul: 'Nama Toko', sel: r => <><span className="font-medium">{r.toko || 'Nama toko belum tersedia'}</span><span className="block text-xs text-muted-foreground">{marketplace(r.platform)}</span></>, nilai: r => r.toko },
  { kunci: 'date', judul: 'Tanggal Pesanan', sel: r => fmtDate(r.dibuat), nilai: r => r.dibuat },
  { kunci: 'status', judul: 'Status Pengiriman', sel: r => r.status_label, nilai: r => r.status_label },
  { kunci: 'order', judul: 'Nilai Pesanan', sel: r => fmtRp(r.nilai_pesanan), nilai: r => r.nilai_pesanan, rata: 'kanan' },
  { kunci: 'amount', judul: 'Perkiraan Pelepasan Dana', sel: r => <><span className="font-semibold whitespace-nowrap">{fmtRp(r.perkiraan_dana_cair)}</span>{r.perkiraan_dana_cair == null && <span className="block text-xs text-muted-foreground">{r.catatan || 'Estimasi belum tersedia'}</span>}</>, nilai: r => r.perkiraan_dana_cair, rata: 'kanan' },
  { kunci: 'fee', judul: 'Biaya Platform', sel: r => biaya(r.biaya_sudah_dipotong), nilai: r => biaya(r.biaya_sudah_dipotong) },
  { kunci: 'settlement', judul: 'Pencairan', sel: r => r.status_pencairan, nilai: r => r.status_pencairan },
]

export default function SaldoEasyBossPage() {
  const [page, setPage] = useState(1)
  const [platform, setPlatform] = useState('')
  const [toko, setToko] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const q = useQuery({ queryKey: ['saldo-easyboss', platform, toko, status, search, page], queryFn: async () => (await api.get<Result>('/saldo-easyboss', { params: { platform, toko, status, search, page, page_size: 100 } })).data, staleTime: 600000, retry: false, refetchOnWindowFocus: false, refetchInterval: query => query.state.data?.loading ? 3000 : false })
  const data = q.data?.loading ? undefined : q.data
  return <div className="space-y-4">
    <BarHalaman judul="Saldo EasyBoss" />
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <PilihNative aria-label="Marketplace" className={field} value={platform} onChange={e => { setPlatform(e.target.value); setToko(''); setPage(1) }}><option value="">Semua marketplace</option><option value="tiktok">TikTok Shop</option><option value="lazada">Lazada</option></PilihNative>
      <PilihNative aria-label="Toko" className={field} value={toko} onChange={e => { setToko(e.target.value); setPage(1) }}><option value="">Semua toko</option>{data?.toko.filter(s => !platform || s.platform === platform).map(s => <option key={`${s.platform}:${s.id}`} value={s.id}>{s.nama} · {marketplace(s.platform)}</option>)}</PilihNative>
      <PilihNative aria-label="Status pengiriman" className={field} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">Semua status</option>{data?.status.map(s => <option key={s}>{s}</option>)}</PilihNative>
      <Input aria-label="Cari nomor pesanan" placeholder="Cari nomor pesanan" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
    </div>
    {(q.isPending || q.data?.loading) && <Spinner column label="Memuat semua paket EasyBoss… Pembacaan pertama dapat memerlukan beberapa menit." />}
    {q.error && <QueryError error={q.error} retry={q.refetch} />}
    {data && <>
      {!data.lengkap && <p role="alert" className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">Data belum lengkap. Angka di bawah merupakan subtotal pesanan yang berhasil dibaca, bukan seluruh saldo tertahan. {data.cakupan.filter(c => !c.lengkap).map(c => `${marketplace(c.platform)}: ${c.terbaca} dari ${c.total} paket (${c.tab === 'all' ? 'semua status' : 'pengiriman'}).`).join(' ')}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[[data.lengkap ? 'Total Perkiraan Dana' : 'Subtotal Perkiraan Dana', fmtRp(data.jumlah && data.tanpa_angka === data.jumlah ? null : data.total)], ['TikTok Shop', fmtRp(data.total_platform.tiktok)], ['Lazada', fmtRp(data.total_platform.lazada)], ['Pesanan relevan', String(data.jumlah)]].map(([label, value]) => <div key={label} className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 break-words text-base font-semibold tabular-nums sm:text-lg">{value}</div></div>)}
      </div>
      <p className="text-xs text-muted-foreground">{data.catatan}{data.tanpa_angka > 0 && ` ${data.tanpa_angka} pesanan belum memiliki estimasi yang dapat dijumlahkan.`}</p>
      <TabelLokal label="Pesanan menunggu pencairan EasyBoss" items={data.pesanan} kolom={columns} idDari={r => r.key} namaDari={r => r.no_pesanan} minWidth={1100}
        footer={<TableRow className="font-semibold"><TableCell colSpan={5}>Total {data.jumlah} pesanan</TableCell><TableCell className="text-right whitespace-nowrap">{fmtRp(data.total)}</TableCell><TableCell colSpan={2} /></TableRow>} />
      {!data.jumlah && <p className="text-sm text-muted-foreground">Tidak ada pesanan yang memenuhi filter pada data yang terbaca.</p>}
      {data.jumlah > 100 && <div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button><span className="text-sm">Halaman {page} / {Math.ceil(data.jumlah / 100)}</span><Button size="sm" variant="outline" disabled={page * 100 >= data.jumlah} onClick={() => setPage(page + 1)}>Berikutnya</Button></div>}
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Rekap per toko</summary><div className="mt-2 divide-y">{data.per_toko.map(s => <div key={`${s.platform}:${s.id}`} className="flex justify-between gap-3 py-2 text-sm"><div><span className="font-medium">{s.nama}</span><div className="text-xs text-muted-foreground">{marketplace(s.platform)} · {s.jumlah} pesanan{s.tanpa_angka > 0 ? ` · ${s.tanpa_angka} tanpa estimasi` : ''}</div></div><strong className="shrink-0 tabular-nums">{fmtRp(s.total)}</strong></div>)}</div></details>
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Data {data.diambil_wib} WIB · cache 10 menit</p><Button size="sm" variant="outline" disabled={q.isFetching} onClick={() => void q.refetch()}>{q.isFetching ? 'Memuat…' : 'Refresh'}</Button></div>
    </>}
  </div>
}
