import PilihNative from '@/components/PilihNative'
import AksiLainnya from '@/components/AksiLainnya'
import InfoTip from '@/components/InfoTip'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { useLabel } from '@/api/pengaturanUi'
import { idMenu } from '@/config/nav'
import { buatKategori, buatKelompok, daftarKategori, ubahKategori, ubahKelompok, urutkanKategori, type ArahKategori, type Kelompok, type KategoriTransaksi } from '@/api/kategori'
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
import { useAuth } from '@/lib/auth'
import { namaMenuBawaan, useNamaTab } from '@/lib/namaMenu'
import { aliranLaporan, namaGanda } from '@/lib/aliranKategori'

const TABEL_ARAH: Record<ArahKategori, string> = { masuk: 'pemasukan', keluar: 'pengeluaran' }
const NAMA_HALAMAN = { umum: namaMenuBawaan('/operasional-umum'), packing: namaMenuBawaan('/operasional-packing'), supplier: namaMenuBawaan('/belanja-supplier'), tukang: namaMenuBawaan('/belanja-tukang') } as const
const PATH_HALAMAN = { umum: '/operasional-umum', packing: '/operasional-packing', supplier: '/belanja-supplier', tukang: '/belanja-tukang' } as const
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60'

type Isi = { nama: string; kelompok: string; operasional: string; kasKecil: boolean }
const isiDari = (k: KategoriTransaksi): Isi => ({ nama: k.nama, kelompok: k.kelompok_id, operasional: k.operasional ?? '', kasKecil: !!k.kas_kecil })
const kirim = (i: Isi) => ({ nama: i.nama.trim(), kelompok: i.kelompok, operasional: i.operasional || null, kas_kecil: i.kasKecil })

/** "Dibayar dari Kas Kecil": the entries come out of the petty cash, not Kas Utama (Arus Kas takes them off Kas Kecil). */
function PilihKasKecil({ id, isi, setIsi }: { id: string; isi: Isi; setIsi: (i: Isi) => void }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm">
      <input id={id} type="checkbox" className="mt-0.5 size-4" checked={isi.kasKecil} onChange={(e) => setIsi({ ...isi, kasKecil: e.target.checked })} />
      <span>
        Dibayar dari Kas Kecil
        <span className="block text-xs text-muted-foreground">Tetap dihitung sebagai biaya, tapi uangnya keluar dari Kas Kecil, bukan Kas Utama.</span>
      </span>
    </label>
  )
}
const BadgeKasKecil = ({ k }: { k: KategoriTransaksi }) => (k.arah === 'keluar' && k.kas_kecil ? <Badge variant="outline" className="ml-1">Kas Kecil</Badge> : null)
/** Names of the two Operasional pages as set on Kelola Aplikasi. */
function useNamaHalaman() {
  const t = useLabel()
  return Object.fromEntries(Object.entries(NAMA_HALAMAN).map(([v, n]) => [v, t(idMenu(PATH_HALAMAN[v as keyof typeof PATH_HALAMAN]), n)])) as Record<keyof typeof NAMA_HALAMAN, string>
}
const penempatan = (k: KategoriTransaksi, halaman: Record<string, string>) => (k.kelompok === '' ? 'Tidak masuk laporan' : k.operasional ? `${k.kelompok} · ${halaman[k.operasional]}` : k.kelompok)

/** The name being typed and what leaving the field does: save a changed name, or put the saved one back when it is too short or refused. */
function useNama(k: KategoriTransaksi, simpan: (i: Isi, aktif: boolean) => Promise<void>) {
  const [nama, setNama] = useState(k.nama)
  useEffect(() => setNama(k.nama), [k.nama])
  const keluar = async () => {
    if (nama.trim() === k.nama) return
    if (nama.trim().length < 2) return setNama(k.nama)
    try {
      await simpan({ ...isiDari(k), nama }, k.aktif)
    } catch {
      setNama(k.nama)
    }
  }
  return { nama, setNama, keluar }
}

type PropsBaris = { k: KategoriTransaksi; ganda?: string; bisaGeser?: boolean; bisaTulis: boolean; simpan: (i: Isi, aktif: boolean) => Promise<void>; geser: (arah: -1 | 1) => void; atur: () => void; awal: boolean; akhir: boolean }

