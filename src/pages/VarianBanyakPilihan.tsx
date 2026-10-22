import { useEffect, useId, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fmtRp } from '@/api/client'
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

/**
 * Variants as in a shop: name each variant once and list its choices (Jenis: Basah, Kering). Every combination of the choices
 * becomes one product, each with its own SKU and price in the table below.
 */
export default function VarianBanyakPilihan({ onChange }: { onChange: (hasil: HasilVarian) => void }) {
  const saran = useId()
  const [grup, setGrup] = useState<GrupVarian[]>([])
  const [isian, setIsian] = useState<Record<string, { sku: string; harga: string }>>({})
  const [satuHarga, setSatuHarga] = useState('')
  const [baru, setBaru] = useState<string[]>([])
  const masalah = masalahGrup(grup)
  const kombinasi = useMemo(() => (masalah ? [] : kombinasiVarian(grup)), [grup, masalah])
  const baris: BarisKombinasi[] = useMemo(
    () => kombinasi.map((k) => ({ kunci: kunciKombinasi(k), label: labelVarian({ varian: k, ukuran: '' }) || 'Tanpa varian', varian: k, sku: isian[kunciKombinasi(k)]?.sku ?? '', harga: isian[kunciKombinasi(k)]?.harga ?? '' })),
    [kombinasi, isian],
  )
  useEffect(() => { onChange({ baris, masalah }) }, [baris, masalah, onChange])

  const ubahGrup = (i: number, patch: Partial<GrupVarian>) => setGrup((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const tambahNilai = (i: number) => {
    const teks = (baru[i] ?? '').replace(/\s+/g, ' ').trim()
    if (!teks) return
    const sudah = grup[i].nilai.some((n) => n.toLocaleLowerCase('id') === teks.toLocaleLowerCase('id'))
    if (!sudah) ubahGrup(i, { nilai: [...grup[i].nilai, teks] })
    setBaru((b) => b.map((x, j) => (j === i ? '' : x)))
  }
  const ubahBaris = (kunci: string, patch: Partial<{ sku: string; harga: string }>) =>
    setIsian((s) => ({ ...s, [kunci]: { sku: s[kunci]?.sku ?? '', harga: s[kunci]?.harga ?? '', ...patch } }))

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Varian</legend>
        <p className="text-xs text-muted-foreground">Kosongkan jika produk tidak punya varian. Beri nama varian (misalnya Jenis), lalu isi pilihannya (Basah, Kering). Setiap kombinasi pilihan menjadi satu produk.</p>
        <datalist id={saran}>{SARAN_NAMA_VARIAN.map((n) => <option key={n} value={n} />)}</datalist>
        {grup.map((g, i) => (
          <div key={i} className="space-y-2 rounded-xl border p-3">
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1 text-xs">
                <span className="block text-muted-foreground">Nama varian</span>
                <Input list={saran} maxLength={60} value={g.nama} placeholder="Jenis" onChange={(e) => ubahGrup(i, { nama: e.target.value })} />
              </label>
              <Button type="button" variant="ghost" size="icon" aria-label={`Hapus varian ${g.nama || i + 1}`} onClick={() => setGrup((x) => x.filter((_, j) => j !== i))}><X className="size-4" /></Button>
            </div>
            <div className="space-y-1 text-xs">
              <span className="block text-muted-foreground">Pilihan</span>
              {g.nilai.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {g.nilai.map((n) => (
                    <li key={n} className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm">
                      {n}
                      <button type="button" className="grid size-6 place-items-center rounded-full hover:bg-background" aria-label={`Hapus pilihan ${n}`} onClick={() => ubahGrup(i, { nilai: g.nilai.filter((x) => x !== n) })}><X className="size-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  className="min-w-0 flex-1"
                  maxLength={100}
                  value={baru[i] ?? ''}
                  placeholder="Ketik pilihan, lalu Enter"
                  aria-label={`Tambah pilihan untuk ${g.nama || `varian ${i + 1}`}`}
                  onChange={(e) => setBaru((b) => { const n = [...b]; n[i] = e.target.value; return n })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); tambahNilai(i) } }}
                />
                <Button type="button" variant="outline" onClick={() => tambahNilai(i)} disabled={!(baru[i] ?? '').trim()}>Tambah</Button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={grup.length >= MAKS_VARIAN} onClick={() => setGrup((g) => [...g, { nama: '', nilai: [] }])}>
          <Plus className="size-4" /> Tambah varian
        </Button>
        {masalah && grup.length > 0 && <p role="alert" className="text-sm text-destructive">{masalah}</p>}
      </fieldset>

      {!masalah && baris.length > 0 && (
        <section className="space-y-2" aria-label="Kombinasi produk">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-medium">{baris.length > 1 ? `${baris.length} produk akan dibuat` : 'SKU dan harga'}</h3>
            {baris.length > 1 && (
              <div className="flex items-end gap-2">
                <label className="space-y-1 text-xs"><span className="block text-muted-foreground">Satu harga untuk semua</span>
                  <Input type="number" min="0" step="0.01" className="w-32" value={satuHarga} onChange={(e) => setSatuHarga(e.target.value)} /></label>
                <Button type="button" variant="outline" disabled={satuHarga === ''} onClick={() => setIsian((s) => Object.fromEntries(baris.map((b) => [b.kunci, { sku: s[b.kunci]?.sku ?? '', harga: satuHarga }])))}>Terapkan</Button>
              </div>
            )}
          </div>
          <ul className="divide-y rounded-xl border">
            {baris.map((b) => (
              <li key={b.kunci} className="space-y-2 p-3">
                <div className="text-sm font-medium">{b.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs"><span className="block text-muted-foreground">SKU supplier (opsional)</span>
                    <Input maxLength={200} value={b.sku} onChange={(e) => ubahBaris(b.kunci, { sku: e.target.value })} /></label>
                  <label className="space-y-1 text-xs"><span className="block text-muted-foreground">Harga per unit (Rp)</span>
                    <Input type="number" min="0" step="0.01" value={b.harga} placeholder="Menyusul" onChange={(e) => ubahBaris(b.kunci, { harga: e.target.value })} /></label>
                </div>
                {b.harga !== '' && <p className="text-xs text-muted-foreground">{fmtRp(b.harga)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
