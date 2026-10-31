import { anakDari, hidden, nameOf, splitsOf } from '@/lib/arusKasRinci'
import { isGroup, type Block, type Line } from '@/lib/sheetEngine'
import { GRUP_KELUAR, kategoriDari, kategoriRincian } from '@/lib/kategoriKeuangan'
import type { Lembar } from '@/lib/sheetEngine'
import type { KategoriTransaksi } from '@/api/kategori'

export type BarisPilihan = { id: string; nama: string; kategori: string; kategoriLabel: string; cocok: boolean }

const kecil = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id-ID')

/** Exact names beat whole-word nicknames, which beat historical substring aliases (MAHPUDIN -> PUDIN). */
export function prioritasNama(namaBaris: string, pihak: string): number {
  const b = kecil(namaBaris), p = kecil(pihak)
  if (!p) return 0
  const k = kecil(/\[([^\]]+)\]/.exec(namaBaris)?.[1] ?? '')
  if (b === p || k === p) return 3
  if (k.length < 3) return 0
  if (p.split(/[^\p{L}\p{N}]+/u).includes(k)) return 2
  return p.includes(k) ? 1 : 0
}

export const cocokOtomatis = (namaBaris: string, pihak: string): boolean => prioritasNama(namaBaris, pihak) > 0

/**
 * The Kas keluar rows (and sub-rows) added in Arus Kas that a supplier / tukang can be linked to, with their category.
 * Rows of the page's own categories come first, then by name.
 */
export function barisKasKeluar(lembar: Lembar, daftar: KategoriTransaksi[], kategoriHalaman: Set<string>, arus?: Block): Omit<BarisPilihan, 'cocok'>[] {
  const label = (id: string) => daftar.find((k) => k.id === id)?.nama ?? id
  const out: Omit<BarisPilihan, 'cocok'>[] = []
  const tambah = (id: string, nama: string) => {
    const kat = kategoriDari(lembar, id, GRUP_KELUAR, daftar)
    out.push({ id, nama, kategori: kat, kategoriLabel: label(kat) })
    for (const a of anakDari(lembar, id)) {
      const ka = kategoriRincian(lembar, a.id, id, GRUP_KELUAR, daftar)
      out.push({ id: a.id, nama: nameOf(lembar, a.id, a.label), kategori: ka, kategoriLabel: label(ka) })
    }
  }
  // The report's own Kas keluar rows (often renamed, e.g. "Tukang Kayu [JOKO]"), then the rows added by hand.
  let grup = ''
  for (const l of arus?.lines ?? []) {
    if (isGroup(l)) grup = l.label
    else if (grup === GRUP_KELUAR && !(l as Line).def.emphasis && !hidden(lembar, l.def.key)) tambah(l.def.key, nameOf(lembar, l.def.key, l.def.label))
  }
  for (const b of splitsOf(lembar)) if (b.grup === GRUP_KELUAR) tambah(b.id, nameOf(lembar, b.id, b.label))
  return out.sort((x, y) => Number(kategoriHalaman.has(y.kategori)) - Number(kategoriHalaman.has(x.kategori)) || x.nama.localeCompare(y.nama, 'id-ID'))
}

/** The row the automatic match fills for a party: same name or same name in brackets first, else a short bracketed name inside it. */
export function barisOtomatis<T extends { nama: string }>(pilihan: T[], pihak: string): T | undefined {
  let hasil: T | undefined
  let terbaik = 0
  for (const b of pilihan) {
    const nilai = prioritasNama(b.nama, pihak)
    if (nilai > terbaik) { hasil = b; terbaik = nilai }
  }
  return hasil
}
