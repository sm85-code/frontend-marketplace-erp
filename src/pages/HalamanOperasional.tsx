import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import TableShell from '@/components/TableShell'
import { BarHalaman } from '@/components/daftar'
import { useConfirm } from '@/components/ConfirmProvider'
import MoneyInput from '@/components/MoneyInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { alasanBelumBisa, barisBaruTerisi, jumlahTampil, sama, tanggalBawaan, type Isi } from '@/lib/operasionalBaris'

const wib = (opsi: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', ...opsi }).format(new Date())
const hariIni = () => wib({ year: 'numeric', month: '2-digit', day: '2-digit' })
const bulanIni = () => hariIni().slice(0, 7)

type Simpan = (isi: Isi) => Promise<void>

const tglTampil = (t: string) => t.split('-').reverse().join('/')
const aksenKategori = 'border-l-4 border-l-primary/60'

/** What is typed into one saved entry, and what leaving the row does: save a change, or put back what is saved when it cannot be. */
function useBaris(item: TransaksiOperasional, simpan: Simpan) {
  const dari = (): Isi => ({ tanggal: item.tanggal, uraian: item.uraian, jumlah: jumlahTampil(item.jumlah) })
  const [isi, setIsi] = useState<Isi>(dari)
  useEffect(() => setIsi(dari()), [item.tanggal, item.uraian, item.jumlah]) // eslint-disable-line react-hooks/exhaustive-deps

  async function keluarBaris() {
    if (sama(isi, dari())) return
    const alasan = alasanBelumBisa(isi)
    if (alasan) {
      toast.error(alasan)
      setIsi(dari())
      return
    }
    try {
      await simpan(isi)
    } catch {
      setIsi(dari()) // the page shows why; the row goes back to what is saved
    }
  }
  return { isi, setIsi, keluarBaris }
}

const saatKeluar = (keluar: () => void) => (e: React.FocusEvent<HTMLElement>) => {
  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) keluar()
}

type PropsBaris = { item: TransaksiOperasional; label: string; nomor: number; bisaTulis: boolean; simpan: Simpan; hapus: () => void }

/** One saved entry. Its fields are typed into directly; leaving the row saves what changed. */
function BarisTransaksi({ item, label, nomor, bisaTulis, simpan, hapus }: PropsBaris) {
  const { isi, setIsi, keluarBaris } = useBaris(item, simpan)
  const nama = (kolom: string) => `${kolom} ${label} baris ${nomor}`
  const tanggal = <Input type="date" className="px-2 text-sm" aria-label={nama('Tanggal')} value={isi.tanggal} onChange={(e) => setIsi((x) => ({ ...x, tanggal: e.target.value }))} />
  const uraian = <Input aria-label={nama('Uraian')} value={isi.uraian} maxLength={255} onChange={(e) => setIsi((x) => ({ ...x, uraian: e.target.value }))} />
  const jumlah = <MoneyInput aria-label={nama('Jumlah')} className="text-right" value={isi.jumlah} onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  const tombolHapus = (
    <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={nama('Hapus')} onClick={hapus}>
      <Trash2 className="size-4" aria-hidden />
    </Button>
  )
  if (!bisaTulis) {
    return (
      <TableRow>
        <TableCell className="w-12 text-center tabular-nums text-muted-foreground">{nomor}</TableCell>
        <TableCell className="whitespace-nowrap">{tglTampil(item.tanggal)}</TableCell>
        <TableCell>{item.uraian || '—'}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtRp(item.jumlah)}</TableCell>
        <TableCell />
      </TableRow>
    )
  }
  return (
    <TableRow onBlur={saatKeluar(() => void keluarBaris())}>
      <TableCell className="w-12 text-center tabular-nums text-muted-foreground">{nomor}</TableCell>
      <TableCell className="w-40">{tanggal}</TableCell>
      <TableCell>{uraian}</TableCell>
      <TableCell className="w-48">{jumlah}</TableCell>
      <TableCell className="w-14 text-right">{tombolHapus}</TableCell>
    </TableRow>
  )
}

