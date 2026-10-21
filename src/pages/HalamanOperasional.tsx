import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mingguBulan, periodeBerjalan } from '@/lib/tanggal'
import { alasanBelumBisa, jumlahTampil, sama, tanggalBawaan, type Isi } from '@/lib/operasionalBaris'

const wib = (opsi: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', ...opsi }).format(new Date())
const hariIni = () => wib({ year: 'numeric', month: '2-digit', day: '2-digit' })
const bulanIni = () => hariIni().slice(0, 7)

const tglTampil = (t: string) => t.split('-').reverse().join('/')
const aksenKategori = 'border-l-4 border-l-primary/60'

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
  // The chosen period slides to the middle of its row (the row only, never the page), also once the data has arrived.
  const barisPeriode = useRef<HTMLDivElement>(null)
  const ada = !!data
  useEffect(() => {
    const kotak = barisPeriode.current
    const tab = kotak?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (kotak && tab) kotak.scrollLeft = tab.offsetLeft - (kotak.clientWidth - tab.offsetWidth) / 2
  }, [indeks, periode, ada])

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
        <>
          <Tabs value={String(indeks)} onValueChange={(v) => setDipilih({ periode, indeks: Number(v) })}>
            <div ref={barisPeriode} className="max-w-full overflow-x-auto">
              <TabsList className="section-tabs !max-w-none !flex-nowrap" aria-label="Periode mingguan">
                {minggu.map((m, i) => (
                  <TabsTrigger key={m.mulai} value={String(i)} className="h-auto flex-col gap-0 py-1.5">
                    <span className="text-xs font-normal opacity-80">Periode</span>
                    <span>{m.label}</span>
                    <span className="text-xs font-normal tabular-nums opacity-80">{fmtRp(jumlahDari((data.items ?? []).filter((x) => dalam(x.tanggal, m))))}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <p className="teks-kecil text-muted-foreground">Dicatat per periode mingguan (Senin–Minggu), sama dengan kolom Periode di Arus Kas.{bisaTulis ? ' Ketuk transaksi untuk mengubahnya, atau Tambah di tiap kategori.' : ''}</p>
              <TableShell label={`Transaksi ${judul}`} minWidth={0}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 px-1 text-center">No</TableHead>
                      <TableHead className="w-16 px-2 sm:w-28">Tanggal</TableHead>
                      <TableHead>Uraian</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.kategori.map((k) => {
                      const baris = itemsPeriode.filter((i) => i.kategori === k.id)
                      return (
                        <Fragment key={k.id}>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableCell colSpan={3} className={`whitespace-normal font-semibold ${aksenKategori}`}>
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {k.label}
                                {bisaTulis && (
                                  <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" aria-label={`Tambah transaksi ${k.label}`} onClick={() => setSasaran({ kategori: k.id, label: k.label })}>
                                    <Plus className="size-3.5" aria-hidden /> Tambah
                                  </Button>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{fmtRp(jumlahDari(baris))}</TableCell>
                          </TableRow>
                          {baris.map((item, n) => (
                            <TableRow
                              key={item.id}
                              className={bisaTulis ? 'cursor-pointer hover:bg-muted/60' : undefined}
                              tabIndex={bisaTulis ? 0 : undefined}
                              aria-label={bisaTulis ? `Ubah transaksi ${k.label} ${n + 1}` : undefined}
                              onClick={bisaTulis ? () => setSasaran({ kategori: k.id, label: k.label, item }) : undefined}
                              onKeyDown={bisaTulis ? (e) => e.key === 'Enter' && setSasaran({ kategori: k.id, label: k.label, item }) : undefined}
                            >
                              <TableCell className="px-1 text-center tabular-nums text-muted-foreground">{n + 1}</TableCell>
                              <TableCell className="whitespace-nowrap px-2">
                                <span className="sm:hidden">{tglTampil(item.tanggal).slice(0, 5)}</span>
                                <span className="hidden sm:inline">{tglTampil(item.tanggal)}</span>
                              </TableCell>
                              <TableCell className="whitespace-normal break-words">{item.uraian || '—'}</TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">{fmtRp(item.jumlah)}</TableCell>
                            </TableRow>
                          ))}
                          {baris.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                                Belum ada transaksi di periode ini.
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                    <TableRow className="bg-[var(--table-heading-background)] font-bold hover:bg-[var(--table-heading-background)]">
                      <TableCell colSpan={3}>Jumlah {judul} periode ini</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{fmtRp(jumlahDari(itemsPeriode))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableShell>
            </CardContent>
          </Card>
        </>
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
