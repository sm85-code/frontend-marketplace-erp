import { Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DefinisiKolom } from '@/lib/kolom'

/** "Kolom (10/15)" button with a checkbox per column. Works with useKolomTersimpan. */
export default function PemilihKolom({
  semua,
  tampil,
  onUbah,
  onReset,
}: {
  semua: DefinisiKolom[]
  tampil: string[]
  onUbah: (kunci: string, aktif: boolean) => void
  onReset: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Columns3 className="mr-1.5 size-4" aria-hidden="true" /> Kolom ({tampil.length}/{semua.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2" aria-label="Pilih kolom yang ditampilkan">
        <div className="text-sm font-medium">Kolom yang ditampilkan</div>
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {semua.map((k) => (
            <label key={k.kunci} className="flex min-h-8 items-center gap-2 text-sm">
              <Checkbox checked={tampil.includes(k.kunci)} onCheckedChange={(v) => onUbah(k.kunci, v === true)} />
              {k.judul}
            </label>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Kembalikan bawaan
        </Button>
      </PopoverContent>
    </Popover>
  )
}
