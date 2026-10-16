import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProductionStructure, saveProductionStructure, type ProductionStructureNode, type ProcessingPrice } from '@/api/processing'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, SelectField } from './processingShared'

export default function ProductionStructurePicker({ value, onChange }: {
  value: ProcessingPrice
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
  return <div className="space-y-4">
    {q.error && <p role="alert" className="text-sm text-destructive">{getApiError(q.error)} <Button type="button" variant="outline" onClick={() => void q.refetch()}>Coba lagi</Button></p>}
    {q.isLoading && <p className="text-sm text-muted-foreground">Memuat struktur produk…</p>}
    {levels.map(level => <div key={level.kind} className="space-y-1.5">
      <Field title={level.label}>
        <SelectField required disabled={level.disabled || busy || q.isLoading} value={level.selected} onChange={e => choose(level.kind, e.target.value)}>
          <option value="">Pilih {level.label.toLowerCase()}</option>
          {nodes.filter(n => n.kind === level.kind && n.parent_id === level.parent).sort((a,b) => a.code.localeCompare(b.code, 'id')).map(n => <option value={n.id} key={n.id}>{n.code} — {n.name}</option>)}
        </SelectField>
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={level.disabled || busy || !!editor} onClick={() => {
          setError('')
          setEditor({ id: crypto.randomUUID(), version: 0, kind: level.kind, parent_id: level.parent, code: '', name: '' })
        }}>+ Tambah {level.kind}</Button>
        {level.selected && <Button type="button" variant="ghost" size="sm" disabled={busy || !!editor} onClick={() => {
          setError('')
          setEditor(nodes.find(n => n.id === level.selected) || null)
        }}>Edit {level.kind}</Button>}
      </div>
    </div>)}
    {editor && <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-3" onKeyDown={e => {
      if (e.key === 'Enter') { e.preventDefault(); void saveNode() }
    }}>
      <legend className="px-1 text-sm font-semibold">{editor.version ? 'Edit' : 'Tambah'} {editor.kind}</legend>
      <Field title={editor.kind === 'produk' ? 'Kode / SKU induk' : 'Kode'}>
        <Input maxLength={80} value={editor.code} placeholder={editor.kind === 'kategori' ? 'Contoh: AZF' : editor.kind === 'produk' ? 'Contoh: 1R.10' : 'Contoh: RPL'} onChange={e => setEditor({ ...editor, code: e.target.value.toUpperCase() })} />
      </Field>
      <Field title="Nama"><Input maxLength={200} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void saveNode()}>{busy ? 'Menyimpan…' : `Simpan ${editor.kind}`}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditor(null); setError('') }}>Batal struktur</Button>
      </div>
    </fieldset>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Field title="Ukuran"><Input required maxLength={100} placeholder="Contoh: 150x200" value={value.ukuran} onChange={e => onChange({ ukuran: e.target.value })} /></Field>
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">SKU produksi otomatis</p>
      <output aria-label="SKU produksi otomatis" className="mt-1 block break-all text-sm font-semibold">{sku || 'Pilih struktur dan isi ukuran'}</output>
    </div>
  </div>
}
