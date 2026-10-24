import InfoTip from '@/components/InfoTip'
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

/** How the price is decided: one price for all, a price per choice of one variant, or a price for each combination. */
type CaraHarga = 'semua' | 'kombinasi' | `g:${string}`
const kunciNama = (nama: string) => nama.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id')
const kunciNilai = (nama: string, nilai: string) => `${kunciNama(nama)}=${nilai}`

/**
 * Variants as in a shop: name each variant once and list its choices (Jenis: Basah, Kering). Every combination of the choices
 * becomes one product. The price follows what the seller says: the same for all, different by the choices of one variant
 * (say Ukuran), or set for each combination.
 */
export default function VarianBanyakPilihan({ onChange }: { onChange: (hasil: HasilVarian) => void }) {
  const saran = useId()
  const [grup, setGrup] = useState<GrupVarian[]>([])
  const [sku, setSku] = useState<Record<string, string>>({})
  const [cara, setCara] = useState<CaraHarga>('semua')
  const [hargaSemua, setHargaSemua] = useState('')
  const [hargaNilai, setHargaNilai] = useState<Record<string, string>>({})
  const [hargaKombinasi, setHargaKombinasi] = useState<Record<string, string>>({})
  const [baru, setBaru] = useState<string[]>([])
  const masalah = masalahGrup(grup)
  const kombinasi = useMemo(() => (masalah ? [] : kombinasiVarian(grup)), [grup, masalah])
  // Groups typed twice under one name (Warna, Warna) count as one variant with all their choices.
  const grupAktif = useMemo(() => {
    const satu = new Map<string, GrupVarian>()
    for (const g of grup) {
      if (!g.nama.trim() || !g.nilai.length) continue
      const ada = satu.get(kunciNama(g.nama))
      if (ada) satu.set(kunciNama(g.nama), { ...ada, nilai: [...ada.nilai, ...g.nilai.filter((n) => !ada.nilai.includes(n))] })
      else satu.set(kunciNama(g.nama), g)
    }
    return [...satu.values()]
  }, [grup])
  // A way of pricing by a variant that was removed or renamed falls back to one price for all.
  const caraNyata: CaraHarga = cara.startsWith('g:') && !grupAktif.some((g) => `g:${kunciNama(g.nama)}` === cara) ? 'semua' : cara

  const hargaDari = (k: Varian[], dengan: CaraHarga): string => {
    if (dengan === 'semua') return hargaSemua
    if (dengan === 'kombinasi') return hargaKombinasi[kunciKombinasi(k)] ?? ''
    const nama = dengan.slice(2)
    const v = k.find((x) => kunciNama(x.nama) === nama)
    return v ? hargaNilai[kunciNilai(v.nama, v.nilai)] ?? '' : ''
  }
  const baris: BarisKombinasi[] = useMemo(
    () => kombinasi.map((k) => ({ kunci: kunciKombinasi(k), label: labelVarian({ varian: k, ukuran: '' }) || 'Tanpa varian', varian: k, sku: sku[kunciKombinasi(k)] ?? '', harga: hargaDari(k, caraNyata) })),
    [kombinasi, sku, caraNyata, hargaSemua, hargaNilai, hargaKombinasi],
  )
  useEffect(() => { onChange({ baris, masalah }) }, [baris, masalah, onChange])

  // Switching to a price for each combination starts from the prices already set, so only the odd ones need a change.
  const pilihCara = (baruCara: CaraHarga) => {
    if (baruCara === 'kombinasi' && caraNyata !== 'kombinasi')
      setHargaKombinasi((h) => Object.fromEntries([...Object.entries(h), ...kombinasi.filter((k) => !h[kunciKombinasi(k)]).map((k) => [kunciKombinasi(k), hargaDari(k, caraNyata)] as const)]))
    setCara(baruCara)
  }
  const ubahGrup = (i: number, patch: Partial<GrupVarian>) => setGrup((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const tambahNilai = (i: number) => {
    const teks = (baru[i] ?? '').replace(/\s+/g, ' ').trim()
    if (!teks) return
    const sudah = grup[i].nilai.some((n) => n.toLocaleLowerCase('id') === teks.toLocaleLowerCase('id'))
    if (!sudah) ubahGrup(i, { nilai: [...grup[i].nilai, teks] })
    setBaru((b) => b.map((x, j) => (j === i ? '' : x)))
  }
  const cabang = grupAktif.length > 0 && !masalah
  const grupHarga = caraNyata.startsWith('g:') ? grupAktif.find((g) => `g:${kunciNama(g.nama)}` === caraNyata) : undefined
  const inputHarga = 'w-full'

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Varian</legend>
        <InfoTip teks={"Kosongkan jika produk tidak punya varian. Beri nama varian (misalnya Jenis), lalu isi pilihannya (Basah, Kering). Setiap kombinasi pilihan menjadi satu produk."} />
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

      {!masalah && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Harga per unit (Rp)</legend>
          {cabang && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cara menentukan harga">
              <Button type="button" size="sm" variant={caraNyata === 'semua' ? 'default' : 'outline'} aria-pressed={caraNyata === 'semua'} onClick={() => pilihCara('semua')}>Sama untuk semua</Button>
              {grupAktif.map((g) => (
                <Button key={g.nama} type="button" size="sm" variant={caraNyata === `g:${kunciNama(g.nama)}` ? 'default' : 'outline'} aria-pressed={caraNyata === `g:${kunciNama(g.nama)}`} onClick={() => pilihCara(`g:${kunciNama(g.nama)}`)}>Beda per {g.nama.trim()}</Button>
              ))}
              {grupAktif.length > 1 && <Button type="button" size="sm" variant={caraNyata === 'kombinasi' ? 'default' : 'outline'} aria-pressed={caraNyata === 'kombinasi'} onClick={() => pilihCara('kombinasi')}>Beda tiap kombinasi</Button>}
            </div>
          )}
          {caraNyata === 'semua' && (
            <label className="block space-y-1 text-xs">
              <span className="block text-muted-foreground">{baris.length > 1 ? `Berlaku untuk ${baris.length} produk. Boleh dikosongkan, harga menyusul.` : 'Boleh dikosongkan, harga menyusul.'}</span>
              <Input className={inputHarga} type="number" min="0" step="0.01" value={hargaSemua} placeholder="Menyusul" onChange={(e) => setHargaSemua(e.target.value)} />
            </label>
          )}
          {grupHarga && (
            <ul className="divide-y rounded-xl border">
              {grupHarga.nilai.map((n) => (
                <li key={n} className="flex items-center justify-between gap-3 p-3">
                  <span className="min-w-0 text-sm font-medium">{grupHarga.nama.trim()}: {n}</span>
                  <Input className="w-36" type="number" min="0" step="0.01" aria-label={`Harga ${grupHarga.nama.trim()} ${n}`} value={hargaNilai[kunciNilai(grupHarga.nama, n)] ?? ''} placeholder="Menyusul" onChange={(e) => setHargaNilai((h) => ({ ...h, [kunciNilai(grupHarga.nama, n)]: e.target.value }))} />
                </li>
              ))}
            </ul>
          )}
          {caraNyata === 'kombinasi' && <InfoTip teks={"Isi harga tiap kombinasi di daftar di bawah. Harga awalnya diambil dari pilihan sebelumnya."} />}
        </fieldset>
      )}

      {!masalah && baris.length > 0 && (
        <section className="space-y-2" aria-label="Produk yang dibuat">
          <h3 className="text-sm font-medium">{baris.length > 1 ? `${baris.length} produk akan dibuat` : 'SKU produk'}</h3>
          <ul className="divide-y rounded-xl border">
            {baris.map((b) => (
              <li key={b.kunci} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium">{b.label}</span>
                  {caraNyata !== 'kombinasi' && <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{b.harga === '' ? 'Harga menyusul' : fmtRp(b.harga)}</span>}
                </div>
                <div className={caraNyata === 'kombinasi' ? 'grid grid-cols-2 gap-2' : ''}>
                  <label className="space-y-1 text-xs"><span className="block text-muted-foreground">SKU supplier (opsional)</span>
                    <Input maxLength={200} value={b.sku} onChange={(e) => setSku((s) => ({ ...s, [b.kunci]: e.target.value }))} /></label>
                  {caraNyata === 'kombinasi' && (
                    <label className="space-y-1 text-xs"><span className="block text-muted-foreground">Harga (Rp)</span>
                      <Input type="number" min="0" step="0.01" value={b.harga} placeholder="Menyusul" onChange={(e) => setHargaKombinasi((h) => ({ ...h, [b.kunci]: e.target.value }))} /></label>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