const Status = ({ k }: { k: KategoriTransaksi }) => (!k.aktif ? <Badge variant="secondary">Disembunyikan</Badge> : k.kelompok === '' ? <Badge variant="secondary">Tetap</Badge> : <Badge>Aktif</Badge>)

function Aksi({ k, simpan, geser, atur, awal, akhir, bisaGeser = true }: PropsBaris) {
  const tetap = k.kelompok === '' // "not income / expense" lands nowhere and stays on offer
  return (
    <div className="flex shrink-0 items-center gap-1 md:justify-end">
      {bisaGeser && <>
      <Button type="button" size="icon" className="h-8 w-8" variant="outline" aria-label={`Naikkan ${k.nama}`} disabled={awal} onClick={() => geser(-1)}>↑</Button>
      <Button type="button" size="icon" className="h-8 w-8" variant="outline" aria-label={`Turunkan ${k.nama}`} disabled={akhir} onClick={() => geser(1)}>↓</Button>
      </>}
      {!tetap && (
        <AksiLainnya>
          <Button type="button" size="sm" variant="outline" aria-label={`Atur penempatan ${k.nama}`} onClick={atur}>Atur penempatan</Button>
          <Button type="button" size="sm" variant="outline" aria-label={`${k.aktif ? 'Sembunyikan' : 'Tampilkan'} ${k.nama}`} onClick={() => void simpan(isiDari(k), !k.aktif)}>{k.aktif ? 'Sembunyikan' : 'Tampilkan'}</Button>
        </AksiLainnya>
      )}
    </div>
  )
}

const KolomNama = ({ k, bisaTulis, n }: { k: KategoriTransaksi; bisaTulis: boolean; n: ReturnType<typeof useNama> }) =>
  bisaTulis ? <Input aria-label={`Nama ${k.nama}`} value={n.nama} maxLength={80} onChange={(e) => n.setNama(e.target.value)} onBlur={() => void n.keluar()} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /> : <>{k.nama}</>

const ARAH_LABEL: Record<ArahKategori, string> = { masuk: 'Masuk', keluar: 'Keluar' }
const dipakaiTeks = (k: KategoriTransaksi) => {
  const bagian = [k.dipakai > 0 ? `${k.dipakai} entri` : '', (k.dipakai_arus_kas ?? 0) > 0 ? `${k.dipakai_arus_kas} baris Arus Kas` : ''].filter(Boolean)
  return bagian.length ? bagian.join(' · ') : '—'
}
const Ganda = ({ ganda }: { ganda?: string }) => (ganda ? <Badge variant="outline" className="ml-1 border-amber-400 text-amber-700">Nama mirip: {ganda}</Badge> : null)

function Baris(p: PropsBaris) {
  const halaman = useNamaHalaman()
  const { k, bisaTulis } = p
  const n = useNama(k, p.simpan)
  return (
    <TableRow className={k.aktif ? '' : 'opacity-60'}>
      <TableCell className="min-w-52"><KolomNama k={k} bisaTulis={bisaTulis} n={n} /><Ganda ganda={p.ganda} /></TableCell>
      <TableCell><Badge variant="secondary">{ARAH_LABEL[k.arah]}</Badge></TableCell>
      <TableCell className="whitespace-nowrap">{k.operasional ? halaman[k.operasional] : 'Arus Kas langsung'}<BadgeKasKecil k={k} /></TableCell>
      <TableCell className="whitespace-nowrap">{k.kelompok || 'Tidak masuk laba/rugi'}</TableCell>
      <TableCell className="min-w-56"><Aliran k={k} /></TableCell>
      <TableCell className="whitespace-nowrap">{dipakaiTeks(k)}</TableCell>
      <TableCell><Status k={k} /></TableCell>
      <TableCell>{bisaTulis && <Aksi {...p} />}</TableCell>
    </TableRow>
  )
}

