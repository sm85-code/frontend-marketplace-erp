import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Field, SelectField } from './processingShared'

export default function ProcessingColorField({ value, colors, onChange }: {
  value: string
  colors: string[]
  onChange: (color: string) => void
}) {
  const [custom, setCustom] = useState(false)
  const options = [...new Set(['Putih', 'Hitam', 'Natural', 'Walnut', ...colors, value].map(c => c.trim()).filter(Boolean))]
    .filter(c => c !== 'Polos / Tanpa Cat')
    .sort((a, b) => a.localeCompare(b, 'id'))
  return (
    <div className="space-y-3">
      <Field title="Warna cat">
        <SelectField required value={custom ? '__custom' : value} onChange={e => {
          setCustom(e.target.value === '__custom')
          onChange(e.target.value === '__custom' ? '' : e.target.value)
        }}>
          <option value="">Pilih warna cat</option>
          {options.map(color => <option key={color} value={color}>{color}</option>)}
          <option value="__custom">Warna lain…</option>
        </SelectField>
      </Field>
      {custom && <Field title="Nama warna lain">
        <Input required maxLength={200} value={value} placeholder="Ketik nama warna" onChange={e => onChange(e.target.value)} />
      </Field>}
    </div>
  )
}
