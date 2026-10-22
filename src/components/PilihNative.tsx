import { Children, isValidElement, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Radix cannot hold an empty value; '' options ("Semua", "— kosong —") travel under this key. */
const KOSONG = '__kosong__'

type Opsi = { value: string; label: ReactNode; disabled?: boolean; grup?: ReactNode }

function kumpulkan(children: ReactNode, grup?: ReactNode, out: Opsi[] = []): Opsi[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    const p = c.props as { value?: string | number; children?: ReactNode; disabled?: boolean; label?: ReactNode }
    if (c.type === 'option') out.push({ value: String(p.value ?? (typeof p.children === 'string' ? p.children : '')), label: p.children, disabled: p.disabled, grup })
    else if (c.type === 'optgroup') kumpulkan(p.children, p.label, out)
    else kumpulkan(p.children, grup, out) // fragments
  })
  return out
}

/**
 * The app's one dropdown, as a drop-in for a native `select`: same props (value, onChange(e), disabled,
 * id, aria-label, required) and `<option>` children, rendered with the shared shadcn/Radix Select.
 */
export default function PilihNative({ value, defaultValue, onChange, children, className, disabled, id, required, name, title, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const opsi = kumpulkan(children)
  const ke = (v: string | number | readonly string[] | undefined) => (v === undefined ? undefined : String(v) === '' ? KOSONG : String(v))
  const placeholder = opsi.find((o) => o.value === '')?.label
  const grup = [...new Set(opsi.map((o) => o.grup))]
  const item = (o: Opsi) => <SelectItem key={`${o.value}`} value={o.value === '' ? KOSONG : o.value} disabled={o.disabled}>{o.label}</SelectItem>
  return (
    <Select
      value={ke(value)}
      defaultValue={ke(defaultValue)}
      disabled={disabled}
      required={required}
      name={name}
      onValueChange={(v) => {
        const nilai = v === KOSONG ? '' : v
        const target = { value: nilai, name: name ?? '', id: id ?? '' }
        onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>)
      }}
    >
      <SelectTrigger id={id} title={title} aria-label={rest['aria-label']} aria-labelledby={rest['aria-labelledby']} aria-describedby={rest['aria-describedby']} aria-invalid={rest['aria-invalid']} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {grup.length > 1 || grup[0] !== undefined
          ? grup.map((g, i) => <SelectGroup key={i}>{g !== undefined && <SelectLabel>{g}</SelectLabel>}{opsi.filter((o) => o.grup === g).map(item)}</SelectGroup>)
          : opsi.map(item)}
      </SelectContent>
    </Select>
  )
}
