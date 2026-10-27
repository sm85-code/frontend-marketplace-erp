import { anakDari, hidden, keyKategori, keyNilaiDasar, nameOf, splitsOf } from '@/lib/arusKasRinci'
import { GRUP_KELUAR, kategoriDari, kategoriRincian } from '@/lib/kategoriKeuangan'
import { isGroup, type Block, type Lembar, type Line } from '@/lib/sheetEngine'
import type { KategoriTransaksi } from '@/api/kategori'

/** Sheet key prefix of the Transfer antar kas row "Belanja dibayar dari Kas Kecil" (sheetSections: tr_kk). */
export const KEY_BELANJA_KAS_KECIL = 'rb:tr_kk'
/** Sheet key prefix of "Isi ulang Kas Kecil dari Kas Utama (−)" (sheetSections: tr_packing), shown negative. */
export const KEY_ISI_ULANG_KAS_KECIL = 'rb:tr_packing'

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
  const kasKecil = new Set(daftar.filter((k) => k.kas_kecil).map((k) => k.id))
  const sel = { ...lembar.sel }
  // Entries paid out of Kas Kecil: still an expense in their Kas keluar row, but Kas Utama gets them back in Transfer antar
  // kas ("Belanja dibayar dari Kas Kecil") and Kas Kecil goes down by them instead.
  const kecil = new Map<string, number>()
  for (const it of items) {
    if (!kasKecil.has(it.kategori)) continue
    const w = indeksPeriode(days, it.tanggal)
    if (w < 0) continue
    const key = `${KEY_BELANJA_KAS_KECIL}|${days[w]}`
    kecil.set(key, Math.round(((kecil.get(key) ?? 0) + Number(it.jumlah)) * 100) / 100)
  }
  // Kas Kecil spending is paid out of Kas Kecil: it no longer fills a give-back in Transfer antar kas nor an automatic top-up
  // equal to it (only a top-up actually typed in moves money out of Kas Utama). Its rows are taken out of Kas keluar and
  // shown as "Belanja Kas Kecil" (see kunciKasKecil / applyRinci); Laba/Rugi still counts them as expenses.
  void kecil
  if (!tempat.size) return { ...lembar, sel }
  // Belanja Supplier: an entry whose description is a supplier's name goes to the Arus Kas row (or sub-row) of the same
  // category named after that supplier, so each supplier has its own row; all of them still add up in the one category.
  const halamanSupplier = new Set(daftar.filter((k) => k.operasional === 'supplier' || k.operasional === 'tukang').map((k) => k.id))
  const total = new Map<string, number>()
  for (const it of items) {
    // A supplier / tukang set to "tidak disambung" (its entries come with uraian '-') goes to no row.
    if (halamanSupplier.has(it.kategori) && it.uraian === '-') continue
    const prefix = (halamanSupplier.has(it.kategori) && it.uraian ? cari(it.kategori, it.uraian) : undefined) ?? tempat.get(it.kategori)
    const w = indeksPeriode(days, it.tanggal)
    if (prefix === undefined || w < 0) continue
    const key = `${prefix}|${days[w]}`
    total.set(key, Math.round(((total.get(key) ?? 0) + Number(it.jumlah)) * 100) / 100)
  }
  for (const [key, value] of total) if (sel[key] === undefined && value > 0) sel[key] = String(value)
  return { ...lembar, sel }
}

/**
 * Kas keluar rows (and rows added there by hand) that hold only Kas Kecil spending: each of their categories (their own, or
 * every sub-row's) is marked "Dibayar dari Kas Kecil". They are paid out of Kas Kecil, not Kas Utama.
 */
export function kunciKasKecil(lembar: Lembar, arus: Block, daftar: KategoriTransaksi[]): Set<string> {
  const kecil = new Set(daftar.filter((k) => k.kas_kecil).map((k) => k.id))
  const out = new Set<string>()
  if (!kecil.size) return out
  let grup = ''
  const keys: string[] = []
  for (const l of arus.lines) {
    if (isGroup(l)) grup = l.label
    else if (grup === GRUP_KELUAR && !(l as Line).def.emphasis && !(l as Line).def.induk) keys.push(l.def.key)
  }
  for (const b of splitsOf(lembar)) if (b.grup === GRUP_KELUAR && !keys.includes(b.id)) keys.push(b.id)
  for (const key of keys) {
    const anak = anakDari(lembar, key)
    const kat = anak.length ? anak.map((a) => kategoriRincian(lembar, a.id, key, GRUP_KELUAR, daftar)) : [kategoriDari(lembar, key, GRUP_KELUAR, daftar)]
    if (kat.every((k) => kecil.has(k))) out.add(key)
  }
  return out
}
