import type { KategoriTransaksi } from '@/api/kategori'
import { GRUP_KELUAR, kategoriDari } from '@/lib/kategoriKeuangan'
import { RINCI_TABEL } from '@/lib/arusKasRinci'
import { isGroup, type Block, type Lembar, type Line } from '@/lib/sheetEngine'

/** The place of a Kas keluar row among the rows of its category, set with its up / down buttons (kept in the sheet). */
export const keyUrut = (key: string) => `c:ur-${key.replace(/[^\w-]/g, '_')}`

type Potong = { parent: Line; kids: Line[]; asal: number }

function potong(block: Block): { awal: number; akhir: number; bagian: Potong[] } | null {
  const awal = block.lines.findIndex((l) => isGroup(l) && l.label === GRUP_KELUAR)
  if (awal < 0) return null
  let akhir = awal + 1
  while (akhir < block.lines.length && !isGroup(block.lines[akhir]) && !(block.lines[akhir] as Line).def.emphasis) akhir++
  const bagian: Potong[] = []
  for (let i = awal + 1; i < akhir; i++) {
    const l = block.lines[i] as Line
    if (l.def.induk && bagian.length) bagian[bagian.length - 1].kids.push(l)
    else bagian.push({ parent: l, kids: [], asal: bagian.length })
  }
  return { awal, akhir, bagian }
}

const urutKategori = (daftar: KategoriTransaksi[]) => {
  const keluar = daftar.filter((k) => k.arah === 'keluar').sort((a, b) => a.urut - b.urut)
  return new Map(keluar.map((k, i) => [k.id, i]))
}

/**
 * Kas keluar rows in the order of their categories on Kategori Transaksi, then (within one category) the order set with
 * the up / down buttons, then their own order. Sub-rows stay under their row. Only the order changes, never a figure.
 */
export function urutkanKasKeluar(block: Block, lembar: Lembar, daftar: KategoriTransaksi[]): Block {
  const p = potong(block)
  if (!p) return block
  const posisi = urutKategori(daftar)
  const nilai = (key: string) => {
    const b = lembar.baris.find((x) => x.id === keyUrut(key))
    return b && Number.isFinite(Number(b.label)) ? Number(b.label) : Number.POSITIVE_INFINITY
  }
  const kunci = (x: Potong) => [posisi.get(kategoriDari(lembar, x.parent.def.key, GRUP_KELUAR, daftar)) ?? Number.POSITIVE_INFINITY, nilai(x.parent.def.key), x.asal]
  const urut = [...p.bagian].sort((a, b) => {
    const [ka, kb] = [kunci(a), kunci(b)]
    for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1
    return 0
  })
  const lines = [...block.lines.slice(0, p.awal + 1), ...urut.flatMap((x) => [x.parent, ...x.kids]), ...block.lines.slice(p.akhir)]
  return { ...block, lines }
}

/** The rows of the same category as `key`, in their shown order (of an already ordered block). */
export function sekategori(block: Block, lembar: Lembar, daftar: KategoriTransaksi[], key: string): string[] {
  const p = potong(block)
  if (!p) return []
  const kat = (k: string) => kategoriDari(lembar, k, GRUP_KELUAR, daftar)
  const ini = p.bagian.find((x) => x.parent.def.key === key)
  if (!ini) return []
  const k = kat(key)
  return p.bagian.filter((x) => kat(x.parent.def.key) === k).map((x) => x.parent.def.key)
}

/** Move a row one place up (-1) or down (+1) among the rows of its category; every row of that category gets its place saved. */
export function geser(block: Block, lembar: Lembar, daftar: KategoriTransaksi[], key: string, arah: -1 | 1): Lembar | null {
  const daftarKey = sekategori(block, lembar, daftar, key)
  const i = daftarKey.indexOf(key)
  const j = i + arah
  if (i < 0 || j < 0 || j >= daftarKey.length) return null
  ;[daftarKey[i], daftarKey[j]] = [daftarKey[j], daftarKey[i]]
  const ids = new Set(daftarKey.map(keyUrut))
  return {
    ...lembar,
    baris: [...lembar.baris.filter((b) => !ids.has(b.id)), ...daftarKey.map((k, n) => ({ id: keyUrut(k), tabel: RINCI_TABEL, grup: 'urutan', label: String(n + 1) }))],
  }
}