/** The empty row at the end of a category: fill the amount (and a description) and move on, the row is saved and a new one opens. */
function BarisBaru({ label, tanggalAwal, simpan }: { label: string; tanggalAwal: string; simpan: Simpan }) {
  const kosong = (tanggal: string): Isi => ({ tanggal, uraian: '', jumlah: '' })
  const [isi, setIsi] = useState<Isi>(() => kosong(tanggalAwal))
  const menyimpan = useRef(false)
  // Another month was picked: start from that month's date again.
  useEffect(() => setIsi(kosong(tanggalAwal)), [tanggalAwal])

  async function keluarBaris() {
    if (menyimpan.current || !barisBaruTerisi(isi)) return
    const alasan = alasanBelumBisa(isi)
    if (alasan) {
      if (isi.jumlah.trim() === '') return // still being filled in: wait for the amount
      toast.error(alasan)
      return
    }
    menyimpan.current = true
    try {
      await simpan(isi)
      setIsi(kosong(isi.tanggal)) // keep the date: several entries of one day are typed one after the other
    } catch {
      /* the error is shown by the page; the typed values stay so nothing is lost */
    } finally {
      menyimpan.current = false
    }
  }
  const nama = (kolom: string) => `${kolom} ${label} baris baru`
  const tanggal = <Input type="date" className="px-2 text-sm" aria-label={nama('Tanggal')} value={isi.tanggal} onChange={(e) => setIsi((x) => ({ ...x, tanggal: e.target.value }))} />
  const uraian = <Input aria-label={nama('Uraian')} placeholder="Ketik uraian…" value={isi.uraian} maxLength={255} onChange={(e) => setIsi((x) => ({ ...x, uraian: e.target.value }))} />
  const jumlah = <MoneyInput aria-label={nama('Jumlah')} className="text-right" placeholder="Jumlah" value={isi.jumlah} onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  return (
    <TableRow className="bg-muted/20 hover:bg-muted/30" onBlur={saatKeluar(() => void keluarBaris())}>
      <TableCell className="w-12 text-center text-muted-foreground"><Plus className="mx-auto size-4" aria-hidden /></TableCell>
      <TableCell className="w-40">{tanggal}</TableCell>
      <TableCell>{uraian}</TableCell>
      <TableCell className="w-48">{jumlah}</TableCell>
      <TableCell className="w-14" />
    </TableRow>
  )
}

/** Operasional Umum and Operasional Packing: dated entries typed straight into the table, grouped by category. */
export default function HalamanOperasional({ jenis, judul, deskripsi }: { jenis: JenisOperasional; judul: string; deskripsi: string }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [periode, setPeriode] = useState(bulanIni)
  const kunci = ['operasional', jenis, periode] as const
  const { data, isLoading, error, refetch } = useQuery({ queryKey: kunci, queryFn: () => daftarOperasional(jenis, periode) })
  const [tersimpan, setTersimpan] = useState(false)

  const sesudah = () => {
    setTersimpan(true)
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

  const sibuk = tambah.isPending || ubah.isPending || hapus.isPending
  const bisaTulis = !!data?.bisa_tulis
  const tanggalAwal = tanggalBawaan(periode, hariIni())
  const sisipan = (k: { id: string; label: string }) => (
    <BarisBaru label={k.label} tanggalAwal={tanggalAwal} simpan={(isi) => tambah.mutateAsync({ kategori: k.id, isi }).then(() => undefined)} />
  )
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
        <>
          <Card>
            <CardContent className="space-y-4 pt-4">
              {bisaTulis && <p className="teks-kecil text-muted-foreground">Ketik langsung di baris. Isi tanggal, uraian, dan jumlah; pindah ke kolom lain atau tekan Enter dan baris tersimpan otomatis. Baris putus-putus di bawah tiap kelompok untuk transaksi baru.</p>}
              <div>
                <TableShell label={`Transaksi ${judul}`} minWidth={600}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Uraian</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">
                          <span className="sr-only">Aksi</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.kategori.map((k) => {
                        const baris = data.items.filter((i) => i.kategori === k.id)
                        return (
                          <Fragment key={k.id}>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableCell colSpan={3} className={`font-semibold ${aksenKategori}`}>
                                <span className="inline-flex items-center gap-2">
                                  {k.label}
                                  <Badge variant="secondary">{baris.length} transaksi</Badge>
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">{fmtRp(data.ringkasan.per_kategori[k.id] ?? '0')}</TableCell>
                              <TableCell />
                            </TableRow>
                            {baris.map((item, n) => (
                              <BarisTransaksi key={item.id} item={item} label={k.label} nomor={n + 1} bisaTulis={bisaTulis} simpan={(isi) => ubah.mutateAsync({ id: item.id, kategori: k.id, isi }).then(() => undefined)} hapus={() => void onHapus(item, k.label)} />
                            ))}
                            {bisaTulis && sisipan(k)}
                            {!bisaTulis && baris.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-muted-foreground">
                                  Belum ada transaksi.
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
                      <TableRow className="bg-[var(--table-heading-background)] font-bold hover:bg-[var(--table-heading-background)]">
                        <TableCell colSpan={3}>Jumlah {judul}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtRp(data.ringkasan.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableShell>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
