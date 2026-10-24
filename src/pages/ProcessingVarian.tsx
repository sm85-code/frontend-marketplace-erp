import InfoTip from '@/components/InfoTip'
import { Plus, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAKS_VARIAN, SARAN_NAMA_VARIAN, kombinasiBaru, labelVarian, type Varian } from '@/lib/varianProduk'

/**
 * Variant rows of a manual product: a name (Ukuran, Jenis, ...) and a value each. "Tambah nilai" adds another value to the
 * same variant (Ukuran 80x40, 100x50); each extra value becomes a new sibling product and this product stays as it is.
 */
export default function ProcessingVarian({ value, onChange, ekstra = [], onEkstra }: {
  value: Varian[]; onChange: (next: Varian[]) => void; ekstra?: string[][]; onEkstra?: (next: string[][]) => void
}) {
  const saran = useId()
  const ubah = (index: number, patch: Partial<Varian>) => onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  const ubahEkstra = (i: number, nilai: string[]) => onEkstra?.(value.map((_, j) => (j === i ? nilai : ekstra[j] ?? [])))
  const baru = onEkstra ? kombinasiBaru(value, ekstra) : []
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Varian</legend>
      <InfoTip teks={"Kosongkan jika produk tidak punya varian. Tambah varian untuk jenis varian lain (Ukuran, Warna). Tambah nilai untuk pilihan lain dari varian yang sama; tiap nilai baru menjadi produk baru."} />
      <datalist id={saran}>
        {SARAN_NAMA_VARIAN.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {value.map((v, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-3">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 space-y-1 text-xs">
              <span className="block text-muted-foreground">Nama varian</span>
              <Input className="h-10" list={saran} maxLength={60} value={v.nama} placeholder="Ukuran" onChange={(e) => ubah(i, { nama: e.target.value })} />
            </label>
            <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label={`Hapus varian ${v.nama || i + 1}`} onClick={() => { onChange(value.filter((_, j) => j !== i)); onEkstra?.(ekstra.filter((_, j) => j !== i)) }}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <span className="block text-xs text-muted-foreground">Nilai</span>
            <Input className="h-10 w-full" maxLength={100} value={v.nilai} placeholder="80x40" aria-label={`Nilai ${v.nama || `varian ${i + 1}`}`} onChange={(e) => ubah(i, { nilai: e.target.value })} />
            {(ekstra[i] ?? []).map((n, k) => (
              <div key={k} className="flex items-center gap-2">
                <Input className="h-10 min-w-0 flex-1" maxLength={100} value={n} placeholder="Nilai baru, mis. 100x50" aria-label={`Nilai baru ${k + 1} untuk ${v.nama || `varian ${i + 1}`}`} onChange={(e) => ubahEkstra(i, (ekstra[i] ?? []).map((x, j) => (j === k ? e.target.value : x)))} />
                <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label={`Hapus nilai baru ${n || k + 1}`} onClick={() => ubahEkstra(i, (ekstra[i] ?? []).filter((_, j) => j !== k))}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            {onEkstra && (
              <Button type="button" variant="outline" className="h-10 w-full sm:w-auto" onClick={() => ubahEkstra(i, [...(ekstra[i] ?? []), ''])}>
                <Plus className="size-4" /> Tambah nilai
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="h-10 w-full" disabled={value.length >= MAKS_VARIAN} onClick={() => onChange([...value, { nama: '', nilai: '' }])}>
        <Plus className="size-4" /> Tambah varian
      </Button>
      {baru.length > 0 && (
        <div className="rounded-xl border bg-muted/30 p-3 text-sm" aria-live="polite">
          <p className="font-medium">{baru.length} produk baru akan dibuat</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {baru.map((k) => <li key={labelVarian({ varian: k, ukuran: '' })}>{labelVarian({ varian: k, ukuran: '' })}</li>)}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">Nama, SKU, dan harga ikut produk ini; bisa diubah nanti per produk. Produk ini tetap.</p>
        </div>
      )}
    </fieldset>
  )
}
