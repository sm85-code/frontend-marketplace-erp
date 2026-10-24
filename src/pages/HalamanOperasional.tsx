import { barisTujuan, TIDAK_DISAMBUNG } from '@/lib/barisTujuan'
import { barisKasKeluar, barisOtomatis, cocokOtomatis } from '@/lib/barisArusKasPilihan'
import { lembarArusKas, overviewArusKas } from '@/api/financialReports'
import { computeSheet } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { sheetSections } from '@/lib/sheetSections'
import { useKategori } from '@/api/kategori'
import { useLabel } from '@/api/pengaturanUi'
import { idMenu } from '@/config/nav'
import InfoTip from '@/components/InfoTip'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { fmtRp, getApiError } from '@/api/client'
import {
  daftarOperasional,
  hapusOperasional,
  tambahOperasional,
  ubahOperasional,
  simpanPihak,
  type PihakOperasional,
  type JenisOperasional,
  type TransaksiOperasional,
} from '@/api/operasional'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { BarHalaman } from '@/components/daftar'
import { useConfirm } from '@/components/ConfirmProvider'
import MoneyInput from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PeriodPicker from '@/components/PeriodPicker'
import TombolLipat from '@/components/TombolLipat'
import { GAYA_ANAK, NomorRincian } from '@/pages/FinancialSheetTable'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mingguBulan, periodeBerjalan } from '@/lib/tanggal'
import { alasanBelumBisa, jumlahTampil, sama, tanggalBawaan, type Isi } from '@/lib/operasionalBaris'

