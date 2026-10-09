import { Input } from '@/components/ui/input'
import type { ComponentProps, ChangeEvent } from 'react'

import { formatNominal, parseNominal } from '@/lib/nominal'

export default function MoneyInput({
  value,
  onChange,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={formatNominal(String(value ?? ''))}
      onChange={(event) => {
        const raw = parseNominal(event.target.value)
        if (!/^-?\d*(\.\d*)?$/.test(raw)) return
        onChange?.({
          ...event,
          target: { ...event.target, value: raw },
          currentTarget: { ...event.currentTarget, value: raw },
        } as ChangeEvent<HTMLInputElement>)
      }}
    />
  )
}
