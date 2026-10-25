import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { daftarRekening, rekeningTukang, simpanDaftarRekening, type DaftarRekening, type RekeningLain } from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ConfirmProvider'
import Spinner from '@/components/Spinner'
import { useAuth } from '@/lib/auth'

type Baris = { id: string; no: number; nama: string; jenis: string; bank: string; rekening: string; tukang: boolean }

/** Built-in accounts that are not craftsmen (used until an admin saves the list). */
const REKENING_LAIN: RekeningLain[] = [
  { id: 'lain-iklan', nama: 'UMAR AL KAMAL', jenis: 'Iklan', bank: 'BRI', rekening: '400501028068531' },
  { id: 'lain-titip-gaji', nama: 'YUYUN AULIA NURJANAH', jenis: 'Titip gaji', bank: 'BRI', rekening: '400501004422509' },
  { id: 'lain-kelompok', nama: 'SUCIATI RAHAYU', jenis: 'Rek. Kelompok', bank: 'BRI', rekening: '403101051773530' },
]

/** Built-in order of the craftsmen; anyone not named here follows alphabetically. */
const URUTAN_TUKANG = ['joko wahyono', 'cahyono', 'ai hendarso', 'ahmad nur alim']
const urutanTukang = (nama: string) => {
  const n = nama.trim().toLowerCase()
  const i = URUTAN_TUKANG.findIndex((x) => n === x)
  return i >= 0 ? i : URUTAN_TUKANG.length
}

const salin = async (rekening: string) => {
  try {
    await navigator.clipboard.writeText(rekening)
    toast.success('No. rekening disalin')
  } catch {
    toast.error('Gagal menyalin no. rekening. Coba lagi.')
  }
}

const KOSONG: RekeningLain = { id: '', nama: '', jenis: '', bank: '', rekening: '' }

