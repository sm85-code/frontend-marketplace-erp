import { useState } from 'react'
import { fmtRp } from '@/api/client'
import MoneyInput from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Kategori } from '@/lib/kategoriKeuangan'

export type RinciTarget = { key: string; label: string; total: boolean; child?: boolean; anak?: boolean; period: string; current: number | null; manual: boolean; split: boolean; /** Category choices for rows of cash in / cash out; the sub-rows follow their row. */ opsi?: Kategori[]; kategori?: string }

/** Name and figure of one line of the cash-flow breakdown for one period. */
export default function ArusKasRinciDialog({
  target,
  onClose,
  onSave,
  onClearValue,
  onDeleteRow,
  onAddSplit,
  onAddChild,
}: {
  target: RinciTarget | null
  onClose: () => void
  onSave: (label: string, value: string, kategori?: string) => void
  onClearValue: () => void
  onDeleteRow: () => void
  onAddSplit: () => void
  onAddChild: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {target && <Form key={`${target.key}|${target.period}`} target={target} onSave={onSave} onClearValue={onClearValue} onDeleteRow={onDeleteRow} onAddSplit={onAddSplit} onAddChild={onAddChild} />}
      </DialogContent>
    </Dialog>
  )
}

function Form({ target, onSave, onClearValue, onDeleteRow, onAddSplit, onAddChild }: { target: RinciTarget; onSave: (l: string, v: string, k?: string) => void; onClearValue: () => void; onDeleteRow: () => void; onAddSplit: () => void; onAddChild: () => void }) {
  const [label, setLabel] = useState(target.label)
  const [value, setValue] = useState(target.current === null ? '' : String(target.current))
  const [kategori, setKategori] = useState(target.kategori ?? '')
  const valid = !!label.trim() && (target.total || /^-?\d+(\.\d+)?$/.test(value))
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave(label.trim(), value, target.opsi ? kategori : undefined)
      }}
    >
      <DialogHeader>
        <DialogTitle>{target.total ? 'Ubah nama baris' : target.child ? 'Rincian baris' : target.split ? 'Baris tambahan' : 'Ubah baris'}</DialogTitle>
        <DialogDescription>
          Periode {target.period}
          {target.manual ? ' · angka ini diisi manual' : ' · angka otomatis dari laporan keuangan'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="rinci-name">Nama baris</Label>
        <Input id="rinci-name" autoFocus maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      {target.opsi && !target.total && (
        <div className="space-y-2">
          <Label htmlFor="rinci-kategori">Masuk ke komponen</Label>
          <select id="rinci-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {target.opsi.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Menentukan di baris mana angka ini muncul di tab Pemasukan atau Pengeluaran.</p>
        </div>
      )}
      {!target.total && <div className="space-y-2">
        <Label htmlFor="rinci-amount">Nilai periode ini (Rp)</Label>
        <MoneyInput id="rinci-amount" disabled={target.anak} value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        {target.current !== null && <p className="text-xs text-muted-foreground">Sekarang {fmtRp(target.current)}. Jumlah kelompok dan saldo kas mengikuti angka ini{target.anak ? ' (dihitung dari jumlah rinciannya)' : ''}.</p>}
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
              {!target.child && (
                <Button type="button" variant="outline" onClick={onAddSplit}>
                  Tambah baris
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onAddChild}>
                Tambah rincian
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
