import { isGroup, type Block, type Lembar } from '@/lib/sheetEngine'
import { keyNama, nameOf, RINCI_TABEL } from '@/lib/arusKasRinci'

/**
 * Display names of rows and group titles, kept in the manual sheet. They only change what is shown: totals, typed
 * figures and added rows keep using the row key and the original group label. Shop rows follow the shop name from the data.
 */
const hash = (text: string) => {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(16)
}
export const keyGrup = (tabel: string, label: string) => `c:gr-${hash(`${tabel}|${label}`)}`
export const bisaDiganti = (key: string) => !key.startsWith('shop:')

const without = (lembar: Lembar, id: string) => lembar.baris.filter((b) => b.id !== id)

/** Name a row; the original name clears the override. */
export const setNamaBaris = (lembar: Lembar, key: string, original: string, label: string): Lembar => {
  const rest = without(lembar, keyNama(key))
  return { ...lembar, baris: label === original ? rest : [...rest, { id: keyNama(key), tabel: RINCI_TABEL, grup: 'nama', label }] }
}
export const setNamaGrup = (lembar: Lembar, tabel: string, original: string, label: string): Lembar => {
  const id = keyGrup(tabel, original)
  const rest = without(lembar, id)
  return { ...lembar, baris: label === original ? rest : [...rest, { id, tabel: RINCI_TABEL, grup: `${tabel}|${original}`.slice(0, 80), label }] }
}

/** Blocks with renamed rows and group titles applied. */
export function namai(blocks: Block[], lembar: Lembar): Block[] {
  return blocks.map((block) => ({
    ...block,
    lines: block.lines.map((line) => {
      if (isGroup(line)) {
        const named = lembar.baris.find((b) => b.id === keyGrup(line.tabel, line.label))?.label
        return named ? { ...line, tampil: named } : line
      }
      return bisaDiganti(line.def.key) ? { ...line, def: { ...line.def, label: nameOf(lembar, line.def.key, line.def.label) } } : line
    }),
  }))
}