/** Accounts to pay: craftsmen with an account number (edited on Tukang Kayu) and the other accounts (edited here by an admin). */
export default function RekeningTukangKayu() {
  const { user } = useAuth()
  const admin = user?.role === 'admin'
  const qc = useQueryClient()
  const confirm = useConfirm()
  const q = useQuery({ queryKey: ['rekening-tukang'], queryFn: rekeningTukang })
  const simpanan = useQuery({ queryKey: ['rekening-daftar'], queryFn: daftarRekening })
  const [edit, setEdit] = useState<RekeningLain | null>(null)
  const save = useMutation({
    mutationFn: simpanDaftarRekening,
    onSuccess: (d) => { qc.setQueryData(['rekening-daftar'], d); toast.success('Daftar rekening disimpan') },
    onError: (e) => toast.error(getApiError(e)),
  })

  const lain = simpanan.data?.lain ?? REKENING_LAIN
  const tukang: Baris[] = [...(q.data ?? [])]
    .sort((a, b) => urutanTukang(a.nama) - urutanTukang(b.nama) || a.nama.localeCompare(b.nama, 'id'))
    .map((t) => ({ id: t.id, no: 0, nama: t.nama, jenis: 'Tukang kayu', bank: t.nama_bank, rekening: t.no_rekening, tukang: true }))
  const semua: Baris[] = [...tukang, ...lain.map((r) => ({ ...r, no: 0, tukang: false }))]
  const urutan = simpanan.data?.urutan ?? []
  const posisi = (id: string) => { const i = urutan.indexOf(id); return i < 0 ? urutan.length + semua.findIndex((r) => r.id === id) : i }
  const items = [...semua].sort((a, b) => posisi(a.id) - posisi(b.id)).map((r, i) => ({ ...r, no: i + 1 }))

  const kirim = (d: DaftarRekening) => save.mutateAsync(d)
  const pindah = (i: number, arah: -1 | 1) => {
    const ids = items.map((r) => r.id)
    const j = i + arah
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    void kirim({ lain, urutan: ids })
  }
  const hapus = async (r: Baris) => {
    if (!(await confirm({ title: 'Hapus rekening?', description: `${r.nama} · ${r.bank} ${r.rekening}\nBaris ini dihapus dari daftar rekening pembayaran.`, confirmLabel: 'Hapus', destructive: true }))) return
    void kirim({ lain: lain.filter((x) => x.id !== r.id), urutan: items.map((x) => x.id).filter((id) => id !== r.id) })
  }
  const simpanEdit = async () => {
    if (!edit) return
    const bersih = { ...edit, nama: edit.nama.trim(), jenis: edit.jenis.trim(), bank: edit.bank.trim(), rekening: edit.rekening.replace(/\s+/g, '') }
    if (!bersih.nama || !bersih.rekening) { toast.error('Nama dan no. rekening wajib diisi'); return }
    const baru = !bersih.id
    if (baru) bersih.id = `lain-${crypto.randomUUID().slice(0, 8)}`
    const daftar = baru ? [...lain, bersih] : lain.map((x) => (x.id === bersih.id ? bersih : x))
    try { await kirim({ lain: daftar, urutan: [...items.map((x) => x.id), ...(baru ? [bersih.id] : [])] }); setEdit(null) } catch { /* toast shown */ }
  }

  const kolom: KolomTabel<Baris>[] = [
    { kunci: 'no', judul: 'No.', sel: (r) => <span className="tabular-nums">{r.no}</span> },
    { kunci: 'nama', judul: 'Nama', tetap: true, sel: (r) => <span className="font-medium">{r.nama}</span> },
    { kunci: 'jenis', judul: 'Jenis Pembayaran', sel: (r) => r.jenis || '—' },
    { kunci: 'bank', judul: 'Bank', sel: (r) => r.bank || '—' },
    {
      kunci: 'rekening',
      judul: 'No. Rekening',
      sel: (r) => (
        <div>
          <div className="flex items-center gap-1">
            <span className="whitespace-nowrap tabular-nums">{r.rekening}</span>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Salin no. rekening ${r.nama}`} title="Salin no. rekening" onClick={() => void salin(r.rekening)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {admin && r.tukang && <Link to="/processing/tukang-kayu" className="text-xs text-primary underline-offset-2 hover:underline">Ubah di halaman Tukang</Link>}
        </div>
      ),
    },
    ...(admin ? [{
      kunci: 'aksi',
      judul: 'Aksi',
      sel: (r: Baris) => (
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Naikkan ${r.nama}`} title="Naikkan" disabled={save.isPending || r.no === 1} onClick={() => pindah(r.no - 1, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Turunkan ${r.nama}`} title="Turunkan" disabled={save.isPending || r.no === items.length} onClick={() => pindah(r.no - 1, 1)}><ArrowDown className="h-4 w-4" /></Button>
          {!r.tukang && <>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Ubah ${r.nama}`} title="Ubah" disabled={save.isPending} onClick={() => setEdit({ id: r.id, nama: r.nama, jenis: r.jenis, bank: r.bank, rekening: r.rekening })}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={`Hapus ${r.nama}`} title="Hapus" disabled={save.isPending} onClick={() => void hapus(r)}><Trash2 className="h-4 w-4" /></Button>
          </>}
        </div>
      ),
    }] : []),
  ]

  return (
    <section aria-label="Daftar nomor rekening pembayaran" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Daftar Nomor Rekening Pembayaran</h2>
        {admin && <Button size="icon" className="h-10 w-10 shrink-0" aria-label="Tambah rekening" title="Tambah rekening" onClick={() => setEdit({ ...KOSONG })}><Plus className="h-4 w-4" /></Button>}
      </div>
      {(q.isLoading || simpanan.isLoading) && <Spinner label="Memuat daftar rekening…" />}
      {q.error && <p role="alert" className="text-sm text-destructive">{getApiError(q.error)}</p>}
      {q.data && !simpanan.isLoading && <TabelLokal label="Daftar nomor rekening pembayaran" items={items} kolom={kolom} idDari={(r) => r.id} namaDari={(r) => r.nama} minWidth={admin ? 760 : 640} />}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o && !save.isPending) setEdit(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? 'Ubah rekening' : 'Tambah rekening'}</DialogTitle></DialogHeader>
          {edit && <form id="form-rekening" className="space-y-3" onSubmit={(e) => { e.preventDefault(); void simpanEdit() }}>
            {([['nama', 'Nama'], ['jenis', 'Jenis pembayaran'], ['bank', 'Bank'], ['rekening', 'No. rekening']] as const).map(([k, l]) => (
              <div key={k} className="space-y-1"><Label htmlFor={`rek-${k}`}>{l}</Label><Input id={`rek-${k}`} value={edit[k]} inputMode={k === 'rekening' ? 'numeric' : undefined} maxLength={k === 'rekening' ? 40 : 120} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
            ))}
          </form>}
          <DialogFooter>
            <Button variant="outline" disabled={save.isPending} onClick={() => setEdit(null)}>Batal</Button>
            <Button type="submit" form="form-rekening" disabled={save.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
