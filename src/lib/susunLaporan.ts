import type { KategoriTransaksi, KelompokDaftar } from '@/api/kategori'
import type { Overview, Report } from '@/api/financialReports'
import { denganOperasional, type OperasionalItem } from '@/lib/operasionalArusKas'
import { ringkasDariArusKas } from '@/lib/ringkasArusKas'
import { computeSheet, hariBerisi, isGroup, type Block, type Lembar, type Line } from '@/lib/sheetEngine'
import { hariIniWib } from '@/lib/tanggal'
import { sheetSections } from '@/lib/sheetSections'

/** The month's report as the page shows it: the closed books, the manual layer and the Operasional entries, then summarized from the categories. */
export function susunLaporan(data: Overview, records: Report[], days: string[], lembar: Lembar, operasional: OperasionalItem[], daftar: KategoriTransaksi[], kelompok: KelompokDaftar, awal?: Record<string, number> | null, hariIni?: string) {
  const awalSheet = computeSheet(sheetSections(data), records, days, lembar, awal)
  const lembarTampil = denganOperasional(lembar, days, operasional, daftar, awalSheet.find((b) => b.tabel === 'arus_kas')!)
  // Weeks still open whose only figures come from Operasional entries are worked out too (totals, closing cash).
  const sheet = computeSheet(sheetSections(data), records, days, lembar, awal, hariBerisi(lembarTampil, days))
  const ringkas: Block[] = ringkasDariArusKas(sheet, days, lembarTampil, daftar, kelompok, new Set(records.map((r) => r.tanggal)))
  const plain = kosongkanBerjalan(ringkas, days, records, hariIni)
  return { sheet, lembarTampil, plain }
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Laba/Rugi and Neraca show nothing for a weekly period that has not ended yet (period end date today or later, no closed
 * report). The month column then follows the finished weeks only: sums add the finished weeks, balances show the last
 * finished week. Arus Kas is left as it is.
 */
export function kosongkanBerjalan(blocks: Block[], days: string[], records: { tanggal: string }[], hariIni = hariIniWib()): Block[] {
  const tutup = new Set(records.map((r) => r.tanggal))
  const buka = days.map((d) => d >= hariIni && !tutup.has(d))
  if (!buka.some(Boolean)) return blocks
  const selesaiTerakhir = buka.lastIndexOf(false)
  const hasil = blocks.map((b) =>
    b.tabel !== 'laba_rugi' && b.tabel !== 'neraca'
      ? b
      : {
          ...b,
          lines: b.lines.map((l) => {
            if (isGroup(l)) return l
            const cells = l.cells.map((c, w) => (buka[w] ? { ...c, value: null, manual: false } : c))
            const present = cells.map((c) => c.value).filter((v): v is number => v !== null)
            const total = !present.length ? null : l.def.total === 'first' ? present[0] : l.def.total === 'last' ? present.at(-1)! : round(present.reduce((a, c) => a + c, 0))
            const lastTyped = cells.map((c) => c.value !== null).lastIndexOf(true)
            const totalNote = l.def.manualOpen && lastTyped >= 0 && lastTyped < selesaiTerakhir ? `dari minggu terakhir diisi (${days[lastTyped].slice(8, 10)}/${days[lastTyped].slice(5, 7)})` : undefined
            return { ...l, cells, total, totalNote }
          }),
        },
  )
  // Month column of Jumlah aset / Cek selisih: the sum of each asset row's month figure, as before.
  const neraca = hasil.find((b) => b.tabel === 'neraca')
  if (neraca) {
    const lines = neraca.lines.filter((l): l is Line => !isGroup(l))
    const at = (k: string) => lines.find((l) => l.def.key === k)
    const aset = lines.filter((l) => l.def.grup === 'Aset' && !l.def.emphasis)
    const jml = at('jml_aset'), selisih = at('selisih')
    if (jml && aset.some((l) => l.total !== null)) jml.total = round(aset.reduce((a, l) => a + (l.total ?? 0), 0))
    if (selisih && jml?.total != null) selisih.total = round(jml.total - (at('jml_utang')?.total ?? 0) - (at('jml_ekuitas')?.total ?? 0))
  }
  return hasil
}
