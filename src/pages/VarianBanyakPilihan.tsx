import InfoTip from '@/components/InfoTip'
import { useEffect, useId, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MAKS_VARIAN,
  SARAN_NAMA_VARIAN,
  kombinasiVarian,
  kunciKombinasi,
  labelVarian,
  masalahGrup,
  type GrupVarian,
  type Varian,
} from '@/lib/varianProduk'

export type BarisKombinasi = { kunci: string; label: string; varian: Varian[]; sku: string; harga: string }
export type HasilVarian = { baris: BarisKombinasi[]; masalah: string | null }

const kunciNama = (nama: string) => nama.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id')
const kunciNilai = (nama: string, nilai: string) => `${kunciNama(nama)}=${nilai.replace(/\s+/g, ' ').trim()}`
const tombol = 'size-9 shrink-0'

/**
 * Variants as in a shop, kept compact for a phone: each variant is a card with its value rows (value | price | + | ×).
 * Every combination of the values becomes one product. With one variant each value carries its own price; with several
 * variants the price is set per combination in the list below; without variants there is one price.
 */
export default function VarianBanyakPilihan({ onChange }: { onChange: (hasil: HasilVarian) => void }) {
  const saran = useId()
  const [grup, setGrup] = useState<GrupVarian[]>([])
  const [sku, setSku] = useState<Record<string, string>>({})
  const [hargaSemua, setHargaSemua] = useState('')
  const [hargaNilai, setHargaNilai] = useState<Record<string, string>>({})
  const [hargaKombinasi, setHargaKombinasi] = useState<Record<string, string>>({})
  const masalah = masalahGrup(grup)
  const kombinasi = useMemo(() => (masalah ? [] : kombinasiVarian(grup)), [grup, masalah])
  // Groups typed twice under one name (Warna, Warna) count as one variant.
  const namaAktif = useMemo(() => [...new Set(grup.filter((g) => g.nama.trim() && g.nilai.some((n) => n.trim())).map((g) => kunciNama(g.nama)))], [grup])
  const perNilai = namaAktif.length === 1
  const perKombinasi = namaAktif.length > 1

  const hargaDari = (k: Varian[]): string => {
    if (perKombinasi) return hargaKombinasi[kunciKombinasi(k)] ?? ''
    if (perNilai) return k[0] ? hargaNilai[kunciNilai(k[0].nama, k[0].nilai)] ?? '' : ''
    return hargaSemua
  }
  const baris: BarisKombinasi[] = useMemo(
    () => kombinasi.map((k) => ({ kunci: kunciKombinasi(k), label: labelVarian({ varian: k, ukuran: '' }) || 'Tanpa varian', varian: k, sku: sku[kunciKombinasi(k)] ?? '', harga: hargaDari(k) })),
    [kombinasi, sku, perNilai, perKombinasi, hargaSemua, hargaNilai, hargaKombinasi],
  )
  useEffect(() => { onChange({ baris, masalah }) }, [baris, masalah, onChange])

  const ubahGrup = (i: number, patch: Partial<GrupVarian>) => setGrup((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const ubahNilai = (i: number, k: number, teks: string) => ubahGrup(i, { nilai: grup[i].nilai.map((n, j) => (j === k ? teks : n)) })
  const sisipNilai = (i: number, k: number) => ubahGrup(i, { nilai: [...grup[i].nilai.slice(0, k + 1), '', ...grup[i].nilai.slice(k + 1)] })
  const hapusNilai = (i: number, k: number) => {
    const sisa = grup[i].nilai.filter((_, j) => j !== k)
    if (sisa.length) ubahGrup(i, { nilai: sisa })
    else setGrup((g) => g.filter((_, j) => j !== i))
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1 text-sm font-medium">Varian <InfoTip teks={"Kosongkan jika produk tidak punya varian. Beri nama varian (misalnya Ukuran), lalu isi nilainya beserta harganya. Tekan + untuk nilai lain. Setiap kombinasi nilai menjadi satu produk."} /></legend>
        <datalist id={saran}>{SARAN_NAMA_VARIAN.map((n) => <option key={n} value={n} />)}</datalist>
        {grup.map((g, i) => (
          <div key={i} className="space-y-1.5 rounded-xl border p-2">
            <div className="flex items-center gap-1.5">
              <Input className="h-9 min-w-0 flex-1" list={saran} maxLength={60} value={g.nama} placeholder="Nama varian, mis. Ukuran" aria-label={`Nama varian ${i + 1}`} onChange={(e) => ubahGrup(i, { nama: e.target.value.toLocaleUpperCase('id') })} />
              <Button type="button" variant="ghost" size="icon" className={tombol} aria-label={`Hapus varian ${g.nama || i + 1}`} onClick={() => setGrup((x) => x.filter((_, j) => j !== i))}><X className="size-4" /></Button>
            </div>
            {g.nilai.map((n, k) => (
              <div key={k} className="flex items-center gap-1.5">
                <Input className="h-9 min-w-0 flex-1" maxLength={100} value={n} placeholder="Nilai, mis. 80x40" aria-label={`Nilai ${k + 1} untuk ${g.nama || `varian ${i + 1}`}`} onChange={(e) => ubahNilai(i, k, e.target.value.toLocaleUpperCase('id'))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sisipNilai(i, k) } }} />
                {perNilai && <Input className="h-9 w-24 shrink-0 sm:w-32" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Harga" aria-label={`Harga ${g.nama} ${n}`} value={hargaNilai[kunciNilai(g.nama, n)] ?? ''} onChange={(e) => setHargaNilai((h) => ({ ...h, [kunciNilai(g.nama, n)]: e.target.value }))} />}
                <Button type="button" variant="outline" size="icon" className={tombol} aria-label={`Tambah nilai setelah ${n || k + 1}`} onClick={() => sisipNilai(i, k)}><Plus className="size-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className={tombol} aria-label={`Hapus nilai ${n || k + 1}`} onClick={() => hapusNilai(i, k)}><X className="size-4" /></Button>
              </div>
            ))}
          </div>
        ))}
        <Button type="button" variant="outline" className="h-9 w-full" disabled={grup.length >= MAKS_VARIAN} onClick={() => setGrup((g) => [...g, { nama: '', nilai: [''] }])}>
          <Plus className="size-4" /> Tambah varian
        </Button>
        {masalah && grup.length > 0 && <p role="alert" className="text-sm text-destructive">{masalah}</p>}
      </fieldset>

      {!masalah && !perNilai && !perKombinasi && (
        <label className="block space-y-1 text-xs">
          <span className="block text-muted-foreground">Harga per unit (Rp), boleh dikosongkan</span>
          <Input className="h-9 w-full" type="number" min="0" step="0.01" value={hargaSemua} placeholder="Menyusul" onChange={(e) => setHargaSemua(e.target.value)} />
        </label>
      )}

      {!masalah && baris.length > 0 && (
        <section className="space-y-1.5" aria-label="Produk yang dibuat">
          <h3 className="text-sm font-medium">{baris.length > 1 ? `${baris.length} produk akan dibuat` : 'SKU produk'}</h3>
          <ul className="divide-y rounded-xl border">
            {baris.map((b) => (
              <li key={b.kunci} className="space-y-1 p-2">
                <span className="block text-sm font-medium">{b.label}</span>
                <div className="flex gap-1.5">
                  <Input className="h-9 min-w-0 flex-1" maxLength={200} value={b.sku} placeholder="SKU supplier (opsional)" aria-label={`SKU ${b.label}`} onChange={(e) => setSku((s) => ({ ...s, [b.kunci]: e.target.value.toLocaleUpperCase('id') }))} />
                  {perKombinasi && <Input className="h-9 w-24 shrink-0 sm:w-32" type="number" min="0" step="0.01" inputMode="decimal" value={b.harga} placeholder="Harga" aria-label={`Harga ${b.label}`} onChange={(e) => setHargaKombinasi((h) => ({ ...h, [b.kunci]: e.target.value }))} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
