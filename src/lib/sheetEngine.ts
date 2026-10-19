import type { Report } from '@/api/financialReports'

/**
 * Recalculation of the report sheet on top of the closed books and the manual layer.
 *
 * A row's shown value = the typed amount if there is one, else its closed-books value ("base") plus the change
 * ("delta" = shown - base) of the rows it depends on. Totals, profit, cash and the balance sheet are therefore just
 * rows with dependencies, and they stay in step with whatever is typed.
 */
export type Mode = 'week' | 'cum' | 'cumBefore'
/** `group` = every row of "table|group"; `custom` = only the rows added by hand in that group. */
export type Dep = { row?: string; group?: string; custom?: string; sign?: 1 | -1; mode?: Mode }
export type RowDef = {
  key: string
  label: string
  tabel: string
  grup: string
  /** input = can be typed over; calc = always derived. */
  kind: 'input' | 'calc'
  total: 'sum' | 'first' | 'last'
  emphasis?: boolean
  /** Link row that only shows once it has an amount. */
  autoHide?: boolean
  /** In a week without a closed report this row starts from the previous week's closed-books values of these rows (default: itself for balances, `total: 'last'`). */
  carry?: string[]
  /** Opening balance: shown in a week without a closed report too, taken from the previous week. */
  showCarried?: boolean
  deps?: Dep[]
  base: (r: Report) => string
}
export type GroupDef = { group: true; label: string; tabel: string }
export type SectionDef = { title: string; tabel: string; rows: (RowDef | GroupDef)[] }
export type Lembar = {
  sel: Record<string, string>
  baris: { id: string; tabel: string; grup: string; label: string }[]
  hapus: string[]
}
export const emptyLembar = (): Lembar => ({ sel: {}, baris: [], hapus: [] })
export const isGroup = (row: RowDef | GroupDef | Line): row is GroupDef => 'group' in row
export const cellKey = (row: string, day: string) => `${row}|${day}`

export type Cell = { value: number | null; manual: boolean }
export type Line = { def: RowDef; custom: boolean; hidden: boolean; cells: Cell[]; total: number | null }
export type Block = { title: string; tabel: string; lines: (Line | GroupDef)[] }

const num = (value: string | undefined) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const round = (n: number) => Math.round(n * 100) / 100

export function computeSheet(sections: SectionDef[], records: Report[], days: string[], lembar: Lembar): Block[] {
  const recordOf = days.map((d) => records.find((r) => r.tanggal === d))
  const hasData = days.map((d, w) => !!recordOf[w] || Object.keys(lembar.sel).some((k) => k.endsWith(`|${d}`)))
  const hidden = new Set(lembar.hapus)

  // Rows incl. the ones added by hand, inserted at the end of their group.
  const blocks = sections.map((section) => {
    const rows: (RowDef | GroupDef)[] = []
    section.rows.forEach((row, i) => {
      rows.push(row)
      if (isGroup(row)) return
      const next = section.rows[i + 1]
      const endOfGroup = !next || isGroup(next) || (next as RowDef).grup !== row.grup
      if (!endOfGroup) return
      for (const custom of lembar.baris.filter((c) => c.tabel === section.tabel && c.grup === row.grup)) {
        rows.push({ key: custom.id, label: custom.label, tabel: custom.tabel, grup: custom.grup, kind: 'input', total: 'sum', base: () => '0' })
      }
    })
    return { section, rows }
  })
  const all = new Map<string, RowDef>()
  const custom = new Set(lembar.baris.map((c) => c.id))
  for (const { rows } of blocks) for (const row of rows) if (!isGroup(row)) all.set(row.key, row)

  const baseAt = (row: RowDef, w: number): number => {
    if (recordOf[w]) return num(row.base(recordOf[w]!))
    if (w === 0) return 0
    const from = row.carry ?? (row.total === 'last' ? [row.key] : [])
    return from.reduce((sum, key) => {
      const source = all.get(key)
      return source ? sum + baseAt(source, w - 1) : sum
    }, 0)
  }
  const anyBefore = days.map((_, w) => recordOf.slice(0, w).some(Boolean))
  const shown = new Map<string, (number | undefined)[]>()
  const visiting = new Set<string>()

  const shownAt = (key: string, w: number): number => {
    const row = all.get(key)
    if (!row) return 0
    if (hidden.has(key)) return 0
    const memo = shown.get(key) ?? []
    shown.set(key, memo)
    if (memo[w] !== undefined) return memo[w]!
    const id = `${key}@${w}`
    if (visiting.has(id)) return baseAt(row, w)
    visiting.add(id)
    const typed = lembar.sel[cellKey(key, days[w])]
    let value: number
    if (row.kind === 'input' && typed !== undefined) value = num(typed)
    else value = baseAt(row, w) + (row.deps ?? []).reduce((sum, dep) => sum + depDelta(dep, w), 0)
    visiting.delete(id)
    memo[w] = value
    return value
  }
  const deltaAt = (key: string, w: number) => {
    const row = all.get(key)
    return row ? shownAt(key, w) - baseAt(row, w) : 0
  }
  const depDelta = (dep: Dep, w: number): number => {
    const keys = dep.row
      ? [dep.row]
      : [...all.values()]
          .filter((r) => `${r.tabel}|${r.grup}` === (dep.group ?? dep.custom) && (dep.group || custom.has(r.key)))
          .map((r) => r.key)
    const sign = dep.sign ?? 1
    const mode = dep.mode ?? 'week'
    const upto = mode === 'week' ? w : mode === 'cum' ? w : w - 1
    const from = mode === 'week' ? w : 0
    let sum = 0
    for (const key of keys) for (let j = from; j <= upto; j++) sum += deltaAt(key, j)
    return sign * sum
  }

  return blocks.map(({ section, rows }) => ({
    title: section.title,
    tabel: section.tabel,
    lines: rows.map((row) => {
      if (isGroup(row)) return row
      const isHidden = hidden.has(row.key)
      const cells: Cell[] = days.map((d, w) => ({
        value: hasData[w] || (row.showCarried && anyBefore[w]) ? round(shownAt(row.key, w)) : null,
        manual: lembar.sel[cellKey(row.key, d)] !== undefined && row.kind === 'input',
      }))
      const present = cells.map((c) => c.value).filter((v): v is number => v !== null)
      const total = !present.length
        ? null
        : row.total === 'first'
          ? present[0]
          : row.total === 'last'
            ? present.at(-1)!
            : round(present.reduce((a, b) => a + b, 0))
      const empty = !!row.autoHide && cells.every((c) => !c.value)
      return { def: row, custom: custom.has(row.key), hidden: isHidden || empty, cells, total }
    }),
  }))
}
