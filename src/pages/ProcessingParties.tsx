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

export default function ProcessingParties({
  kind,
  items,
}: {
  kind: 'tukang' | 'supplier'
  items: ProcessingParty[]
}) {
  const title = kind === 'tukang' ? 'Tukang Kayu' : 'Supplier'
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<ProcessingParty | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const filtered = items.filter((r) =>
    [r.nama, r.alamat, r.no_wa, r.no_rekening, r.nama_bank, r.catatan].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  const columns: KolomTabel<ProcessingParty>[] = [
    { kunci: 'nama', judul: 'Nama', tetap: true, nilai: r => r.nama, sel: r => <span className="font-medium">{r.nama}</span> },
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
      <div className="space-y-4 border-b p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Daftar {title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} {kind === 'tukang' ? 'tukang kayu' : 'supplier'} tersedia untuk pemetaan.
            </p>
          </div>
          <Button
            onClick={() => {
              setAdding(true)
              setError('')
              setEdit({ id: crypto.randomUUID(), nama: '', catatan: '', sumber: 'Input admin', version: 0 })
            }}
          >
            <Plus className="h-4 w-4" /> Tambah {title}
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label={`Cari ${title}`}
            placeholder="Cari nama, alamat, WA, rekening, atau bank…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <TabelLokal label={`Daftar ${title}`} items={filtered} kolom={columns} idDari={r => r.id} namaDari={r => r.nama} minWidth={900} />
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