const wib = (opsi: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', ...opsi }).format(new Date())
const hariIni = () => wib({ year: 'numeric', month: '2-digit', day: '2-digit' })
const bulanIni = () => hariIni().slice(0, 7)


/** What the pop-up edits: a saved entry (`id`) or a new one for a category. */
type Sasaran = { kategori: string; label: string; item?: TransaksiOperasional; /** Belanja Supplier/Tukang: the party, kept as uraian. */ pihak?: string }

/** Pop-up for one entry, like the figures of Arus Kas in Laporan Keuangan: date, description and amount, save or delete. */
function DialogTransaksi({ sasaran, tanggalBaru, sibuk, onClose, onSimpan, onHapus }: { sasaran: Sasaran | null; tanggalBaru: string; sibuk: boolean; onClose: () => void; onSimpan: (isi: Isi) => void; onHapus: () => void }) {
  return (
    <Dialog open={!!sasaran} onOpenChange={(buka) => !buka && onClose()}>
      <DialogContent className="max-w-sm">
        {sasaran && <FormTransaksi key={sasaran.item?.id ?? `baru-${sasaran.kategori}`} sasaran={sasaran} tanggalBaru={tanggalBaru} sibuk={sibuk} onSimpan={onSimpan} onHapus={onHapus} />}
      </DialogContent>
    </Dialog>
  )
}

function FormTransaksi({ sasaran, tanggalBaru, sibuk, onSimpan, onHapus }: { sasaran: Sasaran; tanggalBaru: string; sibuk: boolean; onSimpan: (isi: Isi) => void; onHapus: () => void }) {
  const { item } = sasaran
  const [isi, setIsi] = useState<Isi>(() => (item ? { tanggal: item.tanggal, uraian: item.uraian, jumlah: jumlahTampil(item.jumlah) } : { tanggal: tanggalBaru, uraian: sasaran.pihak ?? '', jumlah: '' }))
  const alasan = alasanBelumBisa(isi)
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (alasan) return toast.error(alasan)
        onSimpan(isi)
      }}
    >
      <DialogHeader>
        <DialogTitle>{item ? 'Ubah transaksi' : 'Tambah transaksi'}</DialogTitle>
        <DialogDescription>{sasaran.label}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="op-tanggal">Tanggal</Label>
        <Input id="op-tanggal" type="date" value={isi.tanggal} onChange={(e) => setIsi((x) => ({ ...x, tanggal: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="op-uraian">{sasaran.pihak !== undefined ? 'Nama' : 'Uraian'}</Label>
        <Input id="op-uraian" maxLength={255} value={isi.uraian} readOnly={sasaran.pihak !== undefined} placeholder="Ketik uraian…" onChange={(e) => setIsi((x) => ({ ...x, uraian: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="op-jumlah">Jumlah (Rp)</Label>
        <MoneyInput id="op-jumlah" autoFocus={!item} value={isi.jumlah} placeholder="0" onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value }))} />
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        {item ? (
          <Button type="button" variant="destructive" onClick={onHapus} disabled={sibuk}>
            Hapus
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={sibuk || !!alasan || (!!item && sama(isi, { tanggal: item.tanggal, uraian: item.uraian, jumlah: jumlahTampil(item.jumlah) }))}>
          Simpan
        </Button>
      </DialogFooter>
    </form>
  )
}

const PIHAK_JENIS = new Set<JenisOperasional>(['supplier', 'tukang'])

/** The Kas keluar rows of Arus Kas (report rows and rows added by hand) a supplier / tukang can be linked to. */
function usePilihanArusKas(jenis: JenisOperasional, periode: string) {
  const lembar = useQuery({ queryKey: ['financial-arus-kas-lembar', periode], queryFn: () => lembarArusKas(periode), retry: false, enabled: PIHAK_JENIS.has(jenis) })
  // The report's own Kas keluar rows (Tukang Kayu [JOKO] and the like) come from the Arus Kas report itself.
  const laporan = useQuery({ queryKey: ['arus-kas-laporan-peta', periode], queryFn: () => overviewArusKas(periode), retry: false, enabled: PIHAK_JENIS.has(jenis) })
  const daftarKat = useKategori()
  const pilihan = useMemo(() => {
    if (!lembar.data) return []
    const l = lembar.data.lembar
    let arus
    if (laporan.data) {
      const { records, days } = sheetDays(laporan.data, periode)
      arus = computeSheet(sheetSections(laporan.data), records, days, l).find((b) => b.tabel === 'arus_kas')
    }
    return barisKasKeluar(l, daftarKat, new Set(daftarKat.filter((k) => k.operasional === jenis).map((k) => k.id)), arus)
  }, [lembar.data, laporan.data, daftarKat, jenis, periode],
  )
  return { lembar, pilihan }
}

/** Which Arus Kas rows each supplier / tukang fills, picked from the Kas keluar rows of Arus Kas. None = automatic (same
 * name or name in brackets, "Tagihan Produk [YUNI]"); several = one row each on this page; "-" = not linked. Saved as the
 * rows' names separated by ";" (the format links typed earlier already use). */
function PetaArusKas({ jenis, periode, pihak, bisaTulis, onSaved }: { jenis: JenisOperasional; periode: string; pihak: PihakOperasional[]; bisaTulis: boolean; onSaved: () => void }) {
  const simpan = useMutation({ mutationFn: (v: { id: string; baris: string }) => simpanPihak(jenis, v.id, v.baris), onSuccess: () => { toast.success('Tersimpan'); onSaved() }, onError: (e) => toast.error(getApiError(e)) })
  const { lembar, pilihan } = usePilihanArusKas(jenis, periode)
  const ubah = (p: PihakOperasional, daftar: string[]) => simpan.mutate({ id: p.id, baris: daftar.join('; ') })
  return (
    <details className="rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Hubungan ke baris Arus Kas</summary>
      <p className="mt-2 text-muted-foreground">Pilih baris Kas keluar di Arus Kas untuk tiap nama. Belum dipilih = otomatis (nama sama, atau nama di dalam kurung seperti "Tagihan Produk [YUNI]"). Pilih lebih dari satu untuk memecahnya: tiap baris jadi baris sendiri di halaman ini.</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {pihak.map((p) => {
          const dipilih = barisTujuan(p.baris_arus_kas)
          const putus = dipilih.length === 1 && dipilih[0] === TIDAK_DISAMBUNG
          const otomatis = pilihan.filter((b) => cocokOtomatis(b.nama, p.nama))
          const kat = (nama: string) => pilihan.find((b) => b.nama.trim().toLocaleLowerCase('id-ID') === nama.toLocaleLowerCase('id-ID'))
          const listId = `peta-${jenis}-${p.id}`
          const mati = !bisaTulis || simpan.isPending
          return (
            <div key={p.id} className="grid gap-1 rounded-md border p-2">
              <span className="font-medium">{p.nama}</span>
              {putus ? (
                <span className="text-xs text-muted-foreground">Tidak disambung ke Arus Kas</span>
              ) : dipilih.length ? (
                <ul className="flex flex-wrap gap-1">
                  {dipilih.map((n) => (
                    <li key={n} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                      {n}{kat(n) ? <span className="text-muted-foreground">· {kat(n)!.kategoriLabel}</span> : lembar.data ? <span className="text-destructive">· tidak ada di Arus Kas</span> : null}
                      {bisaTulis && <button type="button" disabled={mati} aria-label={`Lepas ${n}`} className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => ubah(p, dipilih.filter((x) => x !== n))}>×</button>}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-muted-foreground">Otomatis: {otomatis.length ? otomatis.map((b) => `${b.nama} (${b.kategoriLabel})`).join(', ') : lembar.data ? 'belum ada baris yang cocok' : 'nama sama / nama dalam kurung'}</span>
              )}
              {bisaTulis && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input list={listId} disabled={mati} placeholder={pilihan.length ? 'Cari & tambah baris Arus Kas…' : 'Ketik nama baris Arus Kas…'} aria-label={`Tambah baris Arus Kas untuk ${p.nama}`} className="h-8 min-w-48 flex-1"
                    onChange={(e) => {
                      const b = pilihan.find((x) => x.nama === e.target.value)
                      if (!b) return
                      e.target.value = ''
                      if (!dipilih.includes(b.nama)) ubah(p, [...(putus ? [] : dipilih), b.nama])
                    }}
                    onKeyDown={(e) => {
                      const v = e.currentTarget.value.trim()
                      if (e.key !== 'Enter' || !v || pilihan.length) return
                      e.currentTarget.value = ''
                      if (!dipilih.includes(v)) ubah(p, [...(putus ? [] : dipilih), v])
                    }} />
                  <datalist id={listId}>{pilihan.map((b) => <option key={b.id} value={b.nama}>{b.kategoriLabel}</option>)}</datalist>
                  {(dipilih.length > 0) && <Button type="button" size="sm" variant="ghost" disabled={mati} onClick={() => ubah(p, [])}>Otomatis</Button>}
                  {!putus && <Button type="button" size="sm" variant="ghost" disabled={mati} onClick={() => ubah(p, [TIDAK_DISAMBUNG])}>Tidak disambung</Button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}

const PATH_OPERASIONAL: Record<JenisOperasional, string> = { umum: '/operasional-umum', packing: '/operasional-packing', supplier: '/belanja-supplier', tukang: '/belanja-tukang' }

/** Operasional Umum and Operasional Eceran: dated entries kept by weekly period (the same periods as Arus Kas), grouped by category; each is added and changed in a pop-up. */
export default function HalamanOperasional({ jenis, judul: judulBawaan, deskripsi }: { jenis: JenisOperasional; judul: string; deskripsi: string }) {
  // The menu name set on Kelola Aplikasi names the page everywhere on it (title, table, total row).
  const judul = useLabel()(idMenu(PATH_OPERASIONAL[jenis]), judulBawaan)
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [periode, setPeriode] = useState(bulanIni)
  const { lembar: lembarArus, pilihan } = usePilihanArusKas(jenis, periode)
  const kunci = ['operasional', jenis, periode] as const
  const { data, isLoading, error, refetch } = useQuery({ queryKey: kunci, queryFn: () => daftarOperasional(jenis, periode) })
  const [tersimpan, setTersimpan] = useState(false)
  const [sasaran, setSasaran] = useState<Sasaran | null>(null)
  // Entries are kept by reporting period (Monday-Sunday), the same periods as the columns of Arus Kas.
  const minggu = useMemo(() => mingguBulan(periode), [periode])
  const [dipilih, setDipilih] = useState<{ periode: string; indeks: number } | null>(null)
  const indeks = dipilih?.periode === periode ? dipilih.indeks : periodeBerjalan(periode, minggu.length)
  const ini = minggu[indeks]
  // Categories whose transactions are folded away (tree view).
  const [lipat, setLipat] = useState<ReadonlySet<string>>(new Set())
  const ubahLipat = (id: string) =>
    setLipat((sekarang) => {
      const next = new Set(sekarang)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const sesudah = () => {
    setTersimpan(true)
    setSasaran(null)
    void qc.invalidateQueries({ queryKey: ['operasional-arus-kas'] })
    return qc.invalidateQueries({ queryKey: ['operasional', jenis] })
  }
  useEffect(() => {
    if (!tersimpan) return
    const t = setTimeout(() => setTersimpan(false), 3000)
    return () => clearTimeout(t)
  }, [tersimpan])

  const tambah = useMutation({ mutationFn: (v: { kategori: string; isi: Isi }) => tambahOperasional(jenis, { kategori: v.kategori, ...v.isi }), onSuccess: sesudah, onError: (e) => toast.error(getApiError(e)) })
  const ubah = useMutation({ mutationFn: (v: { id: string; kategori: string; isi: Isi }) => ubahOperasional(jenis, v.id, { kategori: v.kategori, ...v.isi }), onSuccess: sesudah, onError: (e) => toast.error(getApiError(e)) })
  const hapus = useMutation({ mutationFn: (id: string) => hapusOperasional(jenis, id), onSuccess: sesudah, onError: (e) => toast.error(getApiError(e)) })

  async function onHapus(item: TransaksiOperasional, label: string) {
    const ok = await confirm({ title: 'Hapus transaksi ini?', description: `${label} · ${fmtRp(item.jumlah)}${item.uraian ? ` · ${item.uraian}` : ''}. Tindakan ini tidak bisa dibatalkan.`, confirmLabel: 'Hapus', destructive: true })
    if (ok) hapus.mutate(item.id)
  }
  function onSimpan(isi: Isi) {
    if (!sasaran) return
    if (sasaran.item) ubah.mutate({ id: sasaran.item.id, kategori: sasaran.kategori, isi })
    else tambah.mutate({ kategori: sasaran.kategori, isi })
  }

  const sibuk = tambah.isPending || ubah.isPending || hapus.isPending
  const bisaTulis = !!data?.bisa_tulis
  const dalam = (tanggal: string, m: { mulai: string; akhir: string }) => tanggal >= m.mulai && tanggal <= m.akhir
  const jumlahDari = (items: TransaksiOperasional[]) => items.reduce((a, i) => a + Number(i.jumlah), 0)
  const itemsPeriode = (data?.items ?? []).filter((i) => dalam(i.tanggal, ini))
  // Belanja Supplier / Tukang: one row per party of the Supplier / Tukang Kayu list; otherwise one row per category.
  const kunciP = (n: string) => n.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id-ID')
  const kategoriUtama = (data?.kategori ?? []).find((k) => k.aktif !== false) ?? data?.kategori[0]
  type Grup = { id: string; label: string; items: TransaksiOperasional[]; tambah: Sasaran | null; kategoriLabel: (i: TransaksiOperasional) => string }
  const grup: Grup[] = (() => {
    const labelKat = (id: string) => data?.kategori.find((k) => k.id === id)?.label ?? id
    if (!data?.pihak) return (data?.kategori ?? []).map((k) => ({ id: k.id, label: k.label, items: itemsPeriode.filter((i) => i.kategori === k.id), tambah: { kategori: k.id, label: k.label }, kategoriLabel: () => k.label }))
    // A party linked to several Arus Kas rows ("Tagihan Produk [RIZKI]; Packing [RIZKI]") gets one row per linked row;
    // its entries keep that Arus Kas row's name as uraian, so each sums into its own row. Old entries (party name) go to the first.
    const nama = new Set<string>()
    const hasil: Grup[] = []
    for (const x of data.pihak) {
      nama.add(kunciP(x.nama))
      const tujuan = barisTujuan(x.baris_arus_kas).filter((b) => b !== TIDAK_DISAMBUNG)
      if (tujuan.length < 2) {
        // The row it fills is shown with the name, as for a split party: "PUDIN – Tagihan Produk [PUDIN]".
        const ke = barisTujuan(x.baris_arus_kas)[0] === TIDAK_DISAMBUNG ? 'tidak disambung' : tujuan[0] ?? barisOtomatis(pilihan, x.nama)?.nama
        const punya = itemsPeriode.filter((i) => kunciP(i.uraian) === kunciP(x.nama))
        // Only people linked to an Arus Kas row get a row (link them in the panel below); one not linked keeps its row
        // while it has entries this period, so nothing typed goes missing from the list or the total.
        if ((!ke || ke === 'tidak disambung') && lembarArus.data && !punya.length) continue
        hasil.push({ id: `p:${x.id}`, label: ke ? `${x.nama} – ${ke}` : lembarArus.data ? `${x.nama} (belum tersambung)` : x.nama, items: itemsPeriode.filter((i) => kunciP(i.uraian) === kunciP(x.nama)), tambah: kategoriUtama ? { kategori: kategoriUtama.id, label: x.nama, pihak: x.nama } : null, kategoriLabel: (i: TransaksiOperasional) => labelKat(i.kategori) })
        continue
      }
      tujuan.forEach((b, k) => {
        nama.add(kunciP(b))
        const label = `${x.nama} – ${b}`
        hasil.push({ id: `p:${x.id}:${k}`, label, items: itemsPeriode.filter((i) => kunciP(i.uraian) === kunciP(b) || (k === 0 && kunciP(i.uraian) === kunciP(x.nama))), tambah: kategoriUtama ? { kategori: kategoriUtama.id, label, pihak: b } : null, kategoriLabel: (i: TransaksiOperasional) => labelKat(i.kategori) })
      })
    }
    const lain = itemsPeriode.filter((i) => !nama.has(kunciP(i.uraian)))
    if (lain.length) hasil.push({ id: 'p:lain', label: 'Lainnya (nama tidak ada di daftar)', items: lain, tambah: null, kategoriLabel: (i) => labelKat(i.kategori) })
    return hasil
  })()
  const berisi = grup.filter((g) => g.items.length > 0).map((g) => g.id)
  const adaRincian = berisi.length > 0
  const semuaTertutup = adaRincian && berisi.every((id) => lipat.has(id))
  const lipatSemua = () => setLipat(semuaTertutup ? new Set() : new Set(berisi))
  const hariBawaan = tanggalBawaan(periode, hariIni())
  const tanggalBaru = dalam(hariBawaan, ini) ? hariBawaan : ini.mulai
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul={judul} deskripsi={deskripsi}>
        <span role="status" className="teks-kecil text-muted-foreground">{sibuk ? 'Menyimpan…' : tersimpan ? '✓ Tersimpan' : ''}</span>
        <Label htmlFor="operasional-bulan">Bulan</Label>
        <Input id="operasional-bulan" type="month" className="w-44" value={periode} onChange={(e) => e.target.value && setPeriode(e.target.value)} />
      </BarHalaman>
      {isLoading && <Spinner label="Memuat transaksi…" />}
      {error && <QueryError error={error} retry={refetch} />}
      {data && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Transaksi</CardTitle>
            {adaRincian && (
              <Button type="button" variant="outline" size="sm" onClick={lipatSemua}>
                {semuaTertutup ? <ChevronsUpDown className="size-4" aria-hidden="true" /> : <ChevronsDownUp className="size-4" aria-hidden="true" />}
                {semuaTertutup ? 'Buka semua rincian' : 'Lipat semua rincian'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-w-0 space-y-3">
            <PeriodPicker semuaLayar pick={indeks} onPick={(i) => setDipilih({ periode, indeks: i })} options={minggu.map((m) => ({ key: m.mulai, label: 'Periode', sub: m.label }))} />
            <div className="overflow-hidden rounded-lg border">
              <Table aria-label={`Transaksi ${judul}`}>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-16 px-1 text-center">No</TableHead>
                    <TableHead>Uraian</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grup.map((g, n) => {
                    const baris = g.items
                    const tertutup = lipat.has(g.id)
                    const t = bisaTulis && g.tambah
                    return (
                      <Fragment key={g.id}>
                        <TableRow
                          className={t ? 'cursor-pointer hover:bg-muted/60 active:bg-muted/60' : undefined}
                          tabIndex={t ? 0 : undefined}
                          aria-label={t ? `Tambah transaksi ${g.label}` : undefined}
                          onClick={t ? () => setSasaran(g.tambah) : undefined}
                          onKeyDown={t ? (e) => e.key === 'Enter' && setSasaran(g.tambah) : undefined}
                        >
                          <TableCell className="w-16 px-1 text-center tabular-nums text-muted-foreground">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              {baris.length > 0 ? <TombolLipat tertutup={tertutup} nama={g.label} onClick={() => ubahLipat(g.id)} /> : <span className="inline-block w-7" aria-hidden="true" />}
                              {n + 1}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-normal">{g.label}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{fmtRp(jumlahDari(baris))}</TableCell>
                        </TableRow>
                        {!tertutup &&
                          baris.map((item, m) => {
                            const sas: Sasaran = { kategori: item.kategori, label: g.tambah ? g.label : g.kategoriLabel(item), item, ...(data.pihak && g.tambah?.pihak !== undefined ? { pihak: g.tambah.pihak } : {}) }
                            return (
                            <TableRow
                              key={item.id}
                              className={bisaTulis ? 'cursor-pointer hover:bg-muted/60 active:bg-muted/60' : undefined}
                              tabIndex={bisaTulis ? 0 : undefined}
                              aria-label={bisaTulis ? `Ubah transaksi ${g.label} ${n + 1}.${m + 1}` : undefined}
                              onClick={bisaTulis ? () => setSasaran(sas) : undefined}
                              onKeyDown={bisaTulis ? (e) => e.key === 'Enter' && setSasaran(sas) : undefined}
                            >
                              <TableCell />
                              <TableCell className={`whitespace-normal break-words ${GAYA_ANAK}`}>
                                <NomorRincian teks={`${n + 1}.${m + 1}`} />
                                {data.pihak ? `${item.tanggal.slice(8, 10)}/${item.tanggal.slice(5, 7)}/${item.tanggal.slice(0, 4)}${g.tambah ? '' : ` · ${item.uraian || '—'}`}` : item.uraian || '—'}
                              </TableCell>
                              <TableCell className={`whitespace-nowrap text-right tabular-nums ${GAYA_ANAK}`}>{fmtRp(item.jumlah)}</TableCell>
                            </TableRow>
                            )
                          })}
                      </Fragment>
                    )
                  })}
                  <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                    <TableCell colSpan={2}>Jumlah {judul}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{fmtRp(jumlahDari(itemsPeriode))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {bisaTulis && <InfoTip teks={data.pihak ? "Ketuk nama untuk menambah transaksi, atau ketuk rinciannya untuk mengubah atau menghapus. Daftar nama diambil dari Data Produksi." : "Ketuk kategori untuk menambah transaksi, atau ketuk rinciannya untuk mengubah atau menghapus."} />}
            {data.pihak && <PetaArusKas jenis={jenis} periode={periode} pihak={data.pihak} bisaTulis={bisaTulis} onSaved={() => { void qc.invalidateQueries({ queryKey: ['operasional-arus-kas'] }); void qc.invalidateQueries({ queryKey: ['operasional', jenis] }) }} />}
          </CardContent>
        </Card>
      )}
      <DialogTransaksi
        sasaran={sasaran}
        tanggalBaru={tanggalBaru}
        sibuk={sibuk}
        onClose={() => setSasaran(null)}
        onSimpan={onSimpan}
        onHapus={() => sasaran?.item && void onHapus(sasaran.item, sasaran.label)}
      />
    </div>
  )
}
