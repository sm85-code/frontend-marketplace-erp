import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { saveProcessingParty, type ProcessingParty } from '@/api/processing'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Field } from './processingShared'
import { useNamaMenu } from '@/lib/namaMenu'

export default function ProcessingParties({
  kind,
  items,
}: {
  kind: 'tukang' | 'supplier'
  items: ProcessingParty[]
}) {
  const menu = useNamaMenu()
  const title = menu(kind === 'tukang' ? '/processing/tukang-kayu' : '/processing/supplier')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<ProcessingParty | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const filtered = items.filter((r) =>
    [r.nama, r.keahlian, r.alamat, r.no_wa, r.no_rekening, r.nama_bank, r.catatan].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  const columns: KolomTabel<ProcessingParty>[] = [
    { kunci: 'nama', judul: 'Nama', tetap: true, nilai: r => r.nama, sel: r => <span className="font-medium">{r.nama}</span> },
    ...(kind === 'tukang' ? [{ kunci: 'keahlian', judul: 'Keahlian', nilai: (r: ProcessingParty) => r.keahlian || '', sel: (r: ProcessingParty) => <span className="block min-w-36 max-w-56 whitespace-normal break-words">{r.keahlian || '—'}</span> }] : []),
    { kunci: 'alamat', judul: 'Alamat', nilai: r => r.alamat || '', sel: r => <span className="block min-w-40 max-w-64 whitespace-normal break-words">{r.alamat || '—'}</span> },
    { kunci: 'no_wa', judul: 'No. WA', nilai: r => r.no_wa || '', sel: r => <span className="whitespace-nowrap tabular-nums">{r.no_wa || '—'}</span> },
    { kunci: 'no_rekening', judul: 'No. Rekening', nilai: r => r.no_rekening || '', sel: r => <span className="whitespace-nowrap tabular-nums">{r.no_rekening || '—'}</span> },
    { kunci: 'nama_bank', judul: 'Nama Bank', nilai: r => r.nama_bank || '', sel: r => r.nama_bank || '—' },
    { kunci: 'aksi', judul: 'Aksi', sel: r => (
      <Button variant="outline" size="sm" aria-label={`Edit ${r.nama}`} onClick={() => {
        setAdding(false)
        setError('')
        setEdit(r)
      }}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
    ) },
  ]
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="space-y-2 border-b p-3 sm:p-4">
        <h2 className="sr-only">Daftar {title}</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setAdding(true)
              setError('')
              setEdit({ id: crypto.randomUUID(), nama: '', catatan: '', sumber: 'Input admin', version: 0 })
            }}
          >
            <Plus className="h-4 w-4" /> Tambah<span className="max-sm:sr-only"> {title}</span>
          </Button>
        <div className="relative order-first min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label={`Cari ${title}`}
            placeholder="Cari nama, WA, bank…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <TabelLokal label={`Daftar ${title}`} items={filtered} kolom={columns} idDari={r => r.id} namaDari={r => r.nama} minWidth={kind === 'tukang' ? 1050 : 900} />
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!busy && !o) setEdit(null)
        }}
      >
        <DialogContent className="processing-dialog max-h-[90dvh] overflow-y-auto text-left [&_p]:text-left">
          <DialogHeader>
            <DialogTitle>
              {adding ? 'Tambah' : 'Edit'} {title}
            </DialogTitle>
            <DialogDescription>Data tersedia pada pilihan pelaksana pemetaan order.</DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                setError('')
                try {
                  await saveProcessingParty(kind, edit)
                  await qc.invalidateQueries({ queryKey: ['processing-data'] })
                  setEdit(null)
                  setSearch('')
                  toast.success(`${title} tersimpan`)
                } catch (err) {
                  setError(getApiError(err))
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Field title="Nama">
                <Input
                  required
                  maxLength={200}
                  value={edit.nama}
                  onChange={(e) => setEdit((v) => (v ? { ...v, nama: e.target.value } : v))}
                />
              </Field>
              {kind === 'tukang' && <Field title="Keahlian"><Input maxLength={1000} value={edit.keahlian ?? ''} placeholder="Contoh: meja, lemari, rak" onChange={e => setEdit(v => v ? { ...v, keahlian: e.target.value } : v)} /></Field>}
              <Field title="Alamat">
                <Input maxLength={1000} value={edit.alamat ?? ''} onChange={e => setEdit(v => v ? { ...v, alamat: e.target.value } : v)} />
              </Field>
              <Field title="No. WA">
                <Input type="tel" maxLength={50} value={edit.no_wa ?? ''} onChange={e => setEdit(v => v ? { ...v, no_wa: e.target.value } : v)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field title="No. Rekening">
                  <Input inputMode="numeric" maxLength={100} value={edit.no_rekening ?? ''} onChange={e => setEdit(v => v ? { ...v, no_rekening: e.target.value } : v)} />
                </Field>
                <Field title="Nama Bank">
                  <Input maxLength={100} value={edit.nama_bank ?? ''} onChange={e => setEdit(v => v ? { ...v, nama_bank: e.target.value } : v)} />
                </Field>
              </div>
              <Field title="Keterangan">
                <Input
                  maxLength={2000}
                  value={edit.catatan}
                  onChange={(e) => setEdit((v) => (v ? { ...v, catatan: e.target.value } : v))}
                />
              </Field>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setEdit(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
