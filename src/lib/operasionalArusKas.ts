import { anakDari, hidden, keyKategori, keyNilaiDasar, nameOf, splitsOf } from '@/lib/arusKasRinci'
import { GRUP_KELUAR, kategoriDari, kategoriRincian } from '@/lib/kategoriKeuangan'
import { isGroup, type Block, type Lembar, type Line } from '@/lib/sheetEngine'
import type { KategoriTransaksi } from '@/api/kategori'

export type OperasionalItem = { tanggal: string; kategori: string; jumlah: string; uraian?: string }

/** Gaji and iklan are typed into Arus Kas itself, never taken from the Operasional pages. */
const DIINPUT_DI_ARUS_KAS = new Set(['gaji', 'iklan'])

/** The categories whose Operasional entries Arus Kas can take in. */
export const kategoriOperasional = (daftar: KategoriTransaksi[]) => daftar.filter((k) => k.arah === 'keluar' && k.operasional !== null && !DIINPUT_DI_ARUS_KAS.has(k.id))

/** Index of the period (a report date closes it) that holds a date: after the previous one, up to and including its own. */
export function indeksPeriode(days: string[], tanggal: string): number {
  return days.findIndex((d, i) => tanggal <= d && (i === 0 || tanggal > days[i - 1]))
}

/**
 * Where the amount of each category lands: in the row (or sub-row, for a row broken down into sub-rows) of Kas keluar that
 * was given that category, the first one in table order when several were. Rows and sub-rows added by hand always count; a
 * row Arus Kas started with only counts once a category was chosen for it. Hidden rows are skipped. A category no row was
 * given stays unused. Each place is the prefix of the sheet's keys for that row (`<prefix>|<date>`).
 */
const kunciNama = (kategori: string, nama: string) => `${kategori}|${nama.trim().toLocaleLowerCase('id-ID')}`

function tempatBaris(lembar: Lembar, arus: Block, daftar: KategoriTransaksi[]) {
  const dipakai = new Set(kategoriOperasional(daftar).map((k) => k.id))
  const hasil = new Map<string, string>()
  const perNama = new Map<string, string>()
  const kurung = new Map<string, { kunci: string; prefix: string }[]>()
  const catat = (kategori: string, prefix: string, nama: string) => {
    if (!dipakai.has(kategori)) return
    if (!hasil.has(kategori)) hasil.set(kategori, prefix)
    const k = kunciNama(kategori, nama)
    if (!perNama.has(k)) perNama.set(k, prefix)
    // "Tagihan Produk [YUNI]": the name in brackets also identifies the row.
    const isi = /\[([^\]]+)\]/.exec(nama)?.[1]?.trim()
    if (isi) {
      const kb = kunciNama(kategori, isi)
      if (!perNama.has(kb)) perNama.set(kb, prefix)
      kurung.set(kategori, [...(kurung.get(kategori) ?? []), { kunci: isi.toLocaleLowerCase('id-ID'), prefix }])
    }
  }
  const dipilih = (key: string) => lembar.baris.some((b) => b.id === keyKategori(key))
  const baris: { key: string; prefix: string; bawaan: boolean; nama: string }[] = []
  let grup = ''
  for (const l of arus.lines) {
    if (isGroup(l)) grup = l.label
    else if (grup === GRUP_KELUAR && !(l as Line).def.emphasis && !hidden(lembar, l.def.key)) baris.push({ key: l.def.key, prefix: keyNilaiDasar(l.def.key), bawaan: true, nama: nameOf(lembar, l.def.key, l.def.label) })
  }
  for (const b of splitsOf(lembar)) if (b.grup === GRUP_KELUAR) baris.push({ key: b.id, prefix: b.id, bawaan: false, nama: nameOf(lembar, b.id, b.label) })
  for (const r of baris) {
    const anak = anakDari(lembar, r.key)
    if (anak.length) for (const a of anak) catat(kategoriRincian(lembar, a.id, r.key, GRUP_KELUAR, daftar), a.id, nameOf(lembar, a.id, a.label))
    else if (!r.bawaan || dipilih(r.key)) catat(kategoriDari(lembar, r.key, GRUP_KELUAR, daftar), r.prefix, r.nama)
  }
  /** Row for a party name: same name, same name in brackets, or a bracketed short name inside it ("[PUDIN]" for MAHPUDIN). */
  const cari = (kategori: string, uraian: string): string | undefined => {
    const tepat = perNama.get(kunciNama(kategori, uraian))
    if (tepat) return tepat
    const u = uraian.trim().toLocaleLowerCase('id-ID')
    return u ? (kurung.get(kategori) ?? []).find((x) => x.kunci.length >= 3 && u.includes(x.kunci))?.prefix : undefined
  }
  return { hasil, perNama, cari }
}

export function barisUntukKategori(lembar: Lembar, arus: Block, daftar: KategoriTransaksi[]): Map<string, string> {
  return tempatBaris(lembar, arus, daftar).hasil
}

/**
 * The sheet as it is shown: the totals of the Operasional entries stand in the row chosen for each category (see
 * barisUntukKategori) and period, unless that cell has a figure typed by hand, which always wins.
 */
export function denganOperasional(lembar: Lembar, days: string[], items: OperasionalItem[], daftar: KategoriTransaksi[], arus: Block): Lembar {
  const { hasil: tempat, cari } = tempatBaris(lembar, arus, daftar)
  if (!tempat.size) return lembar
  // Belanja Supplier: an entry whose description is a supplier's name goes to the Arus Kas row (or sub-row) of the same
  // category named after that supplier, so each supplier has its own row; all of them still add up in the one category.
  const halamanSupplier = new Set(daftar.filter((k) => k.operasional === 'supplier' || k.operasional === 'tukang').map((k) => k.id))
  const total = new Map<string, number>()
  for (const it of items) {
    const prefix = (halamanSupplier.has(it.kategori) && it.uraian ? cari(it.kategori, it.uraian) : undefined) ?? tempat.get(it.kategori)
    const w = indeksPeriode(days, it.tanggal)
    if (prefix === undefined || w < 0) continue
    const key = `${prefix}|${days[w]}`
    total.set(key, Math.round(((total.get(key) ?? 0) + Number(it.jumlah)) * 100) / 100)
  }
  const sel = { ...lembar.sel }
  for (const [key, value] of total) if (sel[key] === undefined && value > 0) sel[key] = String(value)
  return { ...lembar, sel }
}
