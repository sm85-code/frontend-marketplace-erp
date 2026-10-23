import { useCallback } from 'react'
import { useLabel } from '@/api/pengaturanUi'
import { idMenu, NAV } from '@/config/nav'
import { idTab, TAB_LAPORAN } from '@/lib/namaBaris'

type Teks = (id: string, bawaan: string) => string

/** Default name of a menu (by its path), as in the sidebar before any change on Kelola Aplikasi. */
export const namaMenuBawaan = (to: string) => NAV.find((n) => n.to === to)?.label ?? to
/** Default name of a Laporan Keuangan tab. */
export const namaTabBawaan = (tabel: string) => TAB_LAPORAN.find(([id]) => id === tabel)?.[1] ?? tabel

export const namaMenu = (t: Teks, to: string) => t(idMenu(to), namaMenuBawaan(to))
export const namaTab = (t: Teks, tabel: string) => t(idTab(tabel), namaTabBawaan(tabel))

/** Tabs of Kategori Transaksi: Laporan Keuangan tab names and Operasional menu names, as set on Kelola Aplikasi. */
export const tabKategori = (t: Teks) => [
  { id: 'masuk', label: `${namaTab(t, 'arus_kas')} · ${namaTab(t, 'pemasukan')}` },
  { id: 'keluar', label: `${namaTab(t, 'arus_kas')} · ${namaTab(t, 'pengeluaran')}` },
  { id: 'umum', label: namaMenu(t, '/operasional-umum') },
  { id: 'packing', label: namaMenu(t, '/operasional-packing') },
  { id: 'supplier', label: namaMenu(t, '/belanja-supplier') },
  { id: 'tukang', label: namaMenu(t, '/belanja-tukang') },
] as const

/** `menu(path)`: the menu's name as set on Kelola Aplikasi, so tabs, headings and guides say the same as the sidebar. */
export function useNamaMenu() {
  const t = useLabel()
  return useCallback((to: string) => namaMenu(t, to), [t])
}

/** `tab(tabel)`: a Laporan Keuangan tab's name as set on Kelola Aplikasi (Arus Kas, Pemasukan, Pengeluaran, …). */
export function useNamaTab() {
  const t = useLabel()
  return useCallback((tabel: string) => namaTab(t, tabel), [t])
}
