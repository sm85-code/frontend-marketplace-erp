import { RotateCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Overview } from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { APP_BAWAAN, ID_APP, usePengaturanUi, useUbahTeks } from '@/api/pengaturanUi'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { BarHalaman } from '@/components/daftar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GRUP_NAV, NAV, idGrup, idMenu } from '@/config/nav'
import { GRUP_AKSES, idGrupAkses, ROLE_LABELS } from '@/config/roles'
import { bisa } from '@/lib/akses'
import { useAuth } from '@/lib/auth'
import { idBaris, idGrupSheet, idJudul, idTab, TAB_LAPORAN } from '@/lib/namaBaris'
import { isGroup } from '@/lib/sheetEngine'
import { sheetSections } from '@/lib/sheetSections'

interface Teks {
  id: string
  /** What the field is called on this page (the built-in text is always shown under it). */
  nama: string
  bawaan: string
  /** Label of the field when the built-in text does not say what it is (name, subtitle, logo address). */
  judul?: string
  /** The logo is an address, not a title: it is checked before it is saved. */
  alamat?: boolean
}
interface Bagian {
  judul: string
  keterangan?: string
  teks: Teks[]
}
type Kategori = 'aplikasi' | 'menu' | 'laporan'

const LEMBAR = sheetSections({ laporan: [] } as unknown as Overview)
// Pemasukan, Pengeluaran and the groups/rows of Laba/Rugi that come from the categories are named in Kategori Transaksi,
// so only their fixed rows are listed here.
const DARI_KATEGORI = new Set(['produk', 'jasa_proses', 'cat_packing', 'cat', 'tukang', 'pembelian', 'operasional', 'langganan', 'gaji', 'iklan', 'c_keluar'])
const GRUP_KATEGORI = new Set(['Penarikan saldo toko', 'Penjualan dan jasa', 'Harga pokok penjualan', 'Beban operasional'])
const TAMBAHAN: Record<string, Teks[]> = {
  laba_rugi: [{ id: idBaris('laba_kotor'), nama: 'Baris', bawaan: 'Laba kotor' }],
  pengeluaran: [
    { id: idBaris('adj_stok'), nama: 'Baris', bawaan: 'Penyesuaian persediaan' },
    { id: idBaris('adj_utang'), nama: 'Baris', bawaan: 'Penyesuaian utang usaha' },
  ],
}

/** Every text that can be changed here, in the order of the page. The id is what the app goes by; the text is only shown. Add new editable texts here. */
const KATEGORI: Record<Kategori, Bagian[]> = {
  aplikasi: [
    {
      judul: 'Identitas aplikasi',
      keterangan: 'Tampil di sidebar dan di bagian atas layar HP.',
      teks: [
        { id: ID_APP.nama, nama: 'Teks', judul: 'Nama aplikasi', bawaan: APP_BAWAAN.nama },
        { id: ID_APP.subjudul, nama: 'Teks', judul: 'Keterangan di bawah nama', bawaan: APP_BAWAAN.subjudul },
        { id: ID_APP.logo, nama: 'Teks', judul: 'Alamat gambar logo', bawaan: APP_BAWAAN.logo, alamat: true },
      ],
    },
    { judul: 'Kelompok halaman di pengaturan role', keterangan: 'Judul kelompok pada tabel hak akses di Kelola Pengguna dan Role.', teks: GRUP_AKSES.map((g) => ({ id: idGrupAkses(g), nama: 'Kelompok', bawaan: g })) },
    { judul: 'Nama role bawaan', keterangan: 'Role buatan sendiri diberi nama di Kelola Pengguna.', teks: Object.entries(ROLE_LABELS).map(([id, nama]) => ({ id: `role:${id}`, nama: 'Role', bawaan: nama })) },
  ],
  menu: [
    { judul: 'Kelompok menu', teks: GRUP_NAV.map((g) => ({ id: idGrup(g.id), nama: 'Kelompok', bawaan: g.label })) },
    ...GRUP_NAV.map((g) => ({
      judul: `Menu ${g.label}`,
      keterangan: 'Nama menu sekaligus judul halamannya.',
      teks: NAV.filter((n) => n.grup === g.id).map((n) => ({ id: idMenu(n.to), nama: 'Menu', bawaan: n.label })),
    })),
  ],
  laporan: [
    { judul: 'Nama tab', teks: TAB_LAPORAN.map(([tabel, nama]) => ({ id: idTab(tabel), nama: 'Tab', bawaan: nama })) },
    ...LEMBAR.map((sec) => ({
      judul: `Laporan: ${sec.title.slice(3).toLowerCase()}`,
      keterangan: 'Judul tabel, judul kelompok, dan baris tetap.',
      teks: [
        { id: idJudul(sec.tabel), nama: 'Judul tabel', bawaan: sec.title.slice(3) },
        ...sec.rows.flatMap((r): Teks[] =>
          isGroup(r)
            ? GRUP_KATEGORI.has(r.label) ? [] : [{ id: idGrupSheet(r.tabel, r.label), nama: 'Kelompok', bawaan: r.label }]
            : r.key.startsWith('shop:') || DARI_KATEGORI.has(r.key) ? [] : [{ id: idBaris(r.key), nama: 'Baris', bawaan: r.label }],
        ),
        ...(TAMBAHAN[sec.tabel] ?? []),
      ],
    })),
  ],
}
const NAMA_KATEGORI: Record<Kategori, string> = { aplikasi: 'Aplikasi', menu: 'Menu', laporan: 'Laporan Keuangan' }

const alamatSah = (a: string) => /^https:\/\/\S+$/.test(a) || /^\/[^\s/]\S*$/.test(a)