/** Which reports the figures of a category end up in (see src/lib/aliranKategori.ts). */
function Aliran({ k }: { k: KategoriTransaksi }) {
  const tab = useNamaTab()
  const halaman = useNamaHalaman()
  return <p className="mt-0.5 text-xs text-muted-foreground">{aliranLaporan(k, tab, halaman)}</p>
}

/** Phone layout: one card per category, so nothing scrolls sideways. */
function Kartu(p: PropsBaris) {
  const halaman = useNamaHalaman()
  const { k, bisaTulis } = p
  const n = useNama(k, p.simpan)
  return (
    <li className={`space-y-1 rounded-lg border p-2 ${k.aktif ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1"><KolomNama k={k} bisaTulis={bisaTulis} n={n} /></div>
        {bisaTulis && <Aksi {...p} />}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 teks-kecil text-muted-foreground">
        <Badge variant="secondary">{ARAH_LABEL[k.arah]}</Badge>
        <span>{penempatan(k, halaman)}</span>
        <BadgeKasKecil k={k} />
        <Status k={k} />
        <span>{dipakaiTeks(k)}</span>
        <Ganda ganda={p.ganda} />
      </div>
      <div className="px-1"><Aliran k={k} /></div>
    </li>
  )
}

function DialogAtur({ k, kelompok, onClose, onSimpan }: { k: KategoriTransaksi | null; kelompok: Kelompok[]; onClose: () => void; onSimpan: (isi: Isi) => void }) {
  return (
    <Dialog open={!!k} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">{k && <FormAtur key={k.id} k={k} kelompok={kelompok} onSimpan={onSimpan} />}</DialogContent>
    </Dialog>
  )
}

function FormAtur({ k, kelompok, onSimpan }: { k: KategoriTransaksi; kelompok: Kelompok[]; onSimpan: (isi: Isi) => void }) {
  const halaman = useNamaHalaman()
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
        <PilihNative id="atur-kelompok" className={selectCls} value={isi.kelompok} onChange={(e) => setIsi({ ...isi, kelompok: e.target.value })}>
          {kelompok.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </PilihNative>
      </div>
      {k.arah === 'keluar' && (
        <div className="space-y-1.5">
          <Label htmlFor="atur-operasional">Ditawarkan di halaman</Label>
          <PilihNative id="atur-operasional" className={selectCls} value={isi.operasional} onChange={(e) => setIsi({ ...isi, operasional: e.target.value })}>
            <option value="">Tidak ditawarkan</option>
            {Object.entries(halaman).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </PilihNative>
        </div>
      )}
      {k.arah === 'keluar' && <PilihKasKecil id="atur-kas-kecil" isi={isi} setIsi={setIsi} />}
      <DialogFooter>
        <Button type="submit">Simpan</Button>
      </DialogFooter>
    </form>
  )
}

function DialogBaru({ arah, kelompok, buka, onClose, onSaved }: { arah: ArahKategori; kelompok: Kelompok[]; buka: boolean; onClose: () => void; onSaved: () => void }) {
  const halaman = useNamaHalaman()
  const tab = useNamaTab()
  const [isi, setIsi] = useState<Isi>({ nama: '', kelompok: kelompok[0]?.id ?? '', operasional: '', kasKecil: false })
  useEffect(() => {
    if (buka) setIsi({ nama: '', kelompok: kelompok[0]?.id ?? '', operasional: '', kasKecil: false })
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
            <DialogTitle>Tambah kategori {tab(TABEL_ARAH[arah]).toLowerCase()}</DialogTitle>
            <DialogDescription>Pilih jalur penempatannya: kelompok di laporan{arah === 'keluar' ? ' dan halaman operasional yang menawarkannya' : ''}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="kat-nama">Nama</Label>
            <Input id="kat-nama" autoFocus value={isi.nama} maxLength={80} onChange={(e) => setIsi({ ...isi, nama: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kat-kelompok">Kelompok di laporan</Label>
            <PilihNative id="kat-kelompok" className={selectCls} value={isi.kelompok} onChange={(e) => setIsi({ ...isi, kelompok: e.target.value })}>
              {kelompok.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </PilihNative>
          </div>
          {arah === 'keluar' && (
            <div className="space-y-1.5">
              <Label htmlFor="kat-operasional">Ditawarkan di halaman</Label>
              <PilihNative id="kat-operasional" className={selectCls} value={isi.operasional} onChange={(e) => setIsi({ ...isi, operasional: e.target.value })}>
                <option value="">Tidak ditawarkan</option>
                {Object.entries(halaman).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </PilihNative>
            </div>
          )}
          {arah === 'keluar' && <PilihKasKecil id="kat-kas-kecil" isi={isi} setIsi={setIsi} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={simpan.isPending || isi.nama.trim().length < 2}>Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Names of the groups of the Pemasukan / Pengeluaran tabs: change them or add one. Categories point at the id, so nothing breaks. */
function PanelKelompok({ arah, kelompok, bisaTulis, onChanged }: { arah: ArahKategori; kelompok: Kelompok[]; bisaTulis: boolean; onChanged: () => void }) {
  const tab = useNamaTab()
  const [baru, setBaru] = useState('')
  const tambah = useMutation({
    mutationFn: () => buatKelompok(arah, baru.trim()),
    onSuccess: () => {
      setBaru('')
      onChanged()
      toast.success('Kelompok ditambahkan')
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  return (
    <section aria-label="Kelompok laporan" className="space-y-2">
      <h2 className="flex items-center gap-1 text-sm font-semibold">Kelompok di laporan <InfoTip teks={`Judul kelompok di tab ${tab(TABEL_ARAH[arah])} dan pilihan penempatan di atas. Ganti nama kapan saja; kategori yang sudah ditempatkan tetap di kelompoknya.`} /></h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {kelompok.map((g) => <ItemKelompok key={g.id} g={g} bisaTulis={bisaTulis} onChanged={onChanged} />)}
      </ul>
      {bisaTulis && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (baru.trim().length >= 2) tambah.mutate()
          }}
        >
          <Input aria-label="Nama kelompok baru" className="w-64" placeholder="Nama kelompok baru" value={baru} maxLength={80} onChange={(e) => setBaru(e.target.value)} />
          <Button type="submit" variant="outline" disabled={tambah.isPending || baru.trim().length < 2}><Plus /> Tambah kelompok</Button>
        </form>
      )}
    </section>
  )
}

function ItemKelompok({ g, bisaTulis, onChanged }: { g: Kelompok; bisaTulis: boolean; onChanged: () => void }) {
  const [nama, setNama] = useState(g.nama)
  useEffect(() => setNama(g.nama), [g.nama])
  const simpan = useMutation({ mutationFn: () => ubahKelompok(g.id, nama.trim()), onSuccess: onChanged, onError: (e) => { toast.error(getApiError(e)); setNama(g.nama) } })
  if (!bisaTulis) return <li className="rounded-md border px-3 py-2 text-sm">{g.nama}</li>
  return (
    <li>
      <Input
        aria-label={`Nama kelompok ${g.nama}`}
        value={nama}
        maxLength={80}
        onChange={(e) => setNama(e.target.value)}
        onBlur={() => (nama.trim().length < 2 ? setNama(g.nama) : nama.trim() !== g.nama && simpan.mutate())}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </li>
  )
}

type FilterArah = 'semua' | ArahKategori
type Sumber = 'semua' | 'arus_kas' | 'umum' | 'packing' | 'supplier' | 'tukang'
type FilterStatus = 'aktif' | 'sembunyi' | 'semua'
type Urut = 'laporan' | 'nama' | 'kelompok' | 'dipakai'
/** Kategori Transaksi: one table of every category with filters; rename, add, hide and reorder. Ids never change, so nothing already filed breaks. */
export default function KategoriTransaksiPage({ tertanam = false }: { tertanam?: boolean }) {
  const qc = useQueryClient()
  const { bisa } = useAuth()
  const bisaTulis = bisa('kategori_transaksi', 'tulis')
  const [fArah, setFArah] = useState<FilterArah>('semua')
  const [sumber, setSumber] = useState<Sumber>('semua')
  const [fStatus, setFStatus] = useState<FilterStatus>('semua')
  const [urutan, setUrutan] = useState<Urut>('laporan')
  const [cari, setCari] = useState('')
  const [baru, setBaru] = useState<ArahKategori | null>(null)
  const [atur, setAtur] = useState<KategoriTransaksi | null>(null)
  const halaman = useNamaHalaman()
  const namaTab = useNamaTab()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['kategori-transaksi'], queryFn: daftarKategori })
  const segarkan = () => qc.invalidateQueries({ queryKey: ['kategori-transaksi'] })
  const ubah = useMutation({
    mutationFn: (v: { id: string; isi: Isi; aktif: boolean }) => ubahKategori(v.id, { ...kirim(v.isi), aktif: v.aktif }),
    onSuccess: segarkan,
    onError: (e) => toast.error(getApiError(e)),
  })
  const urut = useMutation({ mutationFn: (v: { arah: ArahKategori; ids: string[] }) => urutkanKategori(v.arah, v.ids), onSuccess: segarkan, onError: (e) => toast.error(getApiError(e)) })

  const semua = data?.items ?? []
  const ganda = namaGanda(semua)
  const kata = cari.trim().toLocaleLowerCase('id-ID')
  const daftar = semua
    .filter((k) => fArah === 'semua' || k.arah === fArah)
    .filter((k) => sumber === 'semua' || (sumber === 'arus_kas' ? !k.operasional : k.operasional === sumber))
    .filter((k) => fStatus === 'semua' || (fStatus === 'aktif' ? k.aktif : !k.aktif))
    .filter((k) => !kata || k.nama.toLocaleLowerCase('id-ID').includes(kata))
    .sort((a, b) =>
      urutan === 'nama' ? a.nama.localeCompare(b.nama, 'id') :
      urutan === 'kelompok' ? (a.kelompok || '~').localeCompare(b.kelompok || '~', 'id') || a.urut - b.urut :
      urutan === 'dipakai' ? (b.dipakai + (b.dipakai_arus_kas ?? 0)) - (a.dipakai + (a.dipakai_arus_kas ?? 0)) :
      a.arah.localeCompare(b.arah) * -1 || a.urut - b.urut, // masuk first, then keluar, each in report order
    )
  // Moving only means something in report order within one direction.
  const bisaGeser = urutan === 'laporan' && fArah !== 'semua'
  const geser = (i: number, d: -1 | 1) => {
    const arah = daftar[i].arah
    const ids = semua.filter((k) => k.arah === arah).sort((a, b) => a.urut - b.urut).map((k) => k.id)
    const a = ids.indexOf(daftar[i].id)
    const b = ids.indexOf(daftar[i + d].id)
    ;[ids[a], ids[b]] = [ids[b], ids[a]]
    urut.mutate({ arah, ids })
  }
  const jumlahGanda = ganda.size
  const pilih = (label: string, value: string, set: (v: string) => void, opsi: [string, string][]) => (
    <label className="grid gap-1 text-xs text-muted-foreground">{label}
      <select className={selectCls} value={value} onChange={(e) => set(e.target.value)} aria-label={label}>
        {opsi.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
  const tombolTambah = bisaTulis && (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setBaru('masuk')} disabled={!data} variant="outline"><Plus /> Kategori pemasukan</Button>
      <Button onClick={() => setBaru('keluar')} disabled={!data}><Plus /> Kategori pengeluaran</Button>
    </div>
  )
  const deskripsi = 'Nama kategori bisa diubah kapan saja; transaksi yang sudah tercatat ikut memakai nama baru. Kategori tidak bisa dihapus, hanya disembunyikan dari pilihan baru.'
  const props = (k: KategoriTransaksi, i: number) => ({
    k, bisaTulis, ganda: ganda.get(k.id), bisaGeser, awal: i === 0, akhir: i === daftar.length - 1,
    geser: (d: -1 | 1) => geser(i, d), atur: () => setAtur(k),
    simpan: (isi: Isi, aktif: boolean) => ubah.mutateAsync({ id: k.id, isi, aktif }).then(() => undefined),
  })
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      {tertanam ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{deskripsi}</p>
          {tombolTambah}
        </div>
      ) : (
        <BarHalaman judul="Kategori Transaksi" deskripsi={deskripsi}>{tombolTambah}</BarHalaman>
      )}
      <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Kategori dipilih pada baris {namaTab('arus_kas')}. Angka sebuah kategori baru masuk laporan bila ada baris {namaTab('arus_kas')} yang diberi kategori itu; kolom "Masuk ke" menunjukkan laporan yang dituju. {namaTab('neraca')} tidak memakai kategori: isinya diambil dari baris {namaTab('arus_kas')} (seperti saldo kas akhir), laba bersih {namaTab('laba_rugi')}, dan angka yang diisi langsung.
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {pilih('Arah', fArah, (v) => setFArah(v as FilterArah), [['semua', 'Semua'], ['masuk', 'Masuk'], ['keluar', 'Keluar']])}
        {pilih('Sumber', sumber, (v) => setSumber(v as Sumber), [['semua', 'Semua'], ['arus_kas', 'Arus Kas langsung'], ['umum', halaman.umum], ['packing', halaman.packing], ['supplier', halaman.supplier], ['tukang', halaman.tukang]])}
        {pilih('Status', fStatus, (v) => setFStatus(v as FilterStatus), [['semua', 'Semua'], ['aktif', 'Aktif'], ['sembunyi', 'Disembunyikan']])}
        {pilih('Urutkan', urutan, (v) => setUrutan(v as Urut), [['laporan', 'Urutan laporan'], ['nama', 'Nama'], ['kelompok', 'Kelompok'], ['dipakai', 'Paling dipakai']])}
        <label className="grid gap-1 text-xs text-muted-foreground">Cari<Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Nama kategori…" aria-label="Cari kategori" /></label>
      </div>
      {jumlahGanda > 0 && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">{jumlahGanda} kategori punya nama yang mirip dengan kategori lain. Ganti salah satunya agar tidak tertukar.</p>}
      {urutan === 'laporan' && fArah === 'semua' && bisaTulis && <p className="text-xs text-muted-foreground">Pilih Arah Masuk atau Keluar untuk mengubah urutan.</p>}
      {isLoading && <Spinner label="Memuat kategori…" />}
      {error && <QueryError error={error} retry={refetch} />}
      {data && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <ul className="space-y-3 md:hidden" aria-label="Kategori transaksi">
              {daftar.map((k, i) => <Kartu key={k.id} {...props(k, i)} />)}
              {daftar.length === 0 && <li className="text-center text-sm text-muted-foreground">Tidak ada kategori yang cocok.</li>}
            </ul>
            <div className="hidden md:block">
            <TableShell label="Kategori transaksi" minWidth={1100}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama kategori</TableHead>
                    <TableHead>Arah</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Kelompok {namaTab('laba_rugi')}</TableHead>
                    <TableHead>Masuk ke</TableHead>
                    <TableHead>Dipakai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftar.map((k, i) => <Baris key={k.id} {...props(k, i)} />)}
                  {daftar.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">Tidak ada kategori yang cocok.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableShell>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-1 text-sm font-semibold">Kelompok pemasukan</h3><PanelKelompok arah="masuk" kelompok={data.kelompok_daftar.masuk ?? []} bisaTulis={bisaTulis} onChanged={segarkan} /></div>
              <div><h3 className="mb-1 text-sm font-semibold">Kelompok pengeluaran</h3><PanelKelompok arah="keluar" kelompok={data.kelompok_daftar.keluar ?? []} bisaTulis={bisaTulis} onChanged={segarkan} /></div>
            </div>
          </CardContent>
        </Card>
      )}
      {data && baru && <DialogBaru arah={baru} kelompok={data.kelompok_daftar[baru] ?? []} buka onClose={() => setBaru(null)} onSaved={segarkan} />}
      <DialogAtur k={atur} kelompok={atur ? data?.kelompok_daftar[atur.arah] ?? [] : []} onClose={() => setAtur(null)} onSimpan={(isi) => atur && ubah.mutate({ id: atur.id, isi: { ...isi, nama: atur.nama }, aktif: atur.aktif }, { onSuccess: () => setAtur(null) })} />
    </div>
  )
}
