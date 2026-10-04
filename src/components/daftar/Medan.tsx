import type { ReactNode } from 'react'

/**
 * A form control with a visible label above it (a placeholder is not a label), linked by `htmlFor`.
 * Without a label the cell keeps the same height, so controls without one (a button, a checkbox)
 * still line up with the labelled inputs beside them.
 */
export default function Medan({
  label,
  untuk,
  className = '',
  children,
}: {
  label?: string
  untuk?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {label ? (
        <label htmlFor={untuk} className="text-sm font-medium">
          {label}
        </label>
      ) : (
        <span aria-hidden="true" className="invisible text-sm">
          &nbsp;
        </span>
      )}
      {children}
    </div>
  )
}
