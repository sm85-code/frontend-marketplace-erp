import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPaintColors, savePaintColor, type PaintColor } from '@/api/processing'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, SelectField } from './processingShared'

export default function ProcessingColorField({ value, colors, onChange, onEditingChange }: {
  onEditingChange?: (editing: boolean) => void
  value: string
  colors: string[]
  onChange: (color: string, id?: string) => void
}) {
  const qc = useQueryClient()
  const q = useQuery({queryKey: ['processing-paint-colors'], queryFn: getPaintColors})
  const [editor, setEditor] = useState<PaintColor | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editing = !!editor
  useEffect(() => { onEditingChange?.(editing); return () => onEditingChange?.(false) }, [editing, onEditingChange])
  const options = [...new Set([...(q.data?.items || []).map(c => c.name), ...colors, value].map(c => c.trim()).filter(Boolean))]
    .filter(c => c !== 'Polos / Tanpa Cat').sort((a, b) => a.localeCompare(b, 'id'))
  const selected = q.data?.items.find(c => c.name === value)
  const save = async () => {
    if (!editor?.name.trim() || busy) return
    setBusy(true); setError('')
    try {
      await savePaintColor(editor)
      await qc.invalidateQueries({queryKey: ['processing-paint-colors']})
      onChange(editor.name.trim().replace(/\s+/g, ' '), editor.id)
      setEditor(null)
    } catch(e) { setError(getApiError(e)) } finally { setBusy(false) }
  }
  return <section aria-label="Pilihan warna cat" className={`min-w-0 space-y-3 rounded-xl border p-3 ${editor ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
    {q.error && <p role="alert" className="text-sm text-destructive">{getApiError(q.error)} <Button type="button" variant="outline" onClick={() => void q.refetch()}>Coba lagi</Button></p>}
    <Field title="Warna cat"><SelectField required disabled={!!editor || busy || q.isLoading} value={value} onChange={e => onChange(e.target.value, q.data?.items.find(c => c.name === e.target.value)?.id)}>
      <option value="">Pilih warna cat</option>
      {options.map(color => <option key={color} value={color}>{color}</option>)}
    </SelectField></Field>
    {!editor && <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={q.isLoading || !!q.error} onClick={() => {setError(''); setEditor({id: crypto.randomUUID(), name:'', version:0})}}>+ Tambah warna</Button>
      {value && <Button type="button" variant="ghost" size="sm" disabled={q.isLoading || !!q.error} onClick={() => {setError(''); setEditor(selected || {id:crypto.randomUUID(),name:value,version:0})}}>Edit warna</Button>}
    </div>}
    {editor && <fieldset className="min-w-0 space-y-3 border-t border-primary/20 pt-3" onKeyDown={e => {if(e.key === 'Enter'){e.preventDefault(); void save()}}}>
      <legend className="px-1 text-sm font-semibold text-primary">{selected && editor.id === selected.id ? 'Edit warna' : 'Tambah warna baru'}</legend>
      <Field title="Nama warna"><Input autoFocus maxLength={200} value={editor.name} placeholder="Ketik nama warna cat" onChange={e => setEditor({...editor,name:e.target.value})}/></Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy || !editor.name.trim()} onClick={() => void save()}>{busy ? 'Menyimpan…' : 'Simpan warna'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => {setEditor(null);setError('')}}>Batal warna</Button></div>
    </fieldset>}
  </section>
}
