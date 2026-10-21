import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'

const NAMA_ARAH: Record<ArahKategori, string> = { masuk: 'Pemasukan', keluar: 'Pengeluaran' }
const NAMA_HALAMAN = { umum: 'Operasional Umum', packing: 'Operasional Packing' } as const
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60'

type Isi = { nama: string; kelompok: string; operasional: string }
const isiDari = (k: KategoriTransaksi): Isi => ({ nama: k.nama, kelompok: k.kelompok, operasional: k.operasional ?? '' })
const kirim = (i: Isi) => ({ nama: i.nama.trim(), kelompok: i.kelompok, operasional: i.operasional || null })

function Baris({ k, nomor, kelompok, bisaTulis, simpan, geser, awal, akhir }: { k: KategoriTransaksi; nomor: number; kelompok: string[]; bisaTulis: boolean; simpan: (i: Isi, aktif: boolean) => Promise<void>; geser: (arah: -1 | 1) => void; awal: boolean; akhir: boolean }) {
  const [isi, setIsi] = useState(() => isiDari(k))
  useEffect(() => setIsi(isiDari(k)), [k.nama, k.kelompok, k.operasional]) // eslint-disable-line react-hooks/exhaustive-deps
  const tetap = k.kelompok === '' // "not income / expense" lands nowhere and stays on offer
  const simpanJika = async (n: Isi) => {
    setIsi(n)
    if (n.nama.trim().length < 2) return setIsi(isiDari(k))
    try {
      await simpan(n, k.aktif)
    } catch {
      setIsi(isiDari(k))
    }
  }
  const nama = (kolom: string) => `${kolom} ${k.nama}`
  return (
    <TableRow className={k.aktif ? '' : 'opacity-60'}>
      <TableCell className="w-10 tabular-nums">{nomor}</TableCell>
      <TableCell className="min-w-56">
        {bisaTulis ? (
          <Input aria-label={nama('Nama')} value={isi.nama} maxLength={80} onChange={(e) => setIsi({ ...isi, nama: e.target.value })} onBlur={() => isi.nama.trim() !== k.nama && void simpanJika(isi)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        ) : (
          k.nama
        )}
        {k.dipakai > 0 && <span className="teks-kecil ml-2 text-muted-foreground">{k.dipakai} transaksi</span>}
      </TableCell>
      <TableCell className="min-w-44">
        {tetap ? (
          <span className="text-muted-foreground">Tidak masuk laporan</span>
        ) : (
          <select aria-label={nama('Kelompok')} className={selectCls} disabled={!bisaTulis} value={isi.kelompok} onChange={(e) => void simpanJika({ ...isi, kelompok: e.target.value })}>
            {kelompok.map((g) => <option key={g}>{g}</option>)}
          </select>
        )}
      </TableCell>
      <TableCell className="min-w-44">
        {k.arah === 'keluar' && !tetap ? (
          <select aria-label={nama('Halaman operasional')} className={selectCls} disabled={!bisaTulis} value={isi.operasional} onChange={(e) => void simpanJika({ ...isi, operasional: e.target.value })}>
            <option value="">Tidak ditawarkan</option>
            {Object.entries(NAMA_HALAMAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="w-24">
        {tetap ? <Badge variant="secondary">Tetap</Badge> : <Switch aria-label={nama('Tampilkan')} checked={k.aktif} disabled={!bisaTulis} onCheckedChange={(v) => void simpan(isi, v)} />}
      </TableCell>
      <TableCell className="w-24 text-right">
        {bisaTulis && (
          <div className="flex justify-end gap-1">
            <Button type="button" size="icon" variant="ghost" aria-label={nama('Naikkan')} disabled={awal} onClick={() => geser(-1)}><ArrowUp /></Button>
            <Button type="button" size="icon" variant="ghost" aria-label={nama('Turunkan')} disabled={akhir} onClick={() => geser(1)}><ArrowDown /></Button>
          </div>
        )}
      </TableCell>
    </TableRow>
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

/** Kategori Transaksi: rename, add, hide and reorder the categories of money in and out. Ids never change, so nothing already filed breaks. */
export default function KategoriTransaksiPage() {
  const qc = useQueryClient()
  const { bisa } = useAuth()
  const bisaTulis = bisa('kategori_transaksi', 'tulis')
  const [arah, setArah] = useState<ArahKategori>('masuk')
  const [baru, setBaru] = useState(false)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['kategori-transaksi'], queryFn: daftarKategori })
  const segarkan = () => qc.invalidateQueries({ queryKey: ['kategori-transaksi'] })
  const ubah = useMutation({
    mutationFn: (v: { id: string; isi: Isi; aktif: boolean }) => ubahKategori(v.id, { ...kirim(v.isi), aktif: v.aktif }),
    onSuccess: segarkan,
    onError: (e) => toast.error(getApiError(e)),
  })
  const urut = useMutation({ mutationFn: (v: { ids: string[] }) => urutkanKategori(arah, v.ids), onSuccess: segarkan, onError: (e) => toast.error(getApiError(e)) })

  const daftar = (data?.items ?? []).filter((k) => k.arah === arah).sort((a, b) => a.urut - b.urut)
  const kelompok = data?.kelompok[arah] ?? []
  const geser = (i: number, d: -1 | 1) => {
    const ids = daftar.map((k) => k.id)
    ;[ids[i], ids[i + d]] = [ids[i + d], ids[i]]
    urut.mutate({ ids })
  }
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Kategori Transaksi" deskripsi="Nama dan penempatan kategori pemasukan dan pengeluaran. Nama boleh diganti kapan saja; isinya tetap sama.">
        {bisaTulis && (
          <Button onClick={() => setBaru(true)} disabled={!data}>
            <Plus /> Tambah kategori
          </Button>
        )}
      </BarHalaman>
      <Tabs value={arah} onValueChange={(v) => setArah(v as ArahKategori)}>
        <TabsList>
          <TabsTrigger value="masuk">Pemasukan</TabsTrigger>
          <TabsTrigger value="keluar">Pengeluaran</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading && <Spinner label="Memuat kategori…" />}
      {error && <QueryError error={error} retry={refetch} />}
      {data && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="teks-kecil text-muted-foreground">Kategori yang disembunyikan tidak muncul sebagai pilihan baru, tetapi angka yang sudah tercatat tetap dihitung. Kategori tidak bisa dihapus.</p>
            <TableShell label={`Kategori ${NAMA_ARAH[arah].toLowerCase()}`} minWidth={760}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelompok di laporan</TableHead>
                    <TableHead>Halaman operasional</TableHead>
                    <TableHead>Tampil</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Urutan</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftar.map((k, i) => (
                    <Baris key={k.id} k={k} nomor={i + 1} kelompok={kelompok} bisaTulis={bisaTulis} awal={i === 0} akhir={i === daftar.length - 1} geser={(d) => geser(i, d)} simpan={(isi, aktif) => ubah.mutateAsync({ id: k.id, isi, aktif }).then(() => undefined)} />
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </CardContent>
        </Card>
      )}
      {data && <DialogBaru arah={arah} kelompok={kelompok} buka={baru} onClose={() => setBaru(false)} onSaved={segarkan} />}
    </div>
  )
}
