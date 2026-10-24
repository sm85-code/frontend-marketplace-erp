import { anakDari, nameOf, splitsOf } from '@/lib/arusKasRinci'
import { GRUP_KELUAR, kategoriDari, kategoriRincian } from '@/lib/kategoriKeuangan'
import type { Lembar } from '@/lib/sheetEngine'
import type { KategoriTransaksi } from '@/api/kategori'

export type BarisPilihan = { id: string; nama: string; kategori: string; kategoriLabel: string; cocok: boolean }

const kecil = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id-ID')

/** Would the automatic match pick this row for the party: same name, name in brackets, or bracketed short name inside it. */
export function cocokOtomatis(namaBaris: string, pihak: string): boolean {
  const b = kecil(namaBaris)
  const p = kecil(pihak)
  if (!p) return false
  if (b === p) return true
  const isi = /\[([^\]]+)\]/.exec(namaBaris)?.[1]
  if (!isi) return false
  const k = kecil(isi)
  return k === p || (k.length >= 3 && p.includes(k))
}

/**
 * The Kas keluar rows (and sub-rows) added in Arus Kas that a supplier / tukang can be linked to, with their category.
 * Rows of the page's own categories come first, then by name.
 */
export function barisKasKeluar(lembar: Lembar, daftar: KategoriTransaksi[], kategoriHalaman: Set<string>): Omit<BarisPilihan, 'cocok'>[] {
  const label = (id: string) => daftar.find((k) => k.id === id)?.nama ?? id
  const out: Omit<BarisPilihan, 'cocok'>[] = []
  for (const b of splitsOf(lembar)) {
    if (b.grup !== GRUP_KELUAR) continue
    const kat = kategoriDari(lembar, b.id, GRUP_KELUAR, daftar)
    out.push({ id: b.id, nama: nameOf(lembar, b.id, b.label), kategori: kat, kategoriLabel: label(kat) })
    for (const a of anakDari(lembar, b.id)) {
      const ka = kategoriRincian(lembar, a.id, b.id, GRUP_KELUAR, daftar)
      out.push({ id: a.id, nama: nameOf(lembar, a.id, a.label), kategori: ka, kategoriLabel: label(ka) })
    }
  }
  return out.sort((x, y) => Number(kategoriHalaman.has(y.kategori)) - Number(kategoriHalaman.has(x.kategori)) || x.nama.localeCompare(y.nama, 'id-ID'))
}
