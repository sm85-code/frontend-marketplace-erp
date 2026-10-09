import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Horizontal scroll wrapper for wide tables (matches live FE). */
export default function TableShell({
  children,
  minWidth = 560,
  label,
}: {
  children: ReactNode
  minWidth?: number
  /** Names the scrollable region for screen readers. */
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [lebar, setLebar] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setLebar(el.scrollWidth > el.clientWidth + 1)
    const observer = new ResizeObserver(check)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    check()
    return () => observer.disconnect()
  }, [])
  return (
    <div className="min-w-0 space-y-1">
      {lebar && <div className="text-xs text-muted-foreground" aria-hidden="true">↔ Geser tabel untuk kolom lainnya</div>}
    <div ref={ref}
      // `relative` makes this the containing block of the hidden (sr-only, absolutely positioned) texts inside the
      // table, so they are clipped here instead of stretching the whole page sideways.
      className="relative max-w-full min-w-0 w-full overscroll-x-contain overflow-x-auto rounded-lg border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" {...(label ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {})}>
      <div style={{ minWidth }}>{children}</div>
    </div>
    </div>
  )
}
