import type { Block, Cell, GroupDef, Line, Lembar } from '@/lib/sheetEngine'
import { isGroup } from '@/lib/sheetEngine'

export const RINCI_TABEL = 'arus_rinci'

/** Ids must match the backend's `c:[\w-]+` pattern, so row keys such as `c:ab12` are flattened. */
const safe = (key: string) => key.replace(/[^\w-]/g, '_')
export const keyNama = (key: string) => `c:nm-${safe(key)}`
export const keyNilaiDasar = (key: string) => `rb:${key}`
export const keySelesai = (key: string, day: string) => `ok:${key}|${day}`
export const keySembunyi = (key: string) => `c:hide-${safe(key)}`
export const keyKategori = (key: string) => `c:kt-${safe(key)}`
/** Rows added before groups existed were kept in a shared pool; they belong to the cash-in group. */
const LEGACY_GRUP = ['pool', 'k_prod', 'k_cat']

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)

const meta = (id: string) => id.startsWith('c:nm-') || id.startsWith('c:hide-') || id.startsWith('c:kt-') || id.startsWith('c:ur-') || id.startsWith('c:src-')
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

const totalOf = (cells: Cell[], mode: 'sum' | 'first' | 'last'): number | null => {
  const present = cells.map((c) => c.value).filter((v): v is number => v !== null)
  if (!present.length) return null
  return mode === 'first' ? present[0] : mode === 'last' ? present.at(-1)! : round(present.reduce((a, b) => a + b, 0))
}
const withCells = (l: Line, cells: Cell[]): Line => ({ ...l, cells, total: totalOf(cells, l.def.total) })

/**
 * Every row of the cash-flow table can be renamed; every detail row can also be typed over, removed, split into more
 * rows or broken down into sub-rows. The reference figure of a row is the sum of its sub-rows when it has any, else its
 * own figure; the group totals (cash in, cash out, transfers) follow those figures, and the opening/closing cash
 * follow the totals, so nothing is left "undivided".
 */
/** `kasKecil`: Kas keluar rows paid out of Kas Kecil; they leave Jumlah kas keluar (Kas Utama) and lower Kas Kecil instead. */
export function applyRinci(block: Block, days: string[], lembar: Lembar, kasKecil: ReadonlySet<string> = new Set()): Block {
  const labels = block.lines.filter(isGroup).map((g) => g.label)
  const typed = (key: string, d: string) => lembar.sel[`${key}|${d}`]
  const renamed = (l: Line): Line => ({ ...l, def: { ...l.def, kind: 'input', label: nameOf(lembar, l.def.key, l.def.label) } })
  const out: (Line | GroupDef)[] = []
  const patched = new Map<string, Cell[]>()
  const all = block.lines
  let i = 0
  while (i < all.length) {
    const head = all[i++]
    if (!isGroup(head)) {
      out.push(patched.has(head.def.key) ? withCells(renamed(head), patched.get(head.def.key)!) : renamed(head))
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
      shown.push(withCells(renamed(o), cells))
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
    const group: Line[] = []
    for (const l0 of shown) {
      const kids = anakDari(lembar, l0.def.key).map((r) => {
        const cells = days.map((d, w): Cell => {
          const t = typed(r.id, d)
          if (t !== undefined) return { value: num(t), manual: true }
          return { value: l0.cells[w].value === null ? null : 0, manual: false }
        })
        const child = line(r.id, r.label, cells, { grup: head.label, induk: l0.def.key })
        child.custom = true
        return child
      })
      // With sub-rows the row shows their sum; without, its own figure stays the reference.
      const own = kids.length ? withCells(l0, l0.cells.map((c, w): Cell => ({ value: c.value === null ? null : round(kids.reduce((s, k) => s + (k.cells[w].value ?? 0), 0)), manual: false }))) : l0
      for (const row of [own, ...kids]) row.cells = row.cells.map((c, w) => (lembar.sel[keySelesai(row.def.key, days[w])] !== undefined ? { ...c, selesai: true } : c))
      group.push(own, ...kids)
    }
    if (total) {
      const parents = group.filter((l) => !l.def.induk && !kasKecil.has(l.def.key))
      patched.set(
        total.def.key,
        total.cells.map((c, w): Cell => {
          const values = parents.map((l) => l.cells[w].value).filter((v): v is number => v !== null)
          return { value: c.value === null ? null : round(values.reduce((a, b) => a + b, 0)), manual: false }
        }),
      )
    }
    out.push(...group)
  }
  // Opening cash of a period is the closing cash of the one before; closing = opening + cash in - cash out + transfers - profit paid out.
  const byKey = new Map(out.filter((l): l is Line => !isGroup(l)).map((l) => [l.def.key, l]))
  const [awal, akhir] = [byKey.get('awal'), byKey.get('akhir')]
  const [masuk, keluar, transfer] = ['kas_masuk', 'kas_keluar', 'transfer'].map((k) => byKey.get(k))
  const dibagi = byKey.get('jml_pembagian')
  if (awal && akhir && masuk && keluar && transfer) {
    const open: Cell[] = []
    const close: Cell[] = []
    days.forEach((_, w) => {
      const o = w === 0 || akhir.cells[w - 1].value === null ? awal.cells[w] : { value: close[w - 1].value, manual: false }
      open.push(o)
      const [m, k, t] = [masuk, keluar, transfer].map((l) => l.cells[w].value)
      close.push(o.value === null || akhir.cells[w].value === null || m === null || k === null || t === null ? akhir.cells[w] : { value: round(o.value + m - k + t - (dibagi?.cells[w].value ?? 0)), manual: false })
    })
    const at = (l: Line) => out.indexOf(l)
    out[at(awal)] = withCells(awal, open)
    out[at(akhir)] = withCells(akhir, close)
  }
  // Kas Kecil: opening = previous period's closing; closing = opening + top-up (tr_packing is shown negative) - money
  // returned to Kas Utama (tr_ops) - spending paid out of it (tr_kk).
  const [kkAwal, kkAkhir] = [byKey.get('kk_awal'), byKey.get('kk_akhir')]
  if (kkAwal && kkAkhir) {
    const v = (key: string, w: number) => byKey.get(key)?.cells[w].value ?? 0
    const open: Cell[] = []
    const close: Cell[] = []
    days.forEach((_, w) => {
      const o = w === 0 || close[w - 1].value === null ? kkAwal.cells[w] : { value: close[w - 1].value, manual: false }
      open.push(o)
      const ada = kkAkhir.cells[w].value !== null || akhir?.cells[w].value != null
      const belanja = [...kasKecil].reduce((s, k) => s + v(k, w), 0)
      close.push(o.value === null || !ada ? kkAkhir.cells[w] : { value: round(o.value - v('tr_packing', w) - v('tr_ops', w) - v('tr_kk', w) - belanja), manual: false })
    })
    out[out.indexOf(kkAwal)] = withCells(kkAwal, open)
    out[out.indexOf(kkAkhir)] = withCells(kkAkhir, close)
  }
  return { ...block, lines: out }
}
