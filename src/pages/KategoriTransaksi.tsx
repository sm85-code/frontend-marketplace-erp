import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { buatKategori, daftarKategori, ubahKategori, urutkanKategori, type ArahKategori, type KategoriTransaksi } from '@/api/kategori'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { BarHalaman } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'

const NAMA_ARAH: Record<ArahKategori, string> = { masuk: 'Pemasukan', keluar: 'Pengeluaran' }
const NAMA_HALAMAN = { umum: 'Operasional Umum', packing: 'Operasional Packing' } as const
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60'

type Isi = { nama: string; kelompok: string; operasional: string }
const isiDari = (k: KategoriTransaksi): Isi => ({ nama: k.nama, kelompok: k.kelompok, operasional: k.operasional ?? '' })
const kirim = (i: Isi) => ({ nama: i.nama.trim(), kelompok: i.kelompok, operasional: i.operasional || null })
const penempatan = (k: KategoriTransaksi) => (k.kelompok === '' ? 'Tidak masuk laporan' : k.operasional ? `${k.kelompok} · ${NAMA_HALAMAN[k.operasional]}` : k.kelompok)

function Baris({ k, bisaTulis, simpan, geser, atur, awal, akhir }: { k: KategoriTransaksi; bisaTulis: boolean; simpan: (i: Isi, aktif: boolean) => Promise<void>; geser: (arah: -1 | 1) => void; atur: () => void; awal: boolean; akhir: boolean }) {
  const [nama, setNama] = useState(k.nama)
  useEffect(() => setNama(k.nama), [k.nama])
  const tetap = k.kelompok === '' // "not income / expense" lands nowhere and stays on offer
  const simpanNama = async () => {
    if (nama.trim() === k.nama) return
    if (nama.trim().length < 2) return setNama(k.nama)
    try {
      await simpan({ ...isiDari(k), nama }, k.aktif)
    } catch {
      setNama(k.nama)
    }
  }
  return (
    <TableRow className={k.aktif ? '' : 'opacity-60'}>
      <TableCell className="min-w-56">
        {bisaTulis ? <Input aria-label={`Nama ${k.nama}`} value={nama} maxLength={80} onChange={(e) => setNama(e.target.value)} onBlur={() => void simpanNama()} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /> : k.nama}
      </TableCell>
      <TableCell className="min-w-48 text-muted-foreground">{penempatan(k)}</TableCell>
      <TableCell className="whitespace-nowrap">{k.dipakai > 0 ? `${k.dipakai} baris` : '—'}</TableCell>
      <TableCell>{!k.aktif ? <Badge variant="secondary">Disembunyikan</Badge> : tetap ? <Badge variant="secondary">Tetap</Badge> : <Badge>Aktif</Badge>}</TableCell>
      <TableCell>
        {bisaTulis && (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button type="button" size="sm" variant="outline" aria-label={`Naikkan ${k.nama}`} disabled={awal} onClick={() => geser(-1)}>↑</Button>
            <Button type="button" size="sm" variant="outline" aria-label={`Turunkan ${k.nama}`} disabled={akhir} onClick={() => geser(1)}>↓</Button>
            {!tetap && <Button type="button" size="sm" variant="outline" aria-label={`Atur penempatan ${k.nama}`} onClick={atur}>Atur</Button>}
            {!tetap && <Button type="button" size="sm" variant="outline" aria-label={`${k.aktif ? 'Sembunyikan' : 'Tampilkan'} ${k.nama}`} onClick={() => void simpan(isiDari(k), !k.aktif)}>{k.aktif ? 'Sembunyikan' : 'Tampilkan'}</Button>}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

function DialogAtur({ k, kelompok, onClose, onSimpan }: { k: KategoriTransaksi | null; kelompok: string[]; onClose: () => void; onSimpan: (isi: Isi) => void }) {
  return (
    <Dialog open={!!k} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">{k && <FormAtur key={k.id} k={k} kelompok={kelompok} onSimpan={onSimpan} />}</DialogContent>
    </Dialog>
  )
}

function FormAtur({ k, kelompok, onSimpan }: { k: KategoriTransaksi; kelompok: string[]; onSimpan: (isi: Isi) => void }) {
  const [isi, setIsi] = useState(isiDari(k))
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSimpan(isi)
      }}
    >
      <DialogHeader>
        <DialogTitle>Penempatan {k.nama}</DialogTitle>
        <DialogDescription>Menentukan di mana angka kategori ini muncul. Angka yang sudah tercatat ikut pindah.</DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="atur-kelompok">Kelompok di laporan</Label>
        <select id="atur-kelompok" className={selectCls} value={isi.kelompok} onChange={(e) => setIsi({ ...isi, kelompok: e.target.value })}>
          {kelompok.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      {k.arah === 'keluar' && (
        <div className="space-y-1.5">
          <Label htmlFor="atur-operasional">Ditawarkan di halaman</Label>
          <select id="atur-operasional" className={selectCls} value={isi.operasional} onChange={(e) => setIsi({ ...isi, operasional: e.target.value })}>
            <option value="">Tidak ditawarkan</option>
            {Object.entries(NAMA_HALAMAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}
      <DialogFooter>
        <Button type="submit">Simpan</Button>
      </DialogFooter>
    </form>
  )
}

function DialogBaru({ arah, kelompok, buka, onClose, onSaved }: { arah: ArahKategori; kelompok: string[]; buka: boolean; onClose: () => void; onSaved: () => void }) {
  const [isi, setIsi] = useState<Isi>({ nama: '', kelompok: kelompok[0], operasional: '' })
  useEffect(() => {
    if (buka) setIsi({ nama: '', kelompok: kelompok[0], operasional: '' })
  }, [buka, arah]) // eslint-disable-line react-hooks/exhaustive-deps
  const simpan = useMutation({
    mutationFn: () => buatKategori(arah, kirim(isi)),
    onSuccess: () => {
      toast.success('Kategori ditambahkan')
      onSaved()
      onClose()
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            simpan.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Tambah kategori {NAMA_ARAH[arah].toLowerCase()}</DialogTitle>
            <DialogDescription>Pilih jalur penempatannya: kelompok di laporan{arah === 'keluar' ? ' dan halaman operasional yang menawarkannya' : ''}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="kat-nama">Nama</Label>
            <Input id="kat-nama" autoFocus value={isi.nama} maxLength={80} onChange={(e) => setIsi({ ...isi, nama: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kat-kelompok">Kelompok di laporan</Label>
            <select id="kat-kelompok" className={selectCls} value={isi.kelompok} onChange={(e) => setIsi({ ...isi, kelompok: e.target.value })}>
              {kelompok.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          {arah === 'keluar' && (
            <div className="space-y-1.5">
              <Label htmlFor="kat-operasional">Ditawarkan di halaman</Label>
              <select id="kat-operasional" className={selectCls} value={isi.operasional} onChange={(e) => setIsi({ ...isi, operasional: e.target.value })}>
                <option value="">Tidak ditawarkan</option>
                {Object.entries(NAMA_HALAMAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={simpan.isPending || isi.nama.trim().length < 2}>Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type Tab = 'masuk' | 'keluar' | 'umum' | 'packing'
const TAB: { id: Tab; label: string }[] = [
  { id: 'masuk', label: 'Arus Kas · Pemasukan' },
  { id: 'keluar', label: 'Arus Kas · Pengeluaran' },
  { id: 'umum', label: 'Operasional Umum' },
  { id: 'packing', label: 'Operasional Packing' },
]
const arahTab = (t: Tab): ArahKategori => (t === 'masuk' ? 'masuk' : 'keluar')

/** Kategori Transaksi: rename, add, hide and reorder the categories of money in and out. Ids never change, so nothing already filed breaks. */
export default function KategoriTransaksiPage() {
  const qc = useQueryClient()
  const { bisa } = useAuth()
  const bisaTulis = bisa('kategori_transaksi', 'tulis')
  const [tab, setTab] = useState<Tab>('masuk')
  const [baru, setBaru] = useState(false)
  const [atur, setAtur] = useState<KategoriTransaksi | null>(null)
  const arah = arahTab(tab)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['kategori-transaksi'], queryFn: daftarKategori })
  const segarkan = () => qc.invalidateQueries({ queryKey: ['kategori-transaksi'] })
  const ubah = useMutation({
    mutationFn: (v: { id: string; isi: Isi; aktif: boolean }) => ubahKategori(v.id, { ...kirim(v.isi), aktif: v.aktif }),
    onSuccess: segarkan,
    onError: (e) => toast.error(getApiError(e)),
  })
  const urut = useMutation({ mutationFn: (v: { ids: string[] }) => urutkanKategori(arah, v.ids), onSuccess: segarkan, onError: (e) => toast.error(getApiError(e)) })

  const semuaArah = (data?.items ?? []).filter((k) => k.arah === arah).sort((a, b) => a.urut - b.urut)
  const daftar = semuaArah.filter((k) => (tab === 'umum' || tab === 'packing' ? k.operasional === tab : true))
  const kelompok = data?.kelompok[arah] ?? []
  /** Swaps with the neighbour in this tab, keeping the other categories of the kind where they are. */
  const geser = (i: number, d: -1 | 1) => {
    const ids = semuaArah.map((k) => k.id)
    const a = ids.indexOf(daftar[i].id)
    const b = ids.indexOf(daftar[i + d].id)
    ;[ids[a], ids[b]] = [ids[b], ids[a]]
    urut.mutate({ ids })
  }
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Kategori Transaksi" deskripsi="Nama kategori bisa diubah kapan saja; transaksi yang sudah tercatat tetap di kategori yang sama dan ikut memakai nama baru.">
        {bisaTulis && (
          <Button onClick={() => setBaru(true)} disabled={!data}>
            <Plus /> Tambah kategori
          </Button>
        )}
      </BarHalaman>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          {TAB.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {isLoading && <Spinner label="Memuat kategori…" />}
      {error && <QueryError error={error} retry={refetch} />}
      {data && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <TableShell label="Kategori transaksi" minWidth={760}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama kategori</TableHead>
                    <TableHead>Penempatan</TableHead>
                    <TableHead>Dipakai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftar.map((k, i) => (
                    <Baris key={k.id} k={k} bisaTulis={bisaTulis} awal={i === 0} akhir={i === daftar.length - 1} geser={(d) => geser(i, d)} atur={() => setAtur(k)} simpan={(isi, aktif) => ubah.mutateAsync({ id: k.id, isi, aktif }).then(() => undefined)} />
                  ))}
                  {daftar.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada kategori di sini.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableShell>
            <p className="teks-kecil text-muted-foreground">Mengubah nama hanya mengganti tulisan: di pilihan kategori Arus Kas, tab Pemasukan/Pengeluaran, dan halaman Operasional. Kategori tidak bisa dihapus, hanya disembunyikan dari pilihan baru.</p>
          </CardContent>
        </Card>
      )}
      {data && <DialogBaru arah={arah} kelompok={kelompok} buka={baru} onClose={() => setBaru(false)} onSaved={segarkan} />}
      <DialogAtur k={atur} kelompok={kelompok} onClose={() => setAtur(null)} onSimpan={(isi) => atur && ubah.mutate({ id: atur.id, isi: { ...isi, nama: atur.nama }, aktif: atur.aktif }, { onSuccess: () => setAtur(null) })} />
    </div>
  )
}
