import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fmtRp, getApiError } from '@/api/client'
import { daftarOperasional, hapusOperasional, tambahOperasional, ubahOperasional, type JenisOperasional, type TransaksiOperasional } from '@/api/operasional'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { BarHalaman } from '@/components/daftar'
import { useConfirm } from '@/components/ConfirmProvider'
import MoneyInput from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { alasanBelumBisa, jumlahTampil, tanggalBawaan, type Isi } from '@/lib/operasionalBaris'
import { susunOperasional } from '@/lib/operasionalLembar'
import { periodeBerjalan, weekRange } from '@/lib/tanggal'
import { isGroup, type Line } from '@/lib/sheetEngine'
import FinancialSheetTable from './FinancialSheetTable'

const wib = (opsi: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', ...opsi }).format(new Date())
const hariIni = () => wib({ year: 'numeric', month: '2-digit', day: '2-digit' })
const bulanIni = () => hariIni().slice(0, 7)
const tampilTanggal = (t: string) => t.split('-').reverse().join('/')

/** Which entry is open in the pop-up: a saved one (`item`) or a new one in a category. */
type Buka = { kategori: string; label: string; item?: TransaksiOperasional; nomor?: number }

function DialogBaris({ buka, periode, sibuk, onClose, onSimpan, onHapus }: { buka: Buka | null; periode: string; sibuk: boolean; onClose: () => void; onSimpan: (isi: Isi) => void; onHapus: () => void }) {
  return (
    <Dialog open={!!buka} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">{buka && <Form key={buka.item?.id ?? `baru-${buka.kategori}`} buka={buka} periode={periode} sibuk={sibuk} onSimpan={onSimpan} onHapus={onHapus} />}</DialogContent>
    </Dialog>
  )
}

function Form({ buka, periode, sibuk, onSimpan, onHapus }: { buka: Buka; periode: string; sibuk: boolean; onSimpan: (isi: Isi) => void; onHapus: () => void }) {
  const awal: Isi = buka.item ? { tanggal: buka.item.tanggal, uraian: buka.item.uraian, jumlah: jumlahTampil(buka.item.jumlah) } : { tanggal: tanggalBawaan(periode, hariIni()), uraian: '', jumlah: '' }
  const [isi, setIsi] = useState<Isi>(awal)
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
        <DialogTitle>{buka.item ? 'Ubah baris' : 'Tambah baris'}</DialogTitle>
        <DialogDescription>{buka.item ? `${buka.label} · baris ${buka.nomor}` : buka.label}</DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="op-tanggal">Tanggal</Label>
        <Input id="op-tanggal" type="date" value={isi.tanggal} onChange={(e) => setIsi({ ...isi, tanggal: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="op-uraian">Uraian</Label>
        <Input id="op-uraian" value={isi.uraian} maxLength={255} onChange={(e) => setIsi({ ...isi, uraian: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="op-jumlah">Jumlah (Rp)</Label>
        <MoneyInput id="op-jumlah" className="text-right" value={isi.jumlah} onChange={(e) => setIsi({ ...isi, jumlah: e.target.value })} />
      </div>
      <DialogFooter className="sm:justify-between">
        {buka.item ? (
          <Button type="button" variant="outline" className="text-destructive" disabled={sibuk} onClick={onHapus}>
            Hapus baris
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={sibuk}>
          Simpan
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Operasional Umum and Operasional Packing: the entries of a month in the Arus Kas layout (a group per category, weekly columns), with a Tanggal column. */
export default function HalamanOperasional({ jenis, judul, deskripsi }: { jenis: JenisOperasional; judul: string; deskripsi: string }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [periode, setPeriode] = useState(bulanIni)
  const [buka, setBuka] = useState<Buka | null>(null)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['operasional', jenis, periode], queryFn: () => daftarOperasional(jenis, periode) })
  const [tersimpan, setTersimpan] = useState(false)
  useEffect(() => {
    if (!tersimpan) return
    const t = setTimeout(() => setTersimpan(false), 3000)
    return () => clearTimeout(t)
  }, [tersimpan])

  const sesudah = () => {
    setTersimpan(true)
    setBuka(null)
    return qc.invalidateQueries({ queryKey: ['operasional', jenis] })
  }
  const tambah = useMutation({ mutationFn: (v: { kategori: string; isi: Isi }) => tambahOperasional(jenis, { kategori: v.kategori, ...v.isi }), onSuccess: sesudah, onError: (e) => toast.error(getApiError(e)) })
  const ubah = useMutation({ mutationFn: (v: { id: string; kategori: string; isi: Isi }) => ubahOperasional(jenis, v.id, { kategori: v.kategori, ...v.isi }), onSuccess: sesudah, onError: (e) => toast.error(getApiError(e)) })
  const hapus = useMutation({ mutationFn: (id: string) => hapusOperasional(jenis, id), onSuccess: sesudah, onError: (e) => toast.error(getApiError(e)) })
  const sibuk = tambah.isPending || ubah.isPending || hapus.isPending

  const susunan = useMemo(() => (data ? susunOperasional(data, judul) : null), [data, judul])
  const bisaTulis = !!data?.bisa_tulis
  const nomorDi = (line: Line) => {
    if (!susunan) return 0
    let n = 0
    for (const l of susunan.block.lines) {
      if (isGroup(l) || l.def.emphasis) {
        if (isGroup(l)) n = 0
        continue
      }
      n++
      if (l === line) return n
    }
    return n
  }
  const labelKategori = (id: string) => data?.kategori.find((k) => k.id === id)?.label ?? ''

  async function onHapus() {
    const t = buka?.item
    if (!t) return
    const ok = await confirm({ title: 'Hapus transaksi ini?', description: `${labelKategori(t.kategori)} · ${fmtRp(t.jumlah)}${t.uraian ? ` · ${t.uraian}` : ''}. Tindakan ini tidak bisa dibatalkan.`, confirmLabel: 'Hapus', destructive: true })
    if (ok) hapus.mutate(t.id)
  }
  const simpan = (isi: Isi) => {
    if (!buka) return
    if (buka.item) ubah.mutate({ id: buka.item.id, kategori: buka.kategori, isi })
    else tambah.mutate({ kategori: buka.kategori, isi })
  }

  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul={judul} deskripsi={deskripsi}>
        <span role="status" className="teks-kecil text-muted-foreground">{sibuk ? 'Menyimpan…' : tersimpan ? '✓ Tersimpan' : ''}</span>
        <Label htmlFor="operasional-bulan">Bulan</Label>
        <Input id="operasional-bulan" type="month" className="w-44" value={periode} onChange={(e) => e.target.value && setPeriode(e.target.value)} />
      </BarHalaman>
      {isLoading && <Spinner label="Memuat transaksi…" />}
      {error && <QueryError error={error} retry={refetch} />}
      {susunan && (
        <FinancialSheetTable
          block={susunan.block}
          days={susunan.days}
          weekLabel={(i) => weekRange(periode, i)}
          periodeAwal={periodeBerjalan(periode, susunan.days.length)}
          hurufAsli
          bernomor
          hanyaLihat={!bisaTulis}
          tanpaTambah={!bisaTulis}
          kolomTanggal={(l) => (susunan.item.has(l.def.key) ? tampilTanggal(susunan.item.get(l.def.key)!.tanggal) : undefined)}
          onEdit={(line) => {
            const item = susunan.item.get(line.def.key)
            if (item) setBuka({ kategori: item.kategori, label: labelKategori(item.kategori), item, nomor: nomorDi(line) })
          }}
          onAddRow={(g) => {
            const k = data!.kategori.find((x) => x.label === g.label)
            if (k) setBuka({ kategori: k.id, label: k.label })
          }}
        />
      )}
      <DialogBaris buka={buka} periode={periode} sibuk={sibuk} onClose={() => setBuka(null)} onSimpan={simpan} onHapus={() => void onHapus()} />
    </div>
  )
}
