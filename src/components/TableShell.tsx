import type { ReactNode } from 'react'

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
  return (
    <div
      // `relative` makes this the containing block of the hidden (sr-only, absolutely positioned) texts inside the
      // table, so they are clipped here instead of stretching the whole page sideways.
      className="relative max-w-full min-w-0 w-full overscroll-x-contain overflow-x-auto bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" {...(label ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {})}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}
