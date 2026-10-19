import type { Block, Cell, GroupDef, Line, Lembar } from '@/lib/sheetEngine'
import { isGroup } from '@/lib/sheetEngine'

export const RINCI_TABEL = 'arus_rinci'
export const BARIS_RINCI = ['k_prod', 'k_cat'] as const
export const SELISIH = 'Belum dirinci'
export const GRUP_BARU = 'pool'

export const keyNama = (base: string) => `c:nm-${base}`
export const keyNilaiDasar = (base: string) => `rb:${base}`
export const keySembunyi = (base: string) => `c:hide-${base}`

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)

const meta = (id: string) => id.startsWith('c:nm-') || id.startsWith('c:hide-')
export const splitsOf = (lembar: Lembar) => lembar.baris.filter((b) => b.tabel === RINCI_TABEL && !meta(b.id))
export const hidden = (lembar: Lembar, base: string) => lembar.baris.some((b) => b.id === keySembunyi(base))
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

/**
 * The two cash-in rows "Penjualan produk + proses" and "Jasa cat + packing" form one pool. Any line of the pool (the
 * two originals or rows added by hand) can be renamed, typed over, removed or added freely; the cash-in total of a
 * period never changes: whatever the lines do not add up to shows as "Belum dirinci".
 */
export function applyRinci(block: Block, days: string[], lembar: Lembar): Block {
  const originals = BARIS_RINCI.map((key) => block.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)).filter((l): l is Line => !!l)
  if (originals.length !== BARIS_RINCI.length) return block
  const whole = days.map((_, w) => (originals.some((o) => o.cells[w].value !== null) ? round(originals.reduce((s, o) => s + (o.cells[w].value ?? 0), 0)) : null))
  const typed = (key: string, d: string) => lembar.sel[`${key}|${d}`]

  const pool: Line[] = []
  for (const o of originals) {
    if (hidden(lembar, o.def.key)) continue
    const label = nameOf(lembar, o.def.key, o.def.label)
    const cells = o.cells.map((c, w): Cell => {
      const t = typed(keyNilaiDasar(o.def.key), days[w])
      return t !== undefined ? { value: num(t), manual: true } : c
    })
    pool.push({ ...line(o.def.key, label, cells), def: { ...o.def, kind: 'input', label } })
  }
  for (const r of splitsOf(lembar)) {
    const cells = days.map((d, w): Cell => {
      const t = typed(r.id, d)
      if (t !== undefined) return { value: num(t), manual: true }
      return { value: whole[w] === null ? null : 0, manual: false }
    })
    const added = line(r.id, r.label, cells, { grup: GRUP_BARU })
    added.custom = true
    pool.push(added)
  }
  const rest = days.map((_, w): Cell => {
    if (whole[w] === null) return { value: null, manual: false }
    return { value: round(whole[w]! - pool.reduce((s, l) => s + (l.cells[w].value ?? 0), 0)), manual: false }
  })
  if (rest.some((c) => c.value)) pool.push(line(`${GRUP_BARU}:selisih`, SELISIH, rest, { kind: 'calc' }))

  const lines: (Line | GroupDef)[] = []
  for (const l of block.lines) {
    if (isGroup(l) || !(BARIS_RINCI as readonly string[]).includes(l.def.key)) lines.push(l)
    else if (l.def.key === BARIS_RINCI[0]) lines.push(...pool)
  }
  return { ...block, lines }
}
