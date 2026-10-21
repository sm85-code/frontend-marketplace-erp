import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { usePengaturanUi, useUbahTeks } from '@/api/pengaturanUi'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { BarHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GRUP_NAV, NAV, idGrup, idMenu } from '@/config/nav'
import type { Overview } from '@/api/financialReports'
import { ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/lib/auth'
import { idBaris, idGrupSheet, idJudul, idTab, TAB_LAPORAN } from '@/lib/namaBaris'
import { isGroup } from '@/lib/sheetEngine'
import { sheetSections } from '@/lib/sheetSections'
import { bisa } from '@/lib/akses'

interface Teks {
  id: string
  jenis: string
  bawaan: string
}

/** The fixed rows and titles of the report sheet (rows from shops and categories are named where they come from). */
const LEMBAR = sheetSections({ laporan: [] } as unknown as Overview)
// Pemasukan, Pengeluaran and the groups/rows of Laba/Rugi that come from the categories are named in Kategori Transaksi,
// so only their fixed rows are listed here.
const DARI_KATEGORI = new Set(['produk', 'jasa_proses', 'cat_packing', 'cat', 'tukang', 'pembelian', 'operasional', 'langganan', 'gaji', 'iklan', 'c_keluar'])
const GRUP_KATEGORI = new Set(['Penarikan saldo toko', 'Penjualan dan jasa', 'Harga pokok penjualan', 'Beban operasional'])
const TAMBAHAN: Teks[] = [
  { id: idBaris('laba_kotor'), jenis: 'Laporan Keuangan: baris (laba/rugi)', bawaan: 'Laba kotor' },
  { id: idBaris('adj_stok'), jenis: 'Laporan Keuangan: baris (pengeluaran)', bawaan: 'Penyesuaian persediaan' },
  { id: idBaris('adj_utang'), jenis: 'Laporan Keuangan: baris (pengeluaran)', bawaan: 'Penyesuaian utang usaha' },
]
const teksLembar = (): Teks[] => [
  ...LEMBAR.flatMap((sec) => [
    { id: idJudul(sec.tabel), jenis: 'Laporan Keuangan: judul tabel', bawaan: sec.title.slice(3) },
    ...sec.rows.flatMap((r): Teks[] =>
      isGroup(r)
        ? GRUP_KATEGORI.has(r.label) ? [] : [{ id: idGrupSheet(r.tabel, r.label), jenis: `Laporan Keuangan: judul kelompok (${sec.title.slice(3).toLowerCase()})`, bawaan: r.label }]
        : r.key.startsWith('shop:') || DARI_KATEGORI.has(r.key) ? [] : [{ id: idBaris(r.key), jenis: `Laporan Keuangan: baris (${sec.title.slice(3).toLowerCase()})`, bawaan: r.label }],
    ),
  ]),
  ...TAMBAHAN,
]

/** Every text that can be changed here. The id is what the app goes by; the text is only shown. Add new editable texts to this list. */
const DAFTAR: Teks[] = [
  ...GRUP_NAV.map((g) => ({ id: idGrup(g.id), jenis: 'Kelompok menu', bawaan: g.label })),
  ...NAV.map((n) => ({ id: idMenu(n.to), jenis: 'Menu dan judul halaman', bawaan: n.label })),
  ...Object.entries(ROLE_LABELS).map(([id, nama]) => ({ id: `role:${id}`, jenis: 'Nama role bawaan', bawaan: nama })),
  ...TAB_LAPORAN.map(([tabel, nama]) => ({ id: idTab(tabel), jenis: 'Laporan Keuangan: nama tab', bawaan: nama })),
  ...teksLembar(),
]

function Baris({ t, sekarang, bisaUbah }: { t: Teks; sekarang: string | undefined; bisaUbah: boolean }) {
  const ubah = useUbahTeks()
  const [isi, setIsi] = useState(sekarang ?? t.bawaan)
  const [lama, setLama] = useState(sekarang)
  if (lama !== sekarang) {
    setLama(sekarang)
    setIsi(sekarang ?? t.bawaan)
  }
  const jalankan = (teks: string | null) =>
    ubah.mutate({ id: t.id, teks }, { onError: (e) => { setIsi(sekarang ?? t.bawaan); toast.error(getApiError(e)) } })
  const simpan = () => {
    const teks = isi.trim()
    if (teks === (sekarang ?? t.bawaan)) return setIsi(teks)
    if (teks === '') return setIsi(sekarang ?? t.bawaan)
    jalankan(teks === t.bawaan ? null : teks)
  }
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{t.jenis}</TableCell>
      <TableCell>{t.bawaan}</TableCell>
      <TableCell className="min-w-48">
        <Input value={isi} maxLength={120} disabled={!bisaUbah} aria-label={`Teks untuk ${t.bawaan}`} onChange={(e) => setIsi(e.target.value)} onBlur={simpan} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      </TableCell>
      <TableCell>
        {sekarang !== undefined && bisaUbah && (
          <Button type="button" variant="ghost" size="sm" onClick={() => jalankan(null)}>
            Kembalikan
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

export default function KelolaAplikasi() {
  const { akses } = useAuth()
  const bisaUbah = bisa(akses, 'kelola_aplikasi', 'tulis')
  const { data, isLoading, error, refetch } = usePengaturanUi()
  const [cari, setCari] = useState('')
  const tampil = useMemo(() => {
    const k = cari.trim().toLowerCase()
    return DAFTAR.filter((t) => !k || t.bawaan.toLowerCase().includes(k) || (data?.[t.id] ?? '').toLowerCase().includes(k))
  }, [cari, data])

  return (
    <div className="space-y-4">
      <BarHalaman judul="Kelola Aplikasi" deskripsi="Ubah teks menu, judul halaman, nama role bawaan, serta tab, kelompok, dan baris Laporan Keuangan. Hanya tampilan yang berubah, cara kerja aplikasi tetap sama." />
      <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari teks..." className="max-w-sm" aria-label="Cari teks" />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <QueryError error={error} retry={() => refetch()} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Teks bawaan</TableHead>
                    <TableHead>Teks ditampilkan</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tampil.map((t) => (
                    <Baris key={t.id} t={t} sekarang={data?.[t.id]} bisaUbah={bisaUbah} />
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
