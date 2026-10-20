import type { Block, Cell, GroupDef, Line, Lembar } from '@/lib/sheetEngine'
import { isGroup } from '@/lib/sheetEngine'

export const RINCI_TABEL = 'arus_rinci'
export const SELISIH = 'Belum dirinci'

/** Ids must match the backend's `c:[\w-]+` pattern, so row keys such as `c:ab12` are flattened. */
const safe = (key: string) => key.replace(/[^\w-]/g, '_')
export const keyNama = (key: string) => `c:nm-${safe(key)}`
export const keyNilaiDasar = (key: string) => `rb:${key}`
export const keySelesai = (key: string, day: string) => `ok:${key}|${day}`
export const keySembunyi = (key: string) => `c:hide-${safe(key)}`
/** Rows added before groups existed were kept in a shared pool; they belong to the cash-in group. */
const LEGACY_GRUP = ['pool', 'k_prod', 'k_cat']

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)

const meta = (id: string) => id.startsWith('c:nm-') || id.startsWith('c:hide-')
export const ANAK = 'anak:'
export const splitsOf = (lembar: Lembar) => lembar.baris.filter((b) => b.tabel === RINCI_TABEL && !meta(b.id) && !b.grup.startsWith(ANAK))
/** Sub-rows (breakdown) of a row; the same list for every period, only the figures differ. */
export const anakDari = (lembar: Lembar, key: string) => lembar.baris.filter((b) => b.tabel === RINCI_TABEL && b.grup === `${ANAK}${key}`)
export const hidden = (lembar: Lembar, key: string) => lembar.baris.some((b) => b.id === keySembunyi(key))
export const nameOf = (lembar: Lembar, key: string, fallback: string) => lembar.baris.find((b) => b.id === keyNama(key))?.label ?? fallback
const groupOf = (grup: string, labels: string[]) => (labels.includes(grup) ? grup : LEGACY_GRUP.includes(grup) ? labels[0] : undefined)

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

/**
 * Every row of the cash-flow table can be renamed; every detail row can also be typed over, removed or split into more
 * rows. The totals (cash in, cash out, transfers) never change: whatever the detail rows of a group do not add up to
 * shows as "Belum dirinci".
 */
export function applyRinci(block: Block, days: string[], lembar: Lembar): Block {
  const labels = block.lines.filter(isGroup).map((g) => g.label)
  const typed = (key: string, d: string) => lembar.sel[`${key}|${d}`]
  const renamed = (l: Line): Line => ({ ...l, def: { ...l.def, kind: 'input', label: nameOf(lembar, l.def.key, l.def.label) } })
  const out: (Line | GroupDef)[] = []
  const all = block.lines
  let i = 0
  while (i < all.length) {
    const head = all[i++]
    if (!isGroup(head)) {
      out.push(renamed(head))
      continue
    }
    out.push(head)
    const rows: Line[] = []
    while (i < all.length && !isGroup(all[i]) && !(all[i] as Line).def.emphasis) rows.push(all[i++] as Line)
    const total = i < all.length && !isGroup(all[i]) ? (all[i] as Line) : undefined
    const shown: Line[] = []
    for (const o of rows) {
      if (hidden(lembar, o.def.key)) continue
      const cells = o.cells.map((c, w): Cell => {
        const t = typed(keyNilaiDasar(o.def.key), days[w])
        return t !== undefined ? { value: num(t), manual: true } : c
      })
      const present = cells.map((c) => c.value).filter((v): v is number => v !== null)
      shown.push({ ...renamed(o), cells, total: present.length ? round(present.reduce((a, b) => a + b, 0)) : null })
    }
    for (const r of splitsOf(lembar)) {
      if (groupOf(r.grup, labels) !== head.label) continue
      const cells = days.map((d, w): Cell => {
        const t = typed(r.id, d)
        if (t !== undefined) return { value: num(t), manual: true }
        return { value: total?.cells[w].value == null ? null : 0, manual: false }
      })
      const added = line(r.id, r.label, cells, { grup: head.label })
      added.custom = true
      shown.push(added)
    }
    for (const l of shown) l.cells = l.cells.map((c, w) => (lembar.sel[keySelesai(l.def.key, days[w])] !== undefined ? { ...c, selesai: true } : c))
    if (total) {
      const rest = days.map((_, w): Cell => {
        const whole = total.cells[w].value
        if (whole === null) return { value: null, manual: false }
        return { value: round(whole - shown.reduce((s, l) => s + (l.cells[w].value ?? 0), 0)), manual: false }
      })
      if (rest.some((c) => c.value)) shown.push(line(`${head.label}:selisih`, SELISIH, rest, { kind: 'calc' }))
    }
    for (const l of shown) {
      out.push(l)
      if (l.def.key.endsWith(':selisih')) continue
      const kids = anakDari(lembar, l.def.key).map((r) => {
        const cells = days.map((d, w): Cell => {
          const t = typed(r.id, d)
          if (t !== undefined) return { value: num(t), manual: true }
          return { value: l.cells[w].value === null ? null : 0, manual: false }
        })
        const child = line(r.id, r.label, cells, { grup: head.label, induk: l.def.key })
        child.custom = true
        return child
      })
      out.push(...kids)
      if (!kids.length) continue
      // A breakdown never changes its row: what the sub-rows do not add up to (negative when they exceed it) shows below them.
      const rest = days.map((_, w): Cell => {
        const whole = l.cells[w].value
        if (whole === null) return { value: null, manual: false }
        return { value: round(whole - kids.reduce((s, k) => s + (k.cells[w].value ?? 0), 0)), manual: false }
      })
      if (rest.some((c) => c.value)) out.push(line(`${l.def.key}:selisih`, SELISIH, rest, { kind: 'calc', grup: head.label, induk: l.def.key }))
    }
  }
  return { ...block, lines: out }
}
