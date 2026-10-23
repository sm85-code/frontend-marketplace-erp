import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { Overview } from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { APP_BAWAAN, ID_APP, usePengaturanUi, useUbahTeks } from '@/api/pengaturanUi'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { BarHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import KelolaMenuBawah from '@/pages/KelolaMenuBawah'
import PengaturanAsistenAI from '@/pages/PengaturanAsistenAI'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GRUP_NAV, NAV, idGrup, idMenu } from '@/config/nav'
import { GRUP_AKSES, idGrupAkses, ROLE_LABELS } from '@/config/roles'
import { bisa } from '@/lib/akses'
import { useAuth } from '@/lib/auth'
import { idBaris, idGrupSheet, idJudul, idTab, TAB_LAPORAN } from '@/lib/namaBaris'
import { isGroup } from '@/lib/sheetEngine'
import { sheetSections } from '@/lib/sheetSections'
import LogoApp from '@/components/LogoApp'

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
type Kategori = 'aplikasi' | 'menu' | 'bawah' | 'laporan' | 'kategori' | 'role' | 'ai'
type KategoriTeks = Exclude<Kategori, 'bawah' | 'ai' | 'kategori'>
const URUTAN_TAB: Kategori[] = ['menu', 'bawah', 'laporan', 'kategori', 'role', 'aplikasi', 'ai']

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
const KATEGORI: Record<KategoriTeks, Bagian[]> = {
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
  ],
  role: [
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
    ...LEMBAR.map((sec) => {
      const tab = TAB_LAPORAN.find(([tabel]) => tabel === sec.tabel)
      return {
        judul: `Tabel ${tab?.[1] ?? sec.title.slice(3).toLowerCase()}`,
        keterangan: 'Nama tab juga menjadi judul di atas tabel; isi "Judul di atas tabel" hanya bila judulnya ingin berbeda dari nama tab.',
        teks: [
          ...(tab ? [{ id: idTab(tab[0]), nama: 'Tab', judul: `Nama tab: ${tab[1]}`, bawaan: tab[1] }] : []),
          { id: idJudul(sec.tabel), nama: 'Judul tabel', judul: `Judul di atas tabel: ${sec.title.slice(3)}`, bawaan: sec.title.slice(3) },
          ...sec.rows.flatMap((r): Teks[] =>
            isGroup(r)
              ? GRUP_KATEGORI.has(r.label) ? [] : [{ id: idGrupSheet(r.tabel, r.label), nama: 'Kelompok', bawaan: r.label }]
              : r.key.startsWith('shop:') || DARI_KATEGORI.has(r.key) ? [] : [{ id: idBaris(r.key), nama: 'Baris', bawaan: r.label }],
          ),
          ...(TAMBAHAN[sec.tabel] ?? []),
        ],
      }
    }),
    // Tabs without a table of their own (none today) still get their name field.
    ...(() => {
      const sisa = TAB_LAPORAN.filter(([tabel]) => !LEMBAR.some((sec) => sec.tabel === tabel))
      return sisa.length ? [{ judul: 'Nama tab lainnya', teks: sisa.map(([tabel, nama]) => ({ id: idTab(tabel), nama: 'Tab', bawaan: nama })) }] : []
    })(),
  ],
}
const NAMA_KATEGORI: Record<Kategori, string> = { menu: 'Menu & Judul Halaman', bawah: 'Menu Bawah HP', laporan: 'Teks Laporan Keuangan', kategori: 'Kategori Transaksi', role: 'Role', aplikasi: 'Nama & Logo', ai: 'Asisten AI' }
const KETERANGAN_KATEGORI: Record<Kategori, string> = {
  menu: 'Nama menu di sidebar, sekaligus judul halamannya.',
  bawah: 'Pilih sampai 4 menu untuk bilah bawah layar HP tiap role.',
  laporan: 'Nama tab, judul tabel, kelompok, dan baris tetap di Laporan Keuangan.',
  kategori: 'Kategori pemasukan dan pengeluaran beserta laporan yang dituju.',
  role: 'Nama role bawaan dan judul kelompok pada pengaturan hak akses.',
  aplikasi: 'Nama aplikasi, keterangan di bawahnya, dan logo di sidebar serta layar HP.',
  ai: 'Pengaturan Asisten AI.',
}

const KategoriTransaksiPage = lazy(() => import('@/pages/KategoriTransaksi'))

const alamatSah = (a: string) => /^https:\/\/\S+$/.test(a) || /^\/[^\s/]\S*$/.test(a)

