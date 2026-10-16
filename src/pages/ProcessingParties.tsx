import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Users, Truck } from 'lucide-react'
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
import { Field } from './processingShared'

export default function ProcessingParties({
  kind,
  items,
}: {
  kind: 'tukang' | 'supplier'
  items: ProcessingParty[]
}) {
  const title = kind === 'tukang' ? 'Tukang Kayu' : 'Supplier'
  const Icon = kind === 'tukang' ? Users : Truck
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<ProcessingParty | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const filtered = items.filter((r) =>
    [r.nama, r.catatan].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
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
            placeholder="Cari nama atau keterangan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2">
        {filtered.map((r) => (
          <div key={r.id} className="flex min-w-0 items-center gap-3 border-b p-4 sm:odd:border-r">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/5 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.nama}</p>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                {r.catatan || 'Belum ada keterangan'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit ${r.nama}`}
              onClick={() => {
                setAdding(false)
                setError('')
                setEdit(r)
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {search
            ? 'Tidak ada nama yang cocok.'
            : `Belum ada ${title.toLowerCase()}. Tambahkan untuk mulai memetakan.`}
        </div>
      )}
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!busy && !o) setEdit(null)
        }}
      >
        <DialogContent className="processing-dialog text-left [&_p]:text-left">
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
