import { useEffect, useRef, useState } from 'react'

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

export default function PeriodPicker({ options, pick, onPick }: { options: { key: string; label: string; sub?: string }[]; pick: number; onPick: (i: number) => void }) {
  const row = useScrollKeAktif(pick)
  return (
    <div ref={row} className="relative flex gap-2 overflow-x-auto pb-3 md:hidden" role="tablist" aria-label="Pilih periode">
      {options.map((o, i) => (
        <button key={o.key} type="button" role="tab" aria-selected={pick === i} onClick={() => onPick(i)}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-center text-xs ${pick === i ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}>
          <span className="block font-medium">{o.label}</span>
          {o.sub ? <span className="block opacity-80">{o.sub}</span> : null}
        </button>
      ))}
    </div>
  )
}