/** The text being typed for one id and what leaving the field does: save a changed text, put the saved one back when it is empty or refused, or drop the setting when it equals the built-in one. */
function useTeks(t: Teks, sekarang: string | undefined) {
  const ubah = useUbahTeks()
  const tampil = sekarang ?? t.bawaan
  const [isi, setIsi] = useState(tampil)
  const [lama, setLama] = useState(tampil)
  if (lama !== tampil) {
    setLama(tampil)
    setIsi(tampil)
  }
  const jalankan = (teks: string | null) => ubah.mutate({ id: t.id, teks }, { onError: (e) => { setIsi(tampil); toast.error(getApiError(e)) } })
  const keluar = () => {
    const teks = isi.trim().replace(/\s+/g, ' ')
    if (teks === tampil || teks === '') return setIsi(tampil)
    if (t.alamat && !alamatSah(teks)) {
      toast.error('Alamat logo harus diawali https:// atau /')
      return setIsi(tampil)
    }
    jalankan(teks === t.bawaan ? null : teks)
  }
  return { isi, setIsi, keluar, kembalikan: () => jalankan(null), diubah: sekarang !== undefined }
}

type PropsBaris = { t: Teks; sekarang: string | undefined; bisaUbah: boolean }

const Isian = ({ t, k, bisaUbah }: { t: Teks; k: ReturnType<typeof useTeks>; bisaUbah: boolean }) =>
  bisaUbah ? (
    <Input aria-label={`Teks untuk ${t.judul ?? t.bawaan}`} value={k.isi} maxLength={120} onChange={(e) => k.setIsi(e.target.value)} onBlur={k.keluar} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  ) : (
    <>{k.isi}</>
  )

function Baris({ t, sekarang, bisaUbah }: PropsBaris) {
  const k = useTeks(t, sekarang)
  return (
    <TableRow>
      <TableCell className="min-w-56">{t.judul ?? t.bawaan}</TableCell>
      <TableCell className="min-w-64"><Isian t={t} k={k} bisaUbah={bisaUbah} /></TableCell>
      <TableCell className="whitespace-nowrap text-right">
        {bisaUbah && k.diubah && <Button type="button" size="sm" variant="outline" aria-label={`Kembalikan ${t.judul ?? t.bawaan}`} onClick={k.kembalikan}>Kembalikan</Button>}
      </TableCell>
    </TableRow>
  )
}

/** Phone layout: one card per text, so nothing scrolls sideways. */
function Kartu({ t, sekarang, bisaUbah }: PropsBaris) {
  const k = useTeks(t, sekarang)
  return (
    <li className="space-y-1 rounded-lg border p-2">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t.judul ?? t.bawaan}</span>
        {bisaUbah && k.diubah && <Button type="button" size="sm" variant="outline" aria-label={`Kembalikan ${t.judul ?? t.bawaan}`} onClick={k.kembalikan}>Kembalikan</Button>}
      </div>
      <Isian t={t} k={k} bisaUbah={bisaUbah} />
    </li>
  )
}

function PratinjauLogo({ data }: { data: Record<string, string> | undefined }) {
  const alamat = data?.[ID_APP.logo] ?? APP_BAWAAN.logo
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <LogoApp src={alamat} alt="Pratinjau logo" className="h-12" tinggi={48} />
      <div className="min-w-0">
        <div className="font-heading truncate text-sm font-semibold">{data?.[ID_APP.nama] ?? APP_BAWAAN.nama}</div>
        <div className="truncate text-xs text-muted-foreground">{data?.[ID_APP.subjudul] ?? APP_BAWAAN.subjudul}</div>
      </div>
      <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Pratinjau di sidebar</p>
    </div>
  )
}

