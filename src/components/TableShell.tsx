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
    <div className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" {...(label ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {})}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}
