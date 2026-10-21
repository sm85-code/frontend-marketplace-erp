import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useEffect, useRef, useState } from 'react'
import { ListChecks, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react'
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
import KartuMetrik from '@/components/KartuMetrik'
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
type Tata = 'tabel' | 'kartu'

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

type PropsBaris = { item: TransaksiOperasional; label: string; nomor: number; bisaTulis: boolean; simpan: Simpan; hapus: () => void; tata: Tata }

/** One saved entry. Its fields are typed into directly; leaving the row saves what changed. */
function BarisTransaksi({ item, label, nomor, bisaTulis, simpan, hapus, tata }: PropsBaris) {
  const { isi, setIsi, keluarBaris } = useBaris(item, simpan)
  const nama = (kolom: string) => `${kolom} ${label} baris ${nomor}`
  const tanggal = <Input type="date" aria-label={nama('Tanggal')} value={isi.tanggal} onChange={(e) => setIsi((x) => ({ ...x, tanggal: e.target.value }))} />
  const uraian = <Input aria-label={nama('Uraian')} value={isi.uraian} maxLength={255} onChange={(e) => setIsi((x) => ({ ...x, uraian: e.target.value }))} />
  const jumlah = <MoneyInput aria-label={nama('Jumlah')} className="text-right" value={isi.jumlah} onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  const tombolHapus = (
    <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={nama('Hapus')} onClick={hapus}>
      <Trash2 className="size-4" aria-hidden />
    </Button>
  )
  if (tata === 'kartu') {
    return (
      <li className="space-y-2 rounded-lg border bg-card p-3" onBlur={bisaTulis ? saatKeluar(() => void keluarBaris()) : undefined}>
        {bisaTulis ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm tabular-nums text-muted-foreground">{nomor}</span>
              <div className="min-w-0 flex-1">{tanggal}</div>
              {tombolHapus}
            </div>
            {uraian}
            {jumlah}
          </>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.uraian || '—'}</p>
              <p className="teks-kecil text-muted-foreground">{nomor}. {tglTampil(item.tanggal)}</p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">{fmtRp(item.jumlah)}</span>
          </div>
        )}
      </li>
    )
  }
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
      <TableCell className="w-44">{tanggal}</TableCell>
      <TableCell>{uraian}</TableCell>
      <TableCell className="w-48">{jumlah}</TableCell>
      <TableCell className="w-14 text-right">{tombolHapus}</TableCell>
    </TableRow>
  )
}

/** The empty row at the end of a category: fill the amount (and a description) and move on, the row is saved and a new one opens. */
function BarisBaru({ label, tanggalAwal, simpan, tata }: { label: string; tanggalAwal: string; simpan: Simpan; tata: Tata }) {
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
  const tanggal = <Input type="date" aria-label={nama('Tanggal')} value={isi.tanggal} onChange={(e) => setIsi((x) => ({ ...x, tanggal: e.target.value }))} />
  const uraian = <Input aria-label={nama('Uraian')} placeholder="Ketik uraian…" value={isi.uraian} maxLength={255} onChange={(e) => setIsi((x) => ({ ...x, uraian: e.target.value }))} />
  const jumlah = <MoneyInput aria-label={nama('Jumlah')} className="text-right" placeholder="Jumlah" value={isi.jumlah} onChange={(e) => setIsi((x) => ({ ...x, jumlah: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  if (tata === 'kartu') {
    return (
      <li className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-3" onBlur={saatKeluar(() => void keluarBaris())}>
        <div className="flex items-center gap-2">
          <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">{tanggal}</div>
        </div>
        {uraian}
        {jumlah}
      </li>
    )
  }
  return (
    <TableRow className="bg-muted/20 hover:bg-muted/30" onBlur={saatKeluar(() => void keluarBaris())}>
      <TableCell className="w-12 text-center text-muted-foreground"><Plus className="mx-auto size-4" aria-hidden /></TableCell>
      <TableCell className="w-44">{tanggal}</TableCell>
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
  const terbesar = data?.kategori.map((k) => ({ label: k.label, jumlah: Number(data.ringkasan.per_kategori[k.id] ?? 0) })).sort((a, b) => b.jumlah - a.jumlah)[0]
  const tanggalAwal = tanggalBawaan(periode, hariIni())
  const sisipan = (k: { id: string; label: string }, tata: Tata) => (
    <BarisBaru label={k.label} tanggalAwal={tanggalAwal} tata={tata} simpan={(isi) => tambah.mutateAsync({ kategori: k.id, isi }).then(() => undefined)} />
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <KartuMetrik label={`Jumlah ${judul}`} icon={Wallet} nilai={fmtRp(data.ringkasan.total)} catatan="Bulan yang dipilih" />
            <KartuMetrik label="Transaksi" icon={ListChecks} nilai={String(data.items.length)} catatan="Baris tercatat" />
            <KartuMetrik className="col-span-2 lg:col-span-1" label="Kategori terbesar" icon={TrendingUp} nilai={terbesar && terbesar.jumlah > 0 ? fmtRp(terbesar.jumlah) : '—'} catatan={terbesar && terbesar.jumlah > 0 ? terbesar.label : 'Belum ada transaksi'} />
          </div>
          <Card>
            <CardContent className="space-y-4 pt-4">
              {bisaTulis && <p className="teks-kecil text-muted-foreground">Ketik langsung di baris. Isi tanggal, uraian, dan jumlah; pindah ke kolom lain atau tekan Enter dan baris tersimpan otomatis. Baris putus-putus di bawah tiap kelompok untuk transaksi baru.</p>}
              <div className="space-y-5 md:hidden">
                {data.kategori.map((k) => {
                  const baris = data.items.filter((i) => i.kategori === k.id)
                  return (
                    <section key={k.id} aria-label={k.label} className="space-y-2">
                      <div className={`flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 ${aksenKategori}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-sm font-semibold">{k.label}</span>
                          <Badge variant="secondary">{baris.length}</Badge>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtRp(data.ringkasan.per_kategori[k.id] ?? '0')}</span>
                      </div>
                      <ul className="space-y-2">
                        {baris.map((item, n) => (
                          <BarisTransaksi key={item.id} tata="kartu" item={item} label={k.label} nomor={n + 1} bisaTulis={bisaTulis} simpan={(isi) => ubah.mutateAsync({ id: item.id, kategori: k.id, isi }).then(() => undefined)} hapus={() => void onHapus(item, k.label)} />
                        ))}
                        {bisaTulis && sisipan(k, 'kartu')}
                        {!bisaTulis && baris.length === 0 && <li className="px-1 text-sm text-muted-foreground">Belum ada transaksi.</li>}
                      </ul>
                    </section>
                  )
                })}
                <div className="flex items-center justify-between rounded-lg bg-[var(--table-heading-background)] px-3 py-3 font-bold">
                  <span>Jumlah {judul}</span>
                  <span className="tabular-nums">{fmtRp(data.ringkasan.total)}</span>
                </div>
              </div>
              <div className="hidden md:block">
                <TableShell label={`Transaksi ${judul}`} minWidth={720}>
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
                              <BarisTransaksi key={item.id} tata="tabel" item={item} label={k.label} nomor={n + 1} bisaTulis={bisaTulis} simpan={(isi) => ubah.mutateAsync({ id: item.id, kategori: k.id, isi }).then(() => undefined)} hapus={() => void onHapus(item, k.label)} />
                            ))}
                            {bisaTulis && sisipan(k, 'tabel')}
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