/** Kelola Aplikasi: change the texts the app shows. Only the shown text changes; every text has a fixed id, so nothing stored or calculated is affected. */
export default function KelolaAplikasi() {
  const { akses, bisa: bisaMenu } = useAuth()
  const bisaUbah = bisa(akses, 'kelola_aplikasi', 'tulis')
  // A role with only Kategori Transaksi access reaches this page for that tab alone.
  const bisaTeks = bisaMenu('kelola_aplikasi')
  const bisaKategori = bisaMenu('kategori_transaksi')
  const { data, isLoading, error, refetch } = usePengaturanUi()
  const [params, setParams] = useSearchParams()
  const diminta = params.get('tab') as Kategori | null
  const tabTampil = URUTAN_TAB.filter((k) => (k === 'kategori' ? bisaKategori : bisaTeks && (k !== 'ai' || bisaMenu('asisten'))))
  const kategori: Kategori = diminta && tabTampil.includes(diminta) ? diminta : tabTampil[0] ?? 'menu'
  const setKategori = (k: Kategori) => setParams(k === tabTampil[0] ? {} : { tab: k }, { replace: true })
  const [cari, setCari] = useState('')

  const bagian = useMemo(() => {
    const k = cari.trim().toLowerCase()
    const semua = k ? (Object.keys(KATEGORI) as KategoriTeks[]).flatMap((x) => KATEGORI[x]) : kategori === 'bawah' || kategori === 'ai' || kategori === 'kategori' ? [] : KATEGORI[kategori]
    if (!k) return semua
    return semua
      .map((b) => ({ ...b, teks: b.teks.filter((t) => t.bawaan.toLowerCase().includes(k) || (t.judul ?? '').toLowerCase().includes(k) || (data?.[t.id] ?? '').toLowerCase().includes(k)) }))
      .filter((b) => b.teks.length > 0)
  }, [cari, kategori, data])
  const jumlahUbah = data ? Object.keys(data).length : 0

  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Kelola Aplikasi" deskripsi="Ubah tulisan yang tampil di aplikasi. Hanya tampilan yang berubah; data dan cara kerja tetap sama.">
        {bisaTeks && <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari teks di semua bagian…" className="w-full sm:w-72" aria-label="Cari teks" />}
      </BarHalaman>
      <Tabs value={kategori} onValueChange={(v) => setKategori(v as Kategori)}>
        <TabsList className="section-tabs">
          {tabTampil.map((k) => (
            <TabsTrigger key={k} value={k}>{NAMA_KATEGORI[k]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {!cari && <p className="text-sm text-muted-foreground">{KETERANGAN_KATEGORI[kategori]}</p>}
      {kategori === 'kategori' && !cari && (
        <Suspense fallback={<Spinner label="Memuat kategori…" />}>
          <KategoriTransaksiPage tertanam />
        </Suspense>
      )}
      {isLoading && <Spinner label="Memuat pengaturan…" />}
      {error && <QueryError error={error} retry={refetch} />}
      {data && kategori === 'bawah' && !cari && <KelolaMenuBawah data={data} bisaUbah={bisaUbah} />}
      {data && kategori === 'ai' && !cari && <PengaturanAsistenAI data={data} bisaUbah={bisaUbah} />}
      {data && ((kategori !== 'bawah' && kategori !== 'ai' && kategori !== 'kategori') || !!cari) && (
        <Card>
          <CardContent className="space-y-4 pt-4">
            {!bisaUbah && <p className="teks-kecil text-muted-foreground">Anda hanya bisa melihat halaman ini.</p>}
            {kategori === 'aplikasi' && !cari && <PratinjauLogo data={data} />}
            <ul className="space-y-3 md:hidden" aria-label="Teks aplikasi">
              {bagian.map((b) => (
                <li key={`${b.judul}-${b.teks[0]?.id}`} className="space-y-2">
                  <h2 className="text-sm font-semibold">{b.judul}</h2>
                  <ul className="space-y-3">
                    {b.teks.map((t) => <Kartu key={t.id} t={t} sekarang={data[t.id]} bisaUbah={bisaUbah} />)}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <TableShell label="Teks aplikasi" minWidth={720}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teks bawaan</TableHead>
                      <TableHead>Teks yang ditampilkan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bagian.flatMap((b) => [
                      <TableRow key={`h-${b.judul}-${b.teks[0]?.id}`} className="financial-row-group">
                        <TableHead colSpan={3} scope="rowgroup">{b.judul}{b.keterangan && <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">{b.keterangan}</span>}</TableHead>
                      </TableRow>,
                      ...b.teks.map((t) => <Baris key={t.id} t={t} sekarang={data[t.id]} bisaUbah={bisaUbah} />),
                    ])}
                    {bagian.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">Tidak ada teks yang cocok.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableShell>
            </div>
            {bagian.length === 0 && <p className="text-center text-sm text-muted-foreground md:hidden">Tidak ada teks yang cocok.</p>}
            <p className="teks-kecil text-muted-foreground">{jumlahUbah > 0 ? `${jumlahUbah} teks sudah diubah. ` : ''}Teks yang sama dengan bawaan tidak disimpan. Kolom kosong mengembalikan teks sebelumnya.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
