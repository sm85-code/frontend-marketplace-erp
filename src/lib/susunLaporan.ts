import type { KategoriTransaksi, KelompokDaftar } from '@/api/kategori'
import type { Overview, Report } from '@/api/financialReports'
import { denganOperasional, type OperasionalItem } from '@/lib/operasionalArusKas'
import { ringkasDariArusKas } from '@/lib/ringkasArusKas'
import { computeSheet, type Block, type Lembar } from '@/lib/sheetEngine'
import { sheetSections } from '@/lib/sheetSections'

/** The month's report as the page shows it: the closed books, the manual layer and the Operasional entries, then summarized from the categories. */
export function susunLaporan(data: Overview, records: Report[], days: string[], lembar: Lembar, operasional: OperasionalItem[], daftar: KategoriTransaksi[], kelompok: KelompokDaftar, awal?: Record<string, number> | null) {
  const sheet = computeSheet(sheetSections(data), records, days, lembar, awal)
  const lembarTampil = denganOperasional(lembar, days, operasional, daftar, sheet.find((b) => b.tabel === 'arus_kas')!)
  const plain: Block[] = ringkasDariArusKas(sheet, days, lembarTampil, daftar, kelompok, new Set(records.map((r) => r.tanggal)))
  return { sheet, lembarTampil, plain }
}
