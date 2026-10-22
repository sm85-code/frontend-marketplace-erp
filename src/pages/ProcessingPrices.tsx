import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProcessingCatalogPrices, retireProcessingPrice, activateProcessingPrice, saveProcessingPrice, type ProcessingPrice } from '@/api/processing'
import { fmtRp, getApiError } from '@/api/client'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ConfirmProvider'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import ProductionStructurePicker from './ProductionStructurePicker'
import BulkProductionStructure from './BulkProductionStructure'
import { Checkbox } from '@/components/ui/checkbox'
import ProcessingColorField from './ProcessingColorField'
import { Field, SelectField } from './processingShared'
import ProcessingVarian from './ProcessingVarian'
import VarianBanyakPilihan, { type HasilVarian } from './VarianBanyakPilihan'
import { bersihkanVarian, labelVarian, masalahVarian, ringkasanVarian, varianDari } from '@/lib/varianProduk'

/** A manual paint tariff may have no model; the catalog still needs a name, so it is stored (and shown) as this. */
const TANPA_MODEL = 'Tanpa model'

export default function ProcessingPrices({ kind: selectedKind }: { kind?: 'produksi' | 'pengecatan' | 'non_kayu' | 'packing' }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-prices', 'catalog'], queryFn: getProcessingCatalogPrices })
  const confirm = useConfirm()
  const [status, setStatus] = useState('active')
  const [changing, setChanging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulk, setBulk] = useState<ProcessingPrice[] | null>(null)
  const selectRow = (price: ProcessingPrice, checked: boolean) => setSelected(previous => {
    const next = new Set(previous)
    if (checked && next.size < 100 && price.active !== false) next.add(price.id)
    else if (!checked) next.delete(price.id)
    return next
  })
  const selection = (q.data?.items || []).filter(p => selected.has(p.id) && p.active !== false && p.kind === 'produksi')
  const [edit, setEdit] = useState<ProcessingPrice | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  // A new manual product can be several at once (one per combination of its variant choices).
  const [kombo, setKombo] = useState<HasilVarian>({ baris: [], masalah: null })
  const disimpan = useRef(new Set<string>())
  useEffect(() => { disimpan.current = new Set() }, [edit?.id])
  const banyak = !!edit && edit.kind === 'non_kayu' && adding
  const [editingColor, setEditingColor] = useState(false)
  const [useHierarchy, setUseHierarchy] = useState(true)
  /** Paint tariffs: pick the model and size from the production list (otomatis) or type them (manual). */
  const [modeCat, setModeCat] = useState<'otomatis' | 'manual'>('otomatis')
  const [cariModel, setCariModel] = useState('')
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const categoriesId = useId()
  const titleOf = (kind: string) => kind === 'produksi' ? 'Katalog Produk Kayu' : kind === 'non_kayu' ? 'Katalog Produk Manual' : kind === 'packing' ? 'Tarif Packing' : 'Tarif Pengecatan'
  const categoryOf = (p: ProcessingPrice) => p.jenis?.trim() || ''
  /** Paint tariffs are per model and size, so a tariff row is named by its model (the product name only when it has no model). */
  const namaOf = (p: ProcessingPrice) => (p.kind === 'pengecatan' ? p.model?.trim() || p.produk : p.produk)
  const categories = [
    ...new Set(
      (q.data?.items || [])
        .filter((p) => p.kind === 'produksi')
        .map(categoryOf)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'id'))
  const filtered = (q.data?.items || []).filter(
    (p) =>
      p.kind === selectedKind &&
      (status === 'all' || (status === 'inactive' ? p.active === false : p.active !== false)) &&
      (selectedKind !== 'produksi' ||
        category === 'all' ||
        (category === 'none' ? !categoryOf(p) : category === 'category:' + categoryOf(p))) &&
      [p.produk, p.sku, p.ukuran, labelVarian(p), p.catatan, p.jenis, p.warna, p.model, p.model_kode, p.sku_induk, p.kategori_kode].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 15))
  const current = Math.min(page, pages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (k: keyof ProcessingPrice, v: string) => setEdit((p) => (p ? { ...p, [k]: v } : p))
  const catalogProduct = selectedKind === 'produksi' || selectedKind === 'non_kayu'
  const changeStatus = async (price: ProcessingPrice) => {
    const activate = price.active === false
    const label = activate ? 'Aktifkan' : price.in_use ? 'Nonaktifkan' : 'Hapus'
    if (!await confirm({ title: `${label} produk?`, description: `${price.produk} · ${labelVarian(price) || price.sku || (price.kind === 'non_kayu' ? 'Tanpa varian' : 'Tanpa ukuran')}\n${activate ? 'Produk akan tersedia untuk pemetaan baru.' : price.in_use ? 'Produk sudah dipakai dalam order atau tarif terkait. Produk disembunyikan dari pilihan baru; riwayat tetap utuh.' : 'Produk akan dihapus dari katalog. Jika ternyata sudah dipakai saat diproses, sistem akan menonaktifkannya agar riwayat tetap utuh.'}`, confirmLabel: label, destructive: !activate })) return
    setChanging(true)
    try {
      if (activate) { await activateProcessingPrice(price); toast.success('Produk diaktifkan') }
      else { const result = await retireProcessingPrice(price); toast.success(result.action === 'deleted' ? 'Produk dihapus' : 'Produk dinonaktifkan; riwayat tetap utuh') }
    } catch (err) { toast.error(getApiError(err)) }
    finally { await qc.invalidateQueries({queryKey: ['processing-prices']}); setChanging(false) }
  }
  const rowActions = (price: ProcessingPrice) => <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" disabled={changing} onClick={() => {
      setAdding(false); setUseHierarchy(!!price.structure_model_id); setModeCat(price.kind === 'pengecatan' && !price.production_price_id ? 'manual' : 'otomatis'); setCariModel(''); setError(''); setEdit(price.kind === 'non_kayu' ? { ...price, varian: varianDari(price) } : price.kind === 'pengecatan' && !price.production_price_id && price.produk === TANPA_MODEL ? { ...price, produk: '' } : price)
    }}>Edit</Button>
    {catalogProduct && <Button variant="outline" size="sm" disabled={changing} className={price.active === false ? '' : 'text-destructive'} onClick={() => void changeStatus(price)}>{price.active === false ? 'Aktifkan' : price.in_use ? 'Nonaktifkan' : 'Hapus'}</Button>}
  </div>
  const baseColumns: KolomTabel<ProcessingPrice>[] = [
    {
      kunci: 'produk',
      judul: selectedKind === 'non_kayu' ? 'Produk / Varian' : selectedKind === 'pengecatan' ? 'Model / Ukuran' : 'Produk / Ukuran',
      tetap: true,
      nilai: (r) => namaOf(r),
      sel: (r) => (
        <div>
          <p className="font-medium">{namaOf(r)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[labelVarian(r), r.sku].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    ...(selectedKind === 'produksi'
      ? [
          {
            kunci: 'jenis',
            judul: 'Kategori',
            nilai: (r: ProcessingPrice) => categoryOf(r),
            sel: (r: ProcessingPrice) => (
              <span className="text-sm text-muted-foreground">{categoryOf(r) || 'Belum dikategorikan'}</span>
            ),
          },
        ]
      : selectedKind === 'pengecatan' ? [{ kunci: 'warna', judul: 'Warna', nilai: (r: ProcessingPrice) => r.warna || '', sel: (r: ProcessingPrice) => <span>{r.warna || 'Belum ditentukan'}</span> }] : selectedKind === 'packing' ? [{ kunci: 'packing_type', judul: 'Jenis packing', nilai: (r: ProcessingPrice) => r.packing_type || 'biasa', sel: (r: ProcessingPrice) => r.packing_type === 'kayu' ? 'Kayu' : 'Biasa' }] : []),
    {
      kunci: 'harga',
      judul: 'Harga / unit',
      nilai: (r) => Number(r.harga ?? -1),
      sel: (r) => (
        <>
          {r.active === false && <span className="mb-1 block text-xs text-muted-foreground">Nonaktif</span>}
          {r.harga ? fmtRp(r.harga) : <span className="text-muted-foreground">Belum ada harga</span>}
          {r.harga && Number(r.harga) === 0 && (
            <span className="block text-xs text-destructive">Harga nol — periksa</span>
          )}
        </>
      ),
    },

    {
      kunci: 'aksi',
      judul: 'Aksi',
      sel: rowActions,
    },
  ]
  const columns: KolomTabel<ProcessingPrice>[] = selectedKind === 'produksi' ? [
    { kunci: 'jenis', judul: 'Kategori', nilai: r => categoryOf(r), sel: r => <div><p className="font-medium">{r.jenis || 'Belum dikategorikan'}</p>{r.kategori_kode && <p className="text-xs text-muted-foreground">{r.kategori_kode}</p>}</div> },
    { kunci: 'produk', judul: 'Produk / SKU induk', tetap: true, nilai: r => r.produk, sel: r => <div><p className="font-medium">{r.produk}</p><p className="text-xs text-muted-foreground">{r.sku_induk || 'Data lama · belum terstruktur'}</p></div> },
    { kunci: 'model', judul: 'Model', nilai: r => r.model_kode || '', sel: r => <div>{r.model_kode || '—'}{r.model && r.model !== r.model_kode && <p className="text-xs text-muted-foreground">{r.model}</p>}</div> },
    { kunci: 'ukuran', judul: 'Ukuran / SKU', nilai: r => r.ukuran, sel: r => <div>{r.ukuran || '—'}<p className="mt-1 break-all text-xs text-muted-foreground">{r.sku || '—'}</p></div> },
    ...baseColumns.filter(c => c.kunci === 'harga' || c.kunci === 'aksi'),
  ] : baseColumns
  return (
    <>
      {(selectedKind ? [selectedKind] : (['produksi', 'pengecatan'] as const)).map((kind) => (
        <Card className="min-w-0" key={kind}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{titleOf(kind)}</CardTitle>
              <Button
                variant="default"
                onClick={() => {
                  setAdding(true)
                  setUseHierarchy(true)
                  setModeCat('otomatis')
                  setCariModel('')
                  setError('')
                  setEdit({
                    id: crypto.randomUUID(),
                    version: 0,
                    kind,
                    produk: '',
                    sku: '',
                    ukuran: '',
                    ...(kind === 'non_kayu' ? { varian: [] } : {}),
                    harga: kind === 'non_kayu' ? '' : '0',
                    catatan: '',
                    warna: '',
                  })
                }}
              >
                {kind === 'non_kayu' ? 'Tambah produk manual' : kind === 'packing' ? 'Tambah tarif packing' : kind === 'produksi' ? 'Tambah produk kayu' : 'Tambah tarif pengecatan'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {kind === 'produksi'
                ? 'Perubahan harga tidak mengubah pemetaan order yang sudah tersimpan.'
                : kind === 'packing' ? 'Tarif packing biasa dan kayu. Biaya pada pesanan bisa disesuaikan menurut ukuran.' : kind === 'non_kayu' ? 'Produk dan harga beli supplier yang dicatat manual.' : 'Tarif tagihan reseller, sudah termasuk jasa. Pengecatan internal tidak menimbulkan tagihan jasa karyawan.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.error && (
              <p role="alert">
                {getApiError(q.error)}{' '}
                <Button variant="outline" onClick={() => void q.refetch()}>
                  Coba lagi
                </Button>
              </p>
            )}
            {kind === 'produksi' && <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3">
              <span className="mr-auto text-sm">{selection.length} produk dipilih · maksimal 100</span>
              <Button variant="outline" size="sm" disabled={changing || !filtered.some(p => p.active !== false)} onClick={() => setSelected(new Set(filtered.filter(p => p.active !== false).slice(0,100).map(p => p.id)))}>Pilih hasil pencarian</Button>
              <Button variant="ghost" size="sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Bersihkan pilihan</Button>
              <Button size="sm" disabled={!selection.length || changing} onClick={() => setBulk(selection.map(p => ({...p})))}>Susun Struktur Massal</Button>
            </div>}
            <Input
              aria-label={`Cari harga ${kind}`}
              placeholder={kind === 'pengecatan' ? 'Cari model, ukuran, warna, atau SKU' : 'Cari produk, ukuran, atau SKU'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {catalogProduct && <SelectField aria-label="Status produk" value={status} onChange={e => {setStatus(e.target.value);setPage(1)}}><option value="active">Produk aktif</option><option value="inactive">Produk nonaktif</option><option value="all">Semua status</option></SelectField>}
            {kind === 'produksi' && (
              <SelectField
                aria-label="Filter kategori produk"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">Semua kategori</option>
                <option value="none">Belum dikategorikan</option>
                {categories.map((c) => (
                  <option value={'category:' + c} key={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            )}
            <div className="hidden md:block">
              <TabelLokal
                label={titleOf(kind)}
                items={filtered}
                pilihan={kind === 'produksi' ? {
                  terpilih: id => selected.has(id), bisaDipilih: p => p.active !== false,
                  onUbah: selectRow, semuaDipilih: false, adaYangBisaDipilih: true, onUbahSemua: () => {},
                } : undefined}
                kolom={columns}
                idDari={(p) => p.id}
                namaDari={(p) => namaOf(p)}
                minWidth={selectedKind === 'produksi' ? 950 : 580}
              />
            </div>
            <div className="divide-y md:hidden">
              {filtered.slice((current - 1) * 15, current * 15).map((r) => (
                <div className="flex items-start justify-between gap-3 py-4" key={r.id}>
                  {kind === 'produksi' && r.active !== false && <Checkbox aria-label={`Pilih ${r.produk} ${r.ukuran}`} checked={selected.has(r.id)} onCheckedChange={checked => selectRow(r, checked === true)} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{namaOf(r)}</p>
                    {r.active === false && <span className="text-xs text-muted-foreground">Nonaktif</span>}
                    {kind === 'produksi' && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        {categoryOf(r) || 'Belum dikategorikan'}
                      </p>
                    )}
                    {kind === 'pengecatan' && <p className="mt-1 text-sm text-muted-foreground">Warna: {r.warna || 'Belum ditentukan'}</p>}
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {[r.model_kode, r.ukuran, r.sku].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {r.harga ? <>{fmtRp(r.harga)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">/ unit</span></> : <span className="font-normal text-muted-foreground">Belum ada harga</span>}
                    </p>
                    {r.harga && Number(r.harga) === 0 && <p className="text-xs text-destructive">Harga nol — periksa</p>}
                  </div>
                  {rowActions(r)}
                </div>
              ))}
              {!filtered.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada harga yang sesuai.</p>
              )}
              {filtered.length > 15 && (
                <div className="flex items-center justify-between gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs">
                    {current} / {pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {bulk && <BulkProductionStructure selected={bulk} catalog={q.data?.items || []} onClose={() => setBulk(null)} onSaved={() => {setBulk(null);setSelected(new Set())}} />}
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!busy && !o) setEdit(null)
        }}
      >
        <DialogContent className={`processing-dialog max-h-[90dvh] overflow-y-auto text-left [&_p]:text-left ${edit?.kind === 'produksi' ? 'sm:max-w-6xl' : ''}`}>
          <DialogHeader>
            <DialogTitle>{adding ? 'Tambah' : 'Edit'} {edit?.kind === 'non_kayu' ? 'produk manual' : edit?.kind === 'packing' ? 'tarif packing' : `harga ${edit?.kind}`}</DialogTitle>
            <DialogDescription>
              Harga disimpan untuk pilihan pemetaan berikutnya. Riwayat order tidak berubah.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault()
                if (editingColor) return
                if (banyak) {
                  if (kombo.masalah) { setError(kombo.masalah); return }
                  setBusy(true)
                  setError('')
                  let dibuat = 0
                  try {
                    for (const b of kombo.baris) {
                      if (disimpan.current.has(b.kunci)) { dibuat++; continue }
                      await saveProcessingPrice({ ...edit, id: crypto.randomUUID(), version: 0, varian: b.varian, ukuran: ringkasanVarian(b.varian), sku: b.sku, harga: b.harga })
                      disimpan.current.add(b.kunci)
                      dibuat++
                    }
                    await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                    setEdit(null); setCategory('all'); setSearch(''); setPage(1)
                    toast.success(dibuat > 1 ? `${dibuat} produk tersimpan` : 'Harga tersimpan')
                  } catch (err) {
                    await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                    setError(`${dibuat} dari ${kombo.baris.length} produk sudah tersimpan. ${getApiError(err)} Perbaiki lalu simpan lagi; yang sudah tersimpan tidak dibuat dua kali.`)
                  } finally {
                    setBusy(false)
                  }
                  return
                }
                if (edit.kind === 'pengecatan' && modeCat === 'otomatis' && !edit.production_price_id) { setError('Pilih model dari daftar, atau pakai cara Manual.'); return }
                const masalah = edit.kind === 'non_kayu' ? masalahVarian(edit.varian ?? []) : null
                if (masalah) { setError(masalah); return }
                setBusy(true)
                setError('')
                try {
                  await saveProcessingPrice(edit.kind === 'non_kayu' ? { ...edit, varian: bersihkanVarian(edit.varian ?? []), ukuran: ringkasanVarian(edit.varian ?? []) } : edit.kind === 'pengecatan' && modeCat === 'manual' && !edit.produk.trim() ? { ...edit, produk: TANPA_MODEL } : edit)
                  await qc.invalidateQueries({ queryKey: ['processing-prices'] })
                  if ((e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-next-size') === 'true') {
                    setAdding(true)
                    setEdit({ ...edit, id: crypto.randomUUID(), version: 0, ukuran: '', sku: '', harga: '0' })
                  } else setEdit(null)
                  setCategory('all')
                  setSearch('')
                  setPage(1)
                  toast.success('Harga tersimpan')
                } catch (err) {
                  setError(getApiError(err))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {edit.kind === 'produksi' && useHierarchy ? (
                <ProductionStructurePicker key={edit.id} value={edit} onChange={fields => setEdit(v => v ? { ...v, ...fields } : v)} />
              ) : <>
                {edit.kind === 'produksi' && <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <p>Harga ini memakai data lama. Susun kategori, produk, dan model untuk membuat SKU otomatis.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setUseHierarchy(true)}>Susun struktur</Button>
                </div>}
              {edit.kind === 'pengecatan' ? <>
                <div className="flex gap-2" role="group" aria-label="Cara memilih model">
                  {(['otomatis', 'manual'] as const).map(m => <Button key={m} type="button" size="sm" variant={modeCat === m ? 'default' : 'outline'} aria-pressed={modeCat === m} onClick={() => {
                    if (m === modeCat) return
                    setModeCat(m)
                    setEdit(v => v ? { ...v, production_price_id: '', produk: '', ukuran: '', sku: '' } : v)
                  }}>{m === 'otomatis' ? 'Otomatis (dari daftar)' : 'Manual (ketik sendiri)'}</Button>)}
                </div>
                {modeCat === 'otomatis' ? (() => {
                  const dipakai = (p: ProcessingPrice) => p.kind === 'produksi' && !!p.structure_model_id && (p.active !== false || p.id === edit.production_price_id)
                  const kata = cariModel.trim().toLocaleLowerCase('id')
                  const cocok = (q.data?.items || []).filter(p => dipakai(p) && (p.id === edit.production_price_id || [p.model, p.model_kode, p.produk, p.ukuran, p.sku].filter(Boolean).join(' ').toLocaleLowerCase('id').includes(kata)))
                  const dipilih = edit.production_price_id || ''
                  return <div className="space-y-2">
                    <Field title="Model"><Input value={cariModel} onChange={e => setCariModel(e.target.value)} placeholder="Cari model, ukuran, atau SKU" autoComplete="off" /></Field>
                    <div role="listbox" aria-label="Daftar model" className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-input bg-background p-1">
                      {cocok.length ? cocok.map(p => <button key={p.id} type="button" role="option" aria-selected={p.id === dipilih} className={cn('flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent', p.id === dipilih && 'bg-primary/10 ring-1 ring-primary')} onClick={() => setEdit(v => v ? {...v, production_price_id: p.id, produk: p.produk, ukuran: p.ukuran, sku: p.sku} : v)}>
                        <span className="font-medium">{p.model || p.produk}</span>
                        <span className="break-all text-xs text-muted-foreground">{[p.ukuran, p.sku].filter(Boolean).join(' · ')}</span>
                      </button>) : <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada model yang cocok</p>}
                    </div>
                    {kata && <p className="text-xs text-muted-foreground">{cocok.filter(p => p.id !== dipilih).length} model cocok</p>}
                  </div>
                })() : <Field title="Model (boleh dikosongkan)"><Input maxLength={300} value={edit.produk} placeholder="Contoh: Rak Piring Lantai" onChange={e => change('produk', e.target.value)} /></Field>}
              </> : (
              <Field title="Nama produk">
                <Input
                  required
                  maxLength={300}
                  value={edit.produk}
                  onChange={(e) => change('produk', e.target.value)}
                />
              </Field>
              )}
              {edit.kind === 'produksi' && (
                <>
                  <Field title="Kategori produk">
                    <Input
                      list={categoriesId}
                      maxLength={200}
                      value={edit.jenis ?? ''}
                      placeholder="Pilih atau ketik kategori"
                      onChange={(e) => change('jenis', e.target.value)}
                    />
                  </Field>
                  <datalist id={categoriesId}>
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
              {edit.kind === 'packing' && <Field title="Jenis packing"><SelectField value={edit.packing_type || 'biasa'} onChange={e => change('packing_type', e.target.value)}><option value="biasa">Biasa</option><option value="kayu">Kayu</option></SelectField></Field>}
              {edit.kind === 'pengecatan' && <ProcessingColorField onEditingChange={setEditingColor} value={edit.warna ?? ''} colors={(q.data?.items || []).filter(p => p.kind === 'pengecatan').map(p => p.warna || '')} onChange={(color, id) => setEdit(v => v ? {...v, warna:color, color_id:id} : v)} />}
              {edit.kind === 'pengecatan' ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field title="Ukuran"><Input readOnly={modeCat === 'otomatis'} required={modeCat === 'manual'} maxLength={100} value={edit.ukuran} placeholder={modeCat === 'manual' ? 'Contoh: 50x30' : undefined} onChange={e => change('ukuran', e.target.value)}/></Field><Field title={modeCat === 'manual' ? 'SKU (opsional)' : 'SKU produksi'}><Input readOnly={modeCat === 'otomatis'} maxLength={200} value={edit.sku} onChange={e => change('sku', e.target.value)}/></Field></div> : <div className={edit.kind === 'packing' || edit.kind === 'non_kayu' ? 'grid gap-3' : 'grid grid-cols-2 gap-3'}>
                {banyak ? <div className="col-span-2"><VarianBanyakPilihan key={edit.id} onChange={setKombo} /></div> : edit.kind === 'non_kayu' ? <div className="col-span-2"><ProcessingVarian value={edit.varian ?? []} onChange={varian => setEdit(v => v ? { ...v, varian } : v)} /></div> : <Field title="Ukuran">
                  <Input
                    maxLength={100}
                    value={edit.ukuran}
                    onChange={(e) => change('ukuran', e.target.value)}
                  />
                </Field>}
                {edit.kind !== 'packing' && !banyak && <>
                <Field title={edit.kind === 'non_kayu' ? 'SKU supplier (opsional)' : 'SKU Produksi (opsional)'}>
                  <Input maxLength={200} value={edit.sku} onChange={(e) => change('sku', e.target.value)} />
                </Field>
                </>}
              </div>}
              </>}
              <div className={edit.kind === 'produksi' ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
              {!banyak && <Field title={edit.kind === 'non_kayu' ? 'Harga per unit (Rp) — boleh dikosongkan, harga menyusul' : 'Harga per unit (Rp)'}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required={edit.kind !== 'non_kayu'}
                  value={edit.harga ?? ''}
                  onChange={(e) => change('harga', e.target.value)}
                />
              </Field>}
              <Field title="Keterangan">
                <Input
                  maxLength={2000}
                  value={edit.catatan}
                  onChange={(e) => change('catatan', e.target.value)}
                />
              </Field>
              </div>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter className="sticky -bottom-6 z-10 border-t bg-background py-3">
                {edit.kind === 'produksi' && useHierarchy && <Button type="submit" variant="outline" data-next-size="true" disabled={busy}>Simpan & tambah ukuran</Button>}
                <Button disabled={busy || editingColor} type="submit">
                  {busy ? 'Menyimpan…' : banyak && kombo.baris.length > 1 ? `Simpan ${kombo.baris.length} produk` : 'Simpan harga'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
