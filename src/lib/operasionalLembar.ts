import type { OperasionalDaftar, TransaksiOperasional } from '@/api/operasional'
import type { Block, Cell, GroupDef, Line } from '@/lib/sheetEngine'
import { tambahHari } from '@/lib/tanggal'

const round = (n: number) => Math.round(n * 100) / 100
const hari = (d: string) => Date.parse(`${d}T12:00:00Z`)

/** Monday of the week that holds the 1st of the month: the weeks of every report table count from there. */
const seninAwal = (periode: string) => {
  const first = new Date(`${periode}-01T12:00:00Z`)
  return new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10)
}

/** The Sunday that closes each Monday-Sunday week touching the month (what Arus Kas calls the period's date). */
export function mingguBulan(periode: string): string[] {
  const awal = seninAwal(periode)
  const [y, m] = periode.split('-').map(Number)
  const akhir = new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10)
  const out: string[] = []
  for (let minggu = tambahHari(awal, 6); tambahHari(minggu, -6) <= akhir; minggu = tambahHari(minggu, 7)) out.push(minggu)
  return out
}

/** Index of the week (see mingguBulan) that holds the date, or -1 when it falls outside them. */
export function indeksMinggu(periode: string, tanggal: string): number {
  const i = Math.floor((hari(tanggal) - hari(seninAwal(periode))) / (7 * 86_400_000))
  return i >= 0 && i < mingguBulan(periode).length ? i : -1
}

const isi = (cells: number[]): Cell[] => cells.map((v) => ({ value: v ? round(v) : null, manual: false }))
const baris = (key: string, label: string, grup: string, cells: Cell[], emphasis = false): Line => ({
  def: { key, label, tabel: 'pengeluaran', grup, kind: emphasis ? 'calc' : 'input', total: 'sum', emphasis, base: () => '0' },
  custom: false,
  hidden: false,
  cells,
  total: cells.some((c) => c.value !== null) ? round(cells.reduce((a, c) => a + (c.value ?? 0), 0)) : null,
})

/**
 * The entries of one month as an Arus Kas style table: a group per category, one numbered row per entry whose amount sits in
 * the weekly column holding its date, "Jumlah <category>" under each group and the overall total at the end.
 */
export function susunOperasional(data: OperasionalDaftar, judul: string): { block: Block; days: string[]; item: Map<string, TransaksiOperasional> } {
  const days = mingguBulan(data.periode)
  const item = new Map<string, TransaksiOperasional>()
  const lines: (Line | GroupDef)[] = []
  const semua = days.map(() => 0)
  for (const k of data.kategori) {
    lines.push({ group: true, label: k.label, tabel: 'pengeluaran' })
    const sub = days.map(() => 0)
    for (const t of data.items.filter((x) => x.kategori === k.id)) {
      const w = indeksMinggu(data.periode, t.tanggal)
      const cells = days.map(() => 0)
      if (w >= 0) {
        cells[w] = Number(t.jumlah)
        sub[w] += Number(t.jumlah)
        semua[w] += Number(t.jumlah)
      }
      item.set(t.id, t)
      const line = baris(t.id, t.uraian || '—', k.label, isi(cells))
      line.total = round(Number(t.jumlah))
      lines.push(line)
    }
    lines.push(baris(`jml:${k.id}`, `Jumlah ${k.label}`, k.label, isi(sub), true))
  }
  lines.push(baris('total', `Jumlah ${judul.toLocaleLowerCase('id-ID')}`, '__total', isi(semua), true))
  return { block: { title: `A. ${judul}`, tabel: 'pengeluaran', lines }, days, item }
}
