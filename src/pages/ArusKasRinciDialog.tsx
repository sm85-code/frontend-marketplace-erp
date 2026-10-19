import { useState } from 'react'
import { fmtRp } from '@/api/client'
import MoneyInput from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type RinciTarget = { key: string; label: string; total: boolean; period: string; current: number | null; manual: boolean; split: boolean }

/** Name and figure of one line of the cash-flow breakdown for one period. */
export default function ArusKasRinciDialog({
  target,
  onClose,
  onSave,
  onClearValue,
  onDeleteRow,
  onAddSplit,
}: {
  target: RinciTarget | null
  onClose: () => void
  onSave: (label: string, value: string) => void
  onClearValue: () => void
  onDeleteRow: () => void
  onAddSplit: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {target && <Form key={`${target.key}|${target.period}`} target={target} onSave={onSave} onClearValue={onClearValue} onDeleteRow={onDeleteRow} onAddSplit={onAddSplit} />}
      </DialogContent>
    </Dialog>
  )
}

function Form({ target, onSave, onClearValue, onDeleteRow, onAddSplit }: { target: RinciTarget; onSave: (l: string, v: string) => void; onClearValue: () => void; onDeleteRow: () => void; onAddSplit: () => void }) {
  const [label, setLabel] = useState(target.label)
  const [value, setValue] = useState(target.current === null ? '' : String(target.current))
  const valid = !!label.trim() && (target.total || /^-?\d+(\.\d+)?$/.test(value))
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave(label.trim(), value)
      }}
    >
      <DialogHeader>
        <DialogTitle>{target.total ? 'Ubah nama baris' : target.split ? 'Baris rincian' : 'Ubah baris'}</DialogTitle>
        <DialogDescription>
          Periode {target.period}
          {target.manual ? ' · angka ini diisi manual' : ' · angka otomatis dari laporan keuangan'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="rinci-name">Nama baris</Label>
        <Input id="rinci-name" autoFocus maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      {!target.total && <div className="space-y-2">
        <Label htmlFor="rinci-amount">Nilai periode ini (Rp)</Label>
        <MoneyInput id="rinci-amount" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        {target.current !== null && <p className="text-xs text-muted-foreground">Sekarang {fmtRp(target.current)}. Jumlah kas masuk tidak berubah; yang belum terbagi tampil di baris “Belum dirinci”.</p>}
        {target.manual && (
          <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={onClearValue}>
            Kembalikan ke angka otomatis
          </button>
        )}
      </div>}
      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {!target.total && (
            <>
              <Button type="button" variant="outline" onClick={onAddSplit}>
                Tambah baris rincian
              </Button>
              <Button type="button" variant="outline" onClick={onDeleteRow}>
                Hapus baris
              </Button>
            </>
          )}
        </div>
        <Button type="submit" disabled={!valid}>
          Simpan
        </Button>
      </DialogFooter>
    </form>
  )
}
