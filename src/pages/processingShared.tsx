import PilihNative from '@/components/PilihNative'
import { cn } from '@/lib/utils'
import { cloneElement, useId, type SelectHTMLAttributes, type ReactElement } from 'react'
export const POL0S = 'Polos / Tanpa Cat'
export function SelectField({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <PilihNative {...props} className={cn("h-11 w-full min-w-36", props.className)}>
      {children}
    </PilihNative>
  )
}
export function Field({ title, children }: { title: string; children: ReactElement<{ id?: string }> }) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  return (
    <div className="grid min-w-0 gap-1 text-sm">
      <label className="font-medium" htmlFor={id}>
        {title}
      </label>
      {cloneElement(children, { id })}
    </div>
  )
}
