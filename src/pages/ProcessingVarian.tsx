import InfoTip from '@/components/InfoTip'
import { Plus, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAKS_VARIAN, SARAN_NAMA_VARIAN, kombinasiBaru, kunciKombinasi, labelVarian, type Varian } from '@/lib/varianProduk'

/** A value added to a variant of an existing product, with its own price (one variant) . */
export type NilaiBaru = { nilai: string; harga: string }
const tombol = 'size-9 shrink-0'

/**
 * Variant rows of an existing manual product, compact for a phone: each variant is a card with value rows
 * (value | price | + | ×). The first value is this product; + adds another value right below, which becomes a new sibling
 * product with its own price, while this product stays as it is. With one variant the price sits on each value row; with
 * several, each new combination gets its price in the list below.
 */
export default function ProcessingVarian({ value, onChange, ekstra = [], onEkstra, harga, onHarga, hargaKombinasi = {}, onHargaKombinasi }: {
  value: Varian[]; onChange: (next: Varian[]) => void
  ekstra?: NilaiBaru[][]; onEkstra?: (next: NilaiBaru[][]) => void
  harga?: string; onHarga?: (harga: string) => void
  hargaKombinasi?: Record<string, string>; onHargaKombinasi?: (next: Record<string, string>) => void
}) {
  const saran = useId()
  const satu = value.length === 1 && !!onHarga
  const ubah = (index: number, patch: Partial<Varian>) => onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  const ubahEkstra = (i: number, nilai: NilaiBaru[]) => onEkstra?.(value.map((_, j) => (j === i ? nilai : ekstra[j] ?? [])))
  const sisip = (i: number, k: number) => { const e = ekstra[i] ?? []; ubahEkstra(i, [...e.slice(0, k), { nilai: '', harga: harga ?? '' }, ...e.slice(k)]) }
  const baru = onEkstra && value.length > 1 ? kombinasiBaru(value, ekstra.map((e) => e.map((x) => x.nilai))) : []
  const hargaInput = (val: string, label: string, set: (v: string) => void) => (
    <Input className="h-9 w-24 shrink-0 sm:w-32" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Harga" aria-label={label} value={val} onChange={(e) => set(e.target.value)} />
  )
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-1 text-sm font-medium">Varian <InfoTip teks={"Kosongkan jika produk tidak punya varian. Tekan + di samping nilai untuk menambah nilai lain dari varian yang sama (misalnya ukuran lain); tiap nilai baru menjadi produk baru dengan harganya sendiri. Produk ini tetap."} /></legend>
      <datalist id={saran}>
        {SARAN_NAMA_VARIAN.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {value.map((v, i) => (
        <div key={i} className="space-y-1.5 rounded-xl border p-2">
          <div className="flex items-center gap-1.5">
            <Input className="h-9 min-w-0 flex-1" list={saran} maxLength={60} value={v.nama} placeholder="Nama varian, mis. Ukuran" aria-label={`Nama varian ${i + 1}`} onChange={(e) => ubah(i, { nama: e.target.value.toLocaleUpperCase('id') })} />
            <Button type="button" variant="ghost" size="icon" className={tombol} aria-label={`Hapus varian ${v.nama || i + 1}`} onClick={() => { onChange(value.filter((_, j) => j !== i)); onEkstra?.(ekstra.filter((_, j) => j !== i)) }}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Input className="h-9 min-w-0 flex-1" maxLength={100} value={v.nilai} placeholder="Nilai, mis. 80x40" aria-label={`Nilai ${v.nama || `varian ${i + 1}`}`} onChange={(e) => ubah(i, { nilai: e.target.value.toLocaleUpperCase('id') })} />
            {satu && hargaInput(harga ?? '', `Harga ${v.nilai || 'produk ini'}`, (h) => onHarga?.(h))}
            {onEkstra && <Button type="button" variant="outline" size="icon" className={tombol} aria-label={`Tambah nilai ${v.nama || ''}`.trim()} onClick={() => sisip(i, 0)}><Plus className="size-4" /></Button>}
            {onEkstra && <span className={tombol} aria-hidden />}
          </div>
          {(ekstra[i] ?? []).map((n, k) => (
            <div key={k} className="flex items-center gap-1.5">
              <Input className="h-9 min-w-0 flex-1" maxLength={100} value={n.nilai} placeholder="Nilai baru, mis. 100x50" aria-label={`Nilai baru ${k + 1} untuk ${v.nama || `varian ${i + 1}`}`} onChange={(e) => ubahEkstra(i, (ekstra[i] ?? []).map((x, j) => (j === k ? { ...x, nilai: e.target.value.toLocaleUpperCase('id') } : x)))} />
              {satu && hargaInput(n.harga, `Harga ${n.nilai || `nilai baru ${k + 1}`}`, (h) => ubahEkstra(i, (ekstra[i] ?? []).map((x, j) => (j === k ? { ...x, harga: h } : x))))}
              <Button type="button" variant="outline" size="icon" className={tombol} aria-label={`Tambah nilai setelah ${n.nilai || k + 1}`} onClick={() => sisip(i, k + 1)}><Plus className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={tombol} aria-label={`Hapus nilai baru ${n.nilai || k + 1}`} onClick={() => ubahEkstra(i, (ekstra[i] ?? []).filter((_, j) => j !== k))}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ))}
      <Button type="button" variant="outline" className="h-9 w-full" disabled={value.length >= MAKS_VARIAN} onClick={() => onChange([...value, { nama: '', nilai: '' }])}>
        <Plus className="size-4" /> Tambah varian
      </Button>
      {satu && (ekstra[0] ?? []).some((n) => n.nilai.trim()) && (
        <p className="text-xs text-muted-foreground" aria-live="polite">{(ekstra[0] ?? []).filter((n) => n.nilai.trim()).length} produk baru akan dibuat. Produk ini tetap.</p>
      )}
      {baru.length > 0 && (
        <div className="space-y-1.5 rounded-xl border p-2 text-sm" aria-live="polite">
          <p className="font-medium">{baru.length} produk baru akan dibuat</p>
          {baru.map((k) => {
            const kunci = kunciKombinasi(k)
            return (
              <div key={kunci} className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{labelVarian({ varian: k, ukuran: '' })}</span>
                {hargaInput(hargaKombinasi[kunci] ?? harga ?? '', `Harga ${labelVarian({ varian: k, ukuran: '' })}`, (h) => onHargaKombinasi?.({ ...hargaKombinasi, [kunci]: h }))}
              </div>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}
