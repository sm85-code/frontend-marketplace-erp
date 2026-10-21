import { keyNilaiDasar } from '@/lib/arusKasRinci'
import type { Lembar } from '@/lib/sheetEngine'
import type { KategoriTransaksi } from '@/api/kategori'

export type OperasionalItem = { tanggal: string; kategori: string; jumlah: string }

/** Rows Arus Kas already had for a category of the Operasional pages; the other categories get a row of their own. */
const BARIS_ADA: Record<string, string> = { langganan: 'k_langganan', lain_keluar: 'k_operasional' }
/** Gaji and iklan are typed into Arus Kas itself, never taken from the Operasional pages. */
const DIINPUT_DI_ARUS_KAS = new Set(['gaji', 'iklan'])

export const keyBarisOperasional = (kategori: string) => BARIS_ADA[kategori] ?? `op:${kategori}`

/** The categories whose Operasional entries Arus Kas takes in, and the row each one lands in. */
export const kategoriOperasional = (daftar: KategoriTransaksi[]) => daftar.filter((k) => k.arah === 'keluar' && k.operasional !== null && !DIINPUT_DI_ARUS_KAS.has(k.id))

/** Categories that need a row of their own (the others fill a row Arus Kas already has). */
export const kategoriBarisBaru = (daftar: KategoriTransaksi[]) => kategoriOperasional(daftar).filter((k) => !(k.id in BARIS_ADA))

/** Index of the period (a report date closes it) that holds a date: after the previous one, up to and including its own. */
export function indeksPeriode(days: string[], tanggal: string): number {
  return days.findIndex((d, i) => tanggal <= d && (i === 0 || tanggal > days[i - 1]))
}

/**
 * The sheet as it is shown: the totals of the Operasional entries stand in each category's row and period, unless that
 * cell has a figure typed by hand, which always wins.
 */
export function denganOperasional(lembar: Lembar, days: string[], items: OperasionalItem[], daftar: KategoriTransaksi[]): Lembar {
  const boleh = new Set(kategoriOperasional(daftar).map((k) => k.id))
  const total = new Map<string, number>()
  for (const it of items) {
    if (!boleh.has(it.kategori)) continue
    const w = indeksPeriode(days, it.tanggal)
    if (w < 0) continue
    const key = `${keyNilaiDasar(keyBarisOperasional(it.kategori))}|${days[w]}`
    total.set(key, Math.round(((total.get(key) ?? 0) + Number(it.jumlah)) * 100) / 100)
  }
  const sel = { ...lembar.sel }
  for (const [key, value] of total) if (sel[key] === undefined && value > 0) sel[key] = String(value)
  return sel === lembar.sel ? lembar : { ...lembar, sel }
}