function Kolom({ t, sekarang, bisaUbah }: { t: Teks; sekarang: string | undefined; bisaUbah: boolean }) {
  const ubah = useUbahTeks()
  const tampil = sekarang ?? t.bawaan
  const [isi, setIsi] = useState(tampil)
  const [lama, setLama] = useState(tampil)
  if (lama !== tampil) {
    setLama(tampil)
    setIsi(tampil)
  }
  const jalankan = (teks: string | null) =>
    ubah.mutate(
      { id: t.id, teks },
      { onError: (e) => { setIsi(tampil); toast.error(getApiError(e)) } },
    )
  const simpan = () => {
    const teks = isi.trim().replace(/\s+/g, ' ')
    if (teks === tampil || teks === '') return setIsi(tampil)
    if (t.alamat && !alamatSah(teks)) {
      toast.error('Alamat logo harus diawali https:// atau /')
      return setIsi(tampil)
    }
    jalankan(teks === t.bawaan ? null : teks)
  }
  const diubah = sekarang !== undefined
  const idKolom = `kolom-${t.id.replace(/\s+/g, '_')}`
  return (
    <div className="space-y-1.5">
      <div className="flex h-6 items-center justify-between gap-2">
        <label htmlFor={idKolom} className="min-w-0 truncate text-sm font-medium" title={t.bawaan}>{t.judul ?? t.bawaan}</label>
        {!(diubah && bisaUbah) && <span className="min-w-0 shrink truncate text-xs text-muted-foreground">{t.judul ? `Bawaan: ${t.bawaan}` : t.nama}</span>}
        {diubah && bisaUbah && (
          <button type="button" className="flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline" aria-label={`Kembalikan ${t.bawaan}`} onClick={() => jalankan(null)}>
            <RotateCcw className="size-3" aria-hidden="true" />
            Kembalikan
          </button>
        )}
      </div>
      <Input id={idKolom} value={isi} maxLength={120} disabled={!bisaUbah} className={diubah ? 'border-primary/60' : undefined} onChange={(e) => setIsi(e.target.value)} onBlur={simpan} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
    </div>
  )
}

function KartuBagian({ b, data, bisaUbah }: { b: Bagian; data: Record<string, string> | undefined; bisaUbah: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{b.judul}</CardTitle>
        {b.keterangan && <p className="text-sm text-muted-foreground">{b.keterangan}</p>}
      </CardHeader>
      <CardContent className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {b.teks.map((t) => (
          <Kolom key={t.id} t={t} sekarang={data?.[t.id]} bisaUbah={bisaUbah} />
        ))}
      </CardContent>
    </Card>
  )
}

function PratinjauLogo({ data }: { data: Record<string, string> | undefined }) {
  const alamat = data?.[ID_APP.logo] ?? APP_BAWAAN.logo
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <img src={alamat} alt="Pratinjau logo" className="h-12 w-16 shrink-0 rounded-md bg-white object-contain" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = APP_BAWAAN.logo }} />
      <div className="min-w-0">
        <div className="font-heading truncate text-sm font-semibold">{data?.[ID_APP.nama] ?? APP_BAWAAN.nama}</div>
        <div className="truncate text-xs text-muted-foreground">{data?.[ID_APP.subjudul] ?? APP_BAWAAN.subjudul}</div>
      </div>
      <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Pratinjau di sidebar</p>
    </div>
  )
}

export default function KelolaAplikasi() {
  const { akses } = useAuth()
  const bisaUbah = bisa(akses, 'kelola_aplikasi', 'tulis')
  const { data, isLoading, error, refetch } = usePengaturanUi()
  const [kategori, setKategori] = useState<Kategori>('aplikasi')
  const [cari, setCari] = useState('')

  const bagian = useMemo(() => {
    const k = cari.trim().toLowerCase()
    const semua = k ? (Object.keys(KATEGORI) as Kategori[]).flatMap((x) => KATEGORI[x]) : KATEGORI[kategori]
    if (!k) return semua
    return semua
      .map((b) => ({ ...b, teks: b.teks.filter((t) => t.bawaan.toLowerCase().includes(k) || (data?.[t.id] ?? '').toLowerCase().includes(k)) }))
      .filter((b) => b.teks.length > 0)
  }, [cari, kategori, data])
  const jumlahUbah = data ? Object.keys(data).length : 0

  return (
    <div className="space-y-5">
      <BarHalaman judul="Kelola Aplikasi" deskripsi="Ubah tulisan yang tampil di aplikasi. Hanya tampilan yang berubah; data dan cara kerja tetap sama." />
      {!bisaUbah && <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Anda hanya bisa melihat halaman ini.</p>}
      <div className="flex flex-wrap items-center gap-3">
        {!cari && (
          <Tabs value={kategori} onValueChange={(v) => setKategori(v as Kategori)}>
            <TabsList>
              {(Object.keys(KATEGORI) as Kategori[]).map((k) => (
                <TabsTrigger key={k} value={k}>{NAMA_KATEGORI[k]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari teks di semua bagian..." className="pl-9" aria-label="Cari teks" />
        </div>
        {jumlahUbah > 0 && <span className="text-sm text-muted-foreground">{jumlahUbah} teks diubah</span>}
      </div>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <QueryError error={error} retry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          {!cari && kategori === 'aplikasi' && <PratinjauLogo data={data} />}
          {bagian.map((b) => (
            <KartuBagian key={`${b.judul}-${b.teks[0]?.id}`} b={b} data={data} bisaUbah={bisaUbah} />
          ))}
          {cari && bagian.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada teks yang cocok.</p>}
        </div>
      )}
    </div>
  )
}
