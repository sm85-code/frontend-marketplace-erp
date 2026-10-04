import type { ReactNode } from 'react'

/** A form control with a visible label above it (a placeholder is not a label), linked by `htmlFor`. */
export default function Medan({ label, untuk, children }: { label: string; untuk: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={untuk} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}
