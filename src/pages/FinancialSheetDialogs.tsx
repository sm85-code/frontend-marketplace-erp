import { useState } from 'react'
import { fmtRp } from '@/api/client'
import MoneyInput from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type EditTarget = { key: string; label: string; period: string; current: number | null; manual: boolean; custom: boolean; renamable?: boolean }

/** Pop-up for one figure of the report sheet: type an amount (thousand separators), save it or delete the typed value. */
export function EditCellDialog({
  target,
  onClose,
  onSave,
  onClear,
  onDelete,
  onDeleteRow,
}: {
  target: EditTarget | null
  onClose: () => void
  onSave: (value: string, label: string) => void
  /** Back to the closed-books figure. */
  onClear: () => void
  /** Delete the figure: zero for a closed-books row, nothing for a row added by hand. */
  onDelete: () => void
  onDeleteRow: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {target && <EditForm key={`${target.key}|${target.period}`} target={target} onSave={onSave} onClear={onClear} onDelete={onDelete} onDeleteRow={onDeleteRow} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({ target, onSave, onClear, onDelete, onDeleteRow }: { target: EditTarget; onSave: (v: string, l: string) => void; onClear: () => void; onDelete: () => void; onDeleteRow: () => void }) {
  const [value, setValue] = useState(target.current === null ? '' : String(target.current))
  const [label, setLabel] = useState(target.label)
  const valid = /^-?\d+(\.\d+)?$/.test(value) && !!label.trim()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave(value, label.trim())
      }}
    >
      <DialogHeader>
        <DialogTitle>{target.label}</DialogTitle>
        <DialogDescription>
          Periode {target.period}
          {target.manual ? ' · angka ini diisi manual' : ' · angka dari tutup buku'}
        </DialogDescription>
      </DialogHeader>
      {target.renamable && (
        <div className="space-y-2">
          <Label htmlFor="sheet-name">Nama baris</Label>
          <Input id="sheet-name" maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="sheet-amount">Nilai (Rp)</Label>
        <MoneyInput id="sheet-amount" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        {target.current !== null && <p className="text-xs text-muted-foreground">Sekarang {fmtRp(target.current)}</p>}
        {target.manual && !target.custom && (
          <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={onClear}>
            Kembalikan ke angka tutup buku
          </button>
        )}
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDelete}>
            Hapus
          </Button>
          {target.custom && (
            <Button type="button" variant="outline" onClick={onDeleteRow}>
              Hapus baris
            </Button>
          )}
        </div>
        <Button type="submit" disabled={!valid}>
          Simpan
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AddRowDialog({ group, onClose, onAdd }: { group: { tabel: string; grup: string } | null; onClose: () => void; onAdd: (label: string) => void }) {
  const [label, setLabel] = useState('')
  return (
    <Dialog open={!!group} onOpenChange={(open) => { if (!open) { setLabel(''); onClose() } }}>
      <DialogContent className="max-w-sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (label.trim()) {
              onAdd(label.trim())
              setLabel('')
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Tambah baris</DialogTitle>
            <DialogDescription>{group?.grup}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sheet-row-name">Nama baris</Label>
            <Input id="sheet-row-name" autoFocus maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!label.trim()}>
              Tambah
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Rename a row or a group title (nothing else about it changes). */
export function RenameDialog({ target, onClose, onSave }: { target: { title: string; label: string } | null; onClose: () => void; onSave: (label: string) => void }) {
  const [label, setLabel] = useState('')
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {target && (
          <form
            key={target.label}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const next = (label || target.label).trim()
              if (next) onSave(next)
            }}
          >
            <DialogHeader>
              <DialogTitle>{target.title}</DialogTitle>
              <DialogDescription>Hanya mengubah nama yang ditampilkan; angka dan perhitungan tidak berubah.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rename-input">Nama</Label>
              <Input id="rename-input" autoFocus maxLength={120} defaultValue={target.label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
