import { isGroup, type Block, type Lembar } from '@/lib/sheetEngine'
import { keyNama, nameOf, RINCI_TABEL } from '@/lib/arusKasRinci'

/**
 * Display names of rows and group titles, kept in the manual sheet. They only change what is shown: totals, typed
 * figures and added rows keep using the row key and the original group label. Shop rows follow the shop name from the data.
 */
const hash = (text: string) => {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(16)
}
export const keyGrup = (tabel: string, label: string) => `c:gr-${hash(`${tabel}|${label}`)}`
export const bisaDiganti = (key: string) => !key.startsWith('shop:')

const without = (lembar: Lembar, id: string) => lembar.baris.filter((b) => b.id !== id)

/** Name a row; the original name clears the override. */
export const setNamaBaris = (lembar: Lembar, key: string, original: string, label: string): Lembar => {
  const rest = without(lembar, keyNama(key))
  return { ...lembar, baris: label === original ? rest : [...rest, { id: keyNama(key), tabel: RINCI_TABEL, grup: 'nama', label }] }
}
export const setNamaGrup = (lembar: Lembar, tabel: string, original: string, label: string): Lembar => {
  const id = keyGrup(tabel, original)
  const rest = without(lembar, id)
  return { ...lembar, baris: label === original ? rest : [...rest, { id, tabel: RINCI_TABEL, grup: `${tabel}|${original}`.slice(0, 80), label }] }
}

/** Ids of the texts that Kelola Aplikasi can change for every month at once (the per-sheet pencil still wins for its own month). */
export const idTab = (tabel: string) => `tab:${tabel}`
export const idJudul = (tabel: string) => `judul:${tabel}`
/** The tab buttons of Laporan Keuangan: [table, built-in name], in the order shown. */
export const TAB_LAPORAN: [string, string][] = [['arus_kas', 'Arus Kas'], ['pemasukan', 'Pemasukan'], ['pengeluaran', 'Pengeluaran'], ['laba_rugi', 'Laba/Rugi'], ['neraca', 'Neraca']]
export const idGrupSheet = (tabel: string, label: string) => `grupsheet:${tabel}:${label}`
export const idBaris = (key: string) => `baris:${key}`
type Teks = (id: string, bawaan: string) => string
const apa: Teks = (_id, bawaan) => bawaan

const KOSONG = '\u0000'
/**
 * Heading above a report table. The "Judul tabel" text wins; without it a renamed tab (Kelola Aplikasi "Nama tab") also
 * renames the heading, so changing the tab name changes the table it opens too. Otherwise the built-in title.
 */
export function judulTabel(t: Teks, tabel: string, bawaan: string) {
  const judul = t(idJudul(tabel), KOSONG)
  if (judul !== KOSONG) return judul
  const tab = t(idTab(tabel), KOSONG)
  return tab !== KOSONG ? tab : bawaan
}

/** Blocks with renamed rows and group titles applied. Order of precedence: Kategori Transaksi settings, the pencil of this month, Kelola Aplikasi, the built-in text. */
export function namai(blocks: Block[], lembar: Lembar, t: Teks = apa): Block[] {
  return blocks.map((block) => ({
    ...block,
    title: `${block.title.slice(0, 3)}${judulTabel(t, block.tabel, block.title.slice(3))}`,
    lines: block.lines.map((line) => {
      if (isGroup(line)) {
        if (line.dariPengaturan) return line // named in the Kategori Transaksi settings, not per sheet
        const named = lembar.baris.find((b) => b.id === keyGrup(line.tabel, line.label))?.label
        const global = t(idGrupSheet(line.tabel, line.label), line.label)
        const tampil = named ?? (global !== line.label ? global : undefined)
        return tampil ? { ...line, tampil } : line
      }
      return bisaDiganti(line.def.key) ? { ...line, def: { ...line.def, label: nameOf(lembar, line.def.key, t(idBaris(line.def.key), line.def.label)) } } : line
    }),
  }))
}
