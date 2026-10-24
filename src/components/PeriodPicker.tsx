import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Phone layout for period tables: pick one period and hide the other period columns (md and up shows all). */
export function usePeriodPick(initial: number) {
  const [picked, setPicked] = useState<number | null>(null)
  const pick = picked ?? initial
  return { pick, setPick: setPicked, hide: (i: number) => (i === pick ? '' : 'max-md:hidden') }
}

/** Scroll the chosen tab to the middle of its row (only the row, never the page). */
export function useScrollKeAktif(pick: number) {
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = row.current
    const tab = box?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (box && tab) box.scrollLeft = tab.offsetLeft - (box.clientWidth - tab.offsetWidth) / 2
  }, [pick])
  return row
}

type Opsi = { key: string; label: string; sub?: string }
const teks = (o: Opsi) => (o.sub ? `${o.label} ${o.sub}` : o.label)

/** Phones: one compact row ‹ [select] ›. `semuaLayar`: wide screens keep the chip row (report tables show every period as a column there, so they leave it off). */
export default function PeriodPicker({ options, pick, onPick, semuaLayar }: { options: Opsi[]; pick: number; onPick: (i: number) => void; semuaLayar?: boolean }) {
  const row = useScrollKeAktif(pick)
  const panah = 'grid size-11 shrink-0 place-items-center rounded-lg border bg-card disabled:opacity-40'
  return (
    <>
      <div className="flex items-center gap-2 pb-3 md:hidden">
        <button type="button" className={panah} aria-label="Periode sebelumnya" disabled={pick <= 0} onClick={() => onPick(pick - 1)}><ChevronLeft className="size-4" /></button>
        <select aria-label="Pilih periode" className="min-w-0 flex-1 border bg-card text-center" value={pick} onChange={(e) => onPick(Number(e.target.value))}>
          {options.map((o, i) => <option key={o.key} value={i}>{teks(o)}</option>)}
        </select>
        <button type="button" className={panah} aria-label="Periode berikutnya" disabled={pick >= options.length - 1} onClick={() => onPick(pick + 1)}><ChevronRight className="size-4" /></button>
      </div>
      {semuaLayar && (
        <div ref={row} className="relative hidden gap-2 overflow-x-auto pb-3 md:flex" role="tablist" aria-label="Pilih periode">
          {options.map((o, i) => (
            <button key={o.key} type="button" role="tab" aria-selected={pick === i} onClick={() => onPick(i)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-center text-xs ${pick === i ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}>
              <span className="block font-medium">{o.label}</span>
              {o.sub ? <span className="block opacity-80">{o.sub}</span> : null}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
