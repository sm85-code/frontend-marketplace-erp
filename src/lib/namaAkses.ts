import type { HalamanDef } from '@/api/types'
import { GRUP_NAV, idGrup, NAV } from '@/config/nav'
import { namaMenu, namaMenuBawaan } from '@/lib/namaMenu'

type Teks = (id: string, bawaan: string) => string

/**
 * Which menu (its path) holds each page of the permission list. A menu can hold several pages: `halaman` may list them
 * with '|', and `halamanLain` names the extra pages it needs (Kelola Aplikasi holds the Kategori Transaksi tab). The
 * wildcard '*' (Profil Saya) is never a permission page.
 */
export function petaMenuHalaman(items = NAV): Record<string, string[]> {
  const peta: Record<string, string[]> = {}
  for (const n of items) {
    for (const k of [n.halaman, ...n.halaman.split('|'), ...(n.halamanLain ?? [])]) {
      if (!k || k === '*') continue
      const isi = (peta[k] ??= [])
      if (!isi.includes(n.to)) isi.push(n.to)
    }
  }
  return peta
}

const PETA = petaMenuHalaman()

/**
 * Pages the role table never lists. "Pengaturan push Shopee" is an internal page (the Shopee push settings and their
 * log; only the roles that already have it can open it): the admin does not hand it out from here, so its row is left
 * out of the table. A role that already has it keeps it — the value still travels back on save, it is just not shown.
 */
const TAK_DITAMPILKAN = new Set(['push_shopee'])

/** The rows the role table offers for editing: the server's list without the pages kept out of it. */
export function halamanTampil(halaman: HalamanDef[]): HalamanDef[] {
  return halaman.filter((h) => !TAK_DITAMPILKAN.has(h.id))
}

/** The group a permission row belongs to: the id the server sends, falling back to its older group text. */
export const kunciGrup = (h: HalamanDef) => h.grup_id ?? h.grup

/**
 * A group title on the role table. The id is the sidebar group of the app, so this is exactly the text the admin set
 * on Kelola Aplikasi (id `grup:<id>`) — renaming a group there renames it here too. A group the app does not know (an
 * older server sending a plain text) is shown as it came.
 */
export function namaGrupAkses(t: Teks, kunci: string): string {
  const g = GRUP_NAV.find((x) => x.id === kunci)
  return g ? t(idGrup(g.id), g.label) : kunci
}

/** Sidebar order first. A group the app does not know goes last, keeping the order the server sent. */
export function urutGrupAkses(keys: string[]): string[] {
  const urut: string[] = GRUP_NAV.map((g) => g.id)
  return [...keys].sort((a, b) => {
    const ia = urut.indexOf(a)
    const ib = urut.indexOf(b)
    if (ia < 0 && ib < 0) return keys.indexOf(a) - keys.indexOf(b)
    if (ia < 0) return 1
    if (ib < 0) return -1
    return ia - ib
  })
}

/**
 * The tail of a label that is not the menu's own name, kept only when it is a real hint: a tab (": tab Tukang Kayu")
 * or a note in brackets. Anything else (a stale phrase such as " dan Role") is dropped, so the row reads like the menu.
 */
function sisaHint(label: string, bawaan: string): string {
  if (!label.startsWith(bawaan)) return ''
  const sisa = label.slice(bawaan.length)
  return /^\s*[:()]/.test(sisa) ? sisa : ''
}

/**
 * A page name on the role table: the menu's name as set on Kelola Aplikasi, so it always says the same as the sidebar,
 * plus the row's own hint when it has one.
 * - a row that is a menu (its label starts with that menu's own name) follows the menu's text;
 * - a row covered by two menus (Performa dan Pengaturan Toko) follows both, joined;
 * - a row that only hangs off a menu (a tab such as Kategori Transaksi) keeps the label the server sent;
 * - a row that is not a menu at all (an action) keeps the label the server sent.
 */
export function labelAkses(t: Teks, h: HalamanDef): string {
  const menu = PETA[h.id] ?? []
  if (menu.length === 0) return h.label
  if (menu.length > 1) {
    const dasar = menu.map((to) => namaMenu(t, to)).join(' & ')
    const sisa = menu.map((to) => sisaHint(h.label, namaMenuBawaan(to))).find((s) => s !== '') ?? ''
    return dasar + sisa
  }
  const [to] = menu
  if (!h.label.startsWith(namaMenuBawaan(to))) return h.label
  return namaMenu(t, to) + sisaHint(h.label, namaMenuBawaan(to))
}
