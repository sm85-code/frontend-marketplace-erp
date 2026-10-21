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
type Sasaran = { kategori: string; label: string; item?: TransaksiOperasional }

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
  const [isi, setIsi] = useState<Isi>(() => (item ? { tanggal: item.tanggal, uraian: item.uraian, jumlah: jumlahTampil(item.jumlah) } : { tanggal: tanggalBaru, uraian: '', jumlah: '' }))
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
        <Label htmlFor="op-uraian">Uraian</Label>
        <Input id="op-uraian" maxLength={255} value={isi.uraian} placeholder="Ketik uraian…" onChange={(e) => setIsi((x) => ({ ...x, uraian: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="op-jumlah">Jumlah (Rp)</Label>
        <MoneyInput id="op-jumlah" autoFocus={!item} value={isi.jumlah} placeholder="0" onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value }))} />
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        {item ? (
          <Button type="button" variant="outline" onClick={onHapus} disabled={sibuk}>
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

/** Operasional Umum and Operasional Packing: dated entries kept by weekly period (the same periods as Arus Kas), grouped by category; each is added and changed in a pop-up. */
export default function HalamanOperasional({ jenis, judul, deskripsi }: { jenis: JenisOperasional; judul: string; deskripsi: string }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [periode, setPeriode] = useState(bulanIni)
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
  const berisi = (data?.kategori ?? []).filter((k) => itemsPeriode.some((i) => i.kategori === k.id)).map((k) => k.id)
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
            <CardTitle>{judul}</CardTitle>
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
                  {data.kategori.map((k, n) => {
                    const baris = itemsPeriode.filter((i) => i.kategori === k.id)
                    const tertutup = lipat.has(k.id)
                    return (
                      <Fragment key={k.id}>
                        <TableRow
                          className={bisaTulis ? 'cursor-pointer hover:bg-muted/60 active:bg-muted/60' : undefined}
                          tabIndex={bisaTulis ? 0 : undefined}
                          aria-label={bisaTulis ? `Tambah transaksi ${k.label}` : undefined}
                          onClick={bisaTulis ? () => setSasaran({ kategori: k.id, label: k.label }) : undefined}
                          onKeyDown={bisaTulis ? (e) => e.key === 'Enter' && setSasaran({ kategori: k.id, label: k.label }) : undefined}
                        >
                          <TableCell className="w-16 px-1 text-center tabular-nums text-muted-foreground">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              {baris.length > 0 ? <TombolLipat tertutup={tertutup} nama={k.label} onClick={() => ubahLipat(k.id)} /> : <span className="inline-block w-7" aria-hidden="true" />}
                              {n + 1}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-normal">{k.label}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{fmtRp(jumlahDari(baris))}</TableCell>
                        </TableRow>
                        {!tertutup &&
                          baris.map((item, m) => (
                            <TableRow
                              key={item.id}
                              className={bisaTulis ? 'cursor-pointer hover:bg-muted/60 active:bg-muted/60' : undefined}
                              tabIndex={bisaTulis ? 0 : undefined}
                              aria-label={bisaTulis ? `Ubah transaksi ${k.label} ${n + 1}.${m + 1}` : undefined}
                              onClick={bisaTulis ? () => setSasaran({ kategori: k.id, label: k.label, item }) : undefined}
                              onKeyDown={bisaTulis ? (e) => e.key === 'Enter' && setSasaran({ kategori: k.id, label: k.label, item }) : undefined}
                            >
                              <TableCell />
                              <TableCell className={`whitespace-normal break-words ${GAYA_ANAK}`}>
                                <NomorRincian teks={`${n + 1}.${m + 1}`} />
                                {item.uraian || '—'}
                              </TableCell>
                              <TableCell className={`whitespace-nowrap text-right tabular-nums ${GAYA_ANAK}`}>{fmtRp(item.jumlah)}</TableCell>
                            </TableRow>
                          ))}
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
            {bisaTulis && <p className="teks-kecil text-muted-foreground">Ketuk kategori untuk menambah transaksi, atau ketuk rinciannya untuk mengubah atau menghapus.</p>}
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
