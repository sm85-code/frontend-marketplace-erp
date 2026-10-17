import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProductionStructure, saveProductionStructure, type ProductionStructureNode, type ProcessingPrice } from '@/api/processing'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, SelectField } from './processingShared'

export default function ProductionStructurePicker({ value, onChange, showVariant = true, onEditingChange }: {
  value: ProcessingPrice
  showVariant?: boolean
  onEditingChange?: (editing: boolean) => void
  onChange: (fields: Partial<ProcessingPrice>) => void
}) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['production-structure'], queryFn: getProductionStructure })
  const nodes = q.data?.items || []
  const [category, setCategory] = useState(value.category_id || '')
  const [product, setProduct] = useState(value.product_id || '')
  const [editor, setEditor] = useState<ProductionStructureNode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isEditingStructure = !!editor
  useEffect(() => { onEditingChange?.(isEditingStructure); return () => onEditingChange?.(false) }, [isEditingStructure, onEditingChange])
  const categoryNode = nodes.find(n => n.id === category)
  const productNode = nodes.find(n => n.id === product)
  const modelNode = nodes.find(n => n.id === value.structure_model_id)
  const normalizedSize = value.ukuran.replace(/\s+/g, '').replace(/[×*]/g, 'x').replace(/(?<=\d)X(?=\d)/g, 'x')
  const sku = modelNode && categoryNode && productNode && normalizedSize
    ? [categoryNode.code, productNode.code, modelNode.code, normalizedSize].join('.') : ''
  const choose = (kind: ProductionStructureNode['kind'], id: string, all = nodes) => {
    const node = all.find(n => n.id === id)
    if (kind === 'kategori') {
      setCategory(id)
      setProduct('')
      onChange({ category_id: id, product_id: '', structure_model_id: '', jenis: node?.name || '', kategori_kode: node?.code || '', produk: '', sku: '', sku_induk: '', model: '', model_kode: '' })
    } else if (kind === 'produk') {
      setProduct(id)
      onChange({ product_id: id, structure_model_id: '', produk: node?.name || '', sku_induk: node?.code || '', sku: '', model: '', model_kode: '' })
    } else {
      onChange({ structure_model_id: id, model: node?.name || '', model_kode: node?.code || '' })
    }
  }
  const saveNode = async () => {
    if (!editor || busy) return
    if (!editor.code.trim() || !editor.name.trim()) {
      setError('Isi kode dan nama terlebih dahulu.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await saveProductionStructure(editor)
      const fresh = await qc.fetchQuery({ queryKey: ['production-structure'], queryFn: getProductionStructure, staleTime: 0 })
      // Update table labels/SKUs after a master name or code changes.
      await qc.invalidateQueries({ queryKey: ['processing-prices'] })
      if (!editor.version) choose(editor.kind, editor.id, fresh.items)
      setEditor(null)
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setBusy(false)
    }
  }
  const levels: { kind: ProductionStructureNode['kind']; label: string; parent: string; selected: string; disabled: boolean }[] = [
    { kind: 'kategori', label: 'Kategori', parent: '', selected: category, disabled: false },
    { kind: 'produk', label: 'Produk / SKU induk', parent: category, selected: product, disabled: !category },
    { kind: 'model', label: 'Model', parent: product, selected: value.structure_model_id || '', disabled: !product },
  ]
  return <div className="grid min-w-0 gap-4 lg:grid-cols-3">
    {q.error && <p role="alert" className="text-sm text-destructive lg:col-span-3">{getApiError(q.error)} <Button type="button" variant="outline" onClick={() => void q.refetch()}>Coba lagi</Button></p>}
    {q.isLoading && <p className="text-sm text-muted-foreground lg:col-span-3">Memuat struktur produk…</p>}
    {levels.map((level, index) => {
      const editing = editor?.kind === level.kind
      const parent = nodes.find(n => n.id === level.parent)
      const title = level.kind === 'kategori' ? 'Kategori' : level.kind === 'produk' ? 'Produk' : 'Model'
      const hint = level.kind === 'kategori' ? 'Kelompok produk, misalnya Furniture (AZF).' : level.kind === 'produk' ? 'Nama produk dan SKU induknya, misalnya Rak (1R.10).' : 'Bentuk atau tipe produk, misalnya Rak Piring Lantai (RPL).'
      return <section key={level.kind} aria-label={level.label} className={`min-w-0 space-y-3 rounded-xl border p-3 sm:p-4 ${editing ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}`}>
        <div className="flex items-start gap-2.5">
          <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${editing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index + 1}</span>
          <div className="min-w-0"><p className="text-sm font-semibold">{level.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{hint}</p></div>
        </div>
        {parent && <p className="break-words text-xs text-muted-foreground">{level.kind === 'produk' ? 'Dalam kategori' : 'Untuk produk'}: <span className="font-medium text-foreground">{parent.name} · {parent.code}</span></p>}
        {!editing && <>
          <Field title={`Pilih ${level.kind}`}>
            <SelectField required disabled={level.disabled || busy || q.isLoading || !!editor} value={level.selected} onChange={e => choose(level.kind, e.target.value)}>
              <option value="">Pilih {level.label.toLowerCase()}</option>
              {nodes.filter(n => n.kind === level.kind && n.parent_id === level.parent).sort((a,b) => a.code.localeCompare(b.code, 'id')).map(n => <option value={n.id} key={n.id}>{n.code} — {n.name}</option>)}
            </SelectField>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={level.disabled || busy || !!editor} onClick={() => {
              setError('')
              setEditor({ id: crypto.randomUUID(), version: 0, kind: level.kind, parent_id: level.parent, code: '', name: '' })
            }}>+ Tambah {level.kind}</Button>
            {level.selected && <Button type="button" variant="ghost" size="sm" disabled={busy || !!editor} onClick={() => {
              setError('')
              setEditor(nodes.find(n => n.id === level.selected) || null)
            }}>Edit {level.kind}</Button>}
          </div>
          {level.disabled && <p className="text-xs text-muted-foreground">Pilih {level.kind === 'produk' ? 'kategori' : 'produk'} terlebih dahulu.</p>}
        </>}
        {editing && editor && <fieldset className="min-w-0 space-y-3 border-t border-primary/20 pt-3" onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); void saveNode() }
        }}>
          <legend className="px-1 text-sm font-semibold text-primary">{editor.version ? 'Edit' : 'Tambah'} {level.kind} {editor.version ? '' : 'baru'}</legend>
          <Field title={level.kind === 'produk' ? 'SKU induk produk' : `Kode ${level.kind}`}>
            <Input autoFocus maxLength={80} value={editor.code} placeholder={level.kind === 'kategori' ? 'Contoh: AZF' : level.kind === 'produk' ? 'Contoh: 1R.10' : 'Contoh: RPL'} onChange={e => setEditor({ ...editor, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field title={`Nama ${level.kind}`}><Input maxLength={200} placeholder={level.kind === 'kategori' ? 'Contoh: Furniture' : level.kind === 'produk' ? 'Contoh: Rak' : 'Contoh: Rak Piring Lantai'} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void saveNode()}>{busy ? 'Menyimpan…' : `Simpan ${level.kind}`}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditor(null); setError('') }}>Batal {title.toLowerCase()}</Button>
          </div>
        </fieldset>}
      </section>
    })}
    {showVariant && <>
    <Field title="Ukuran"><Input required maxLength={100} placeholder="Contoh: 150x200" value={value.ukuran} onChange={e => onChange({ ukuran: e.target.value })} /></Field>
    <div className="rounded-xl border bg-muted/30 p-3 lg:col-span-2">
      <p className="text-xs text-muted-foreground">SKU produksi otomatis</p>
      <output aria-label="SKU produksi otomatis" className="mt-1 block break-all text-sm font-semibold">{sku || 'Pilih struktur dan isi ukuran'}</output>
    </div>
    </>}
  </div>
}
