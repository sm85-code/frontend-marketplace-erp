import InfoTip from '@/components/InfoTip'
import { Plus, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAKS_VARIAN, SARAN_NAMA_VARIAN, type Varian } from '@/lib/varianProduk'

/** Variant rows of a manual product: a name (Ukuran, Jenis, ...) and a value each; add as many as the product needs. */
export default function ProcessingVarian({ value, onChange }: { value: Varian[]; onChange: (next: Varian[]) => void }) {
  const saran = useId()
  const ubah = (index: number, patch: Partial<Varian>) => onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Varian</legend>
      <InfoTip teks={"Kosongkan jika produk tidak punya varian. Tambah satu baris per jenis varian, misalnya Ukuran dan Jenis."} />
      <datalist id={saran}>
        {SARAN_NAMA_VARIAN.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {value.map((v, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] items-end gap-2">
          <label className="space-y-1 text-xs">
            <span className="block text-muted-foreground">Nama varian</span>
            <Input list={saran} maxLength={60} value={v.nama} placeholder="Ukuran" onChange={(e) => ubah(i, { nama: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="block text-muted-foreground">Pilihan / nilai</span>
            <Input maxLength={100} value={v.nilai} placeholder="Basah" onChange={(e) => ubah(i, { nilai: e.target.value })} />
          </label>
          <Button type="button" variant="ghost" size="icon" aria-label={`Hapus varian ${v.nama || i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={value.length >= MAKS_VARIAN} onClick={() => onChange([...value, { nama: '', nilai: '' }])}>
        <Plus className="size-4" /> Tambah varian
      </Button>
    </fieldset>
  )
}
