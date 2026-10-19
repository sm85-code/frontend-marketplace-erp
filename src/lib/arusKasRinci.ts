import type { Block, Cell, GroupDef, Line, Lembar } from '@/lib/sheetEngine'
import { isGroup } from '@/lib/sheetEngine'

/**
 * Breakdown of the two cash-in rows that can be split by hand. The report totals never change: the typed lines
 * only divide the period's figure of the row, and whatever is left shows as "Belum dirinci".
 */
export const RINCI_TABEL = 'arus_rinci'
export const BARIS_RINCI = ['k_prod', 'k_cat'] as const
export const SELISIH = 'Belum dirinci'

export const keyNama = (base: string) => `c:nm-${base}`
export const keyNilaiDasar = (base: string) => `rb:${base}`
export const keySplit = (id: string) => id

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)

export const splitsOf = (lembar: Lembar, base: string) => lembar.baris.filter((b) => b.tabel === RINCI_TABEL && b.grup === base && b.id !== keyNama(base))
export const nameOf = (lembar: Lembar, base: string, fallback: string) => lembar.baris.find((b) => b.id === keyNama(base))?.label ?? fallback

const line = (key: string, label: string, cells: Cell[], extra: Partial<Line['def']> = {}): Line => {
  const present = cells.map((c) => c.value).filter((v): v is number => v !== null)
  return {
    def: { key, label, tabel: 'arus_kas', grup: 'Kas masuk', kind: 'input', total: 'sum', base: () => '0', ...extra },
    custom: false,
    hidden: false,
    cells,
    total: present.length ? round(present.reduce((a, b) => a + b, 0)) : null,
  }
}

/** Cash-flow block with the renamed and split lines of `lembar` applied under the two rows. */
export function applyRinci(block: Block, days: string[], lembar: Lembar): Block {
  const lines: (Line | GroupDef)[] = []
  for (const l of block.lines) {
    if (isGroup(l) || !(BARIS_RINCI as readonly string[]).includes(l.def.key)) {
      lines.push(l)
      continue
    }
    const base = l.def.key
    const splits = splitsOf(lembar, base)
    const typedSplit = (id: string, d: string) => lembar.sel[`${id}|${d}`]
    const baseCells: Cell[] = l.cells.map((c, w) => {
      const d = days[w]
      const typed = lembar.sel[`${keyNilaiDasar(base)}|${d}`]
      if (typed !== undefined) return { value: num(typed), manual: true }
      if (c.value === null) return c
      const taken = splits.reduce((s, r) => s + num(typedSplit(r.id, d)), 0)
      return { value: round(c.value - taken), manual: taken !== 0 }
    })
    lines.push({
      ...line(base, nameOf(lembar, base, l.def.label), baseCells, { kind: 'input' }),
      def: { ...l.def, kind: 'input', label: nameOf(lembar, base, l.def.label) },
    })
    const rows = splits.map((r) =>
      line(
        r.id,
        r.label,
        days.map((d, w) => {
          const typed = typedSplit(r.id, d)
          if (typed !== undefined) return { value: num(typed), manual: true }
          return { value: l.cells[w].value === null ? null : 0, manual: false }
        }),
        { grup: base },
      ),
    )
    rows.forEach((r) => (r.custom = true))
    lines.push(...rows)
    const rest = days.map((_, w): Cell => {
      const whole = l.cells[w].value
      if (whole === null) return { value: null, manual: false }
      const shown = baseCells[w].value ?? 0
      const parts = rows.reduce((s, r) => s + (r.cells[w].value ?? 0), 0)
      return { value: round(whole - shown - parts), manual: false }
    })
    if (rest.some((c) => c.value)) {
      const extra = line(`${base}:selisih`, SELISIH, rest, { kind: 'calc' })
      lines.push(extra)
    }
  }
  return { ...block, lines }
}
