import { labelVarian, namaDenganVarian } from '@/lib/varianProduk'
import { useState } from 'react'
import SupplierCatalogPanel from './SupplierCatalogPanel'
import ProcessingColorField from './ProcessingColorField'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Hammer,
  Truck,
  Paintbrush,
  Package,
  Search,
  Plus,
  ClipboardList,
  Pencil,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getProcessingJobs,
  getProcessingPrices,
  editProcessingJob,
  transitionProcessingJob,
  removeProcessingDraft,
  releaseProcessingJob,
  resetProcessingJob,
  editProcessingPacking,
  type ProcessingCatalog,
  type ProcessingJob,
  type ProcessingPrice,
  type ProcessingJobEdit,
} from '@/api/processing'
import { fmtRp, getApiError } from '@/api/client'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { OrderPicker } from './ProcessingOrderPicker'
import { cn } from '@/lib/utils'
import { POL0S, SelectField, Field } from './processingShared'
import { workTime } from '@/lib/processingTime'

const STAGES = {
  draft: 'Belum dipetakan',
  produksi: 'Dalam produksi',
  supplier: 'Menunggu barang',
  pengecatan: 'Menunggu cat',
  packing: 'Menunggu packing',
  siap_kirim: 'Siap kirim',
}
const TABLES = {
  tukang: { name: 'Tukang Kayu', icon: Hammer, time: 'production_done_at', stage: 'produksi' },
  supplier: { name: 'Supplier', icon: Truck, time: 'received_at', stage: 'supplier' },
  pengecatan: { name: 'Pengecatan', icon: Paintbrush, time: 'painting_done_at', stage: 'pengecatan' },
  packing: { name: 'Packing', icon: Package, time: 'packing_done_at', stage: 'packing' },
} as const
type WorkTable = keyof typeof TABLES
function belongs(r: ProcessingJob, t: WorkTable) {
  return t === 'tukang' || t === 'supplier'
    ? r.route === t
    : t === 'pengecatan'
      ? !!r.production_done_at && r.color !== POL0S
      : !!r.received_at || !!r.painting_done_at || (!!r.production_done_at && r.color === POL0S)
}
function pending(r: ProcessingJob, t: WorkTable) {
  return r.stage === TABLES[t].stage || (r.stage === 'draft' && r.route === t)
}
function PriceOptions({ prices }: { prices: ProcessingPrice[] }) {
  return (
    <>
      {prices.map((p) => (
        <option key={p.id} value={p.id}>
          {[p.kind === 'pengecatan' ? p.model || p.produk : p.produk, p.kind === 'pengecatan' ? '' : p.model || p.kode, labelVarian(p), p.warna, p.kind === 'packing' ? p.packing_type || 'biasa' : '', p.sku].filter(Boolean).join(' · ')} — {p.harga ? fmtRp(p.harga) : 'Belum ada harga'}
        </option>
      ))}
    </>
  )
}
function ProductionPricePicker({ prices, value, onChange, manual }: {
  prices: ProcessingPrice[]; value: string; onChange: (id: string) => void; manual: boolean
}) {
  const [search, setSearch] = useState('')
  const production = prices.filter(p => p.kind === 'produksi' && !!p.structure_model_id)
  const matches = production.filter(p => [p.produk, p.jenis, p.kode, p.model, p.model_kode, p.ukuran, p.sku].filter(Boolean).join(' ').toLocaleLowerCase('id').includes(search.trim().toLocaleLowerCase('id')))
  const selected = production.find(p => p.id === value)
  const visible = selected && !matches.some(p => p.id === value) ? [selected, ...matches] : matches
  return <div className="space-y-2">
    <Field title="Cari harga produksi"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, model, ukuran, atau SKU" /></Field>
    <div className="grid gap-1 text-sm">
      <span className="font-medium" id="produksi-daftar">Produk pada daftar harga produksi</span>
      <div role="listbox" aria-labelledby="produksi-daftar" className="max-h-60 space-y-1 overflow-y-auto rounded-2xl border border-input bg-background p-1">
        {manual && (
          <button type="button" role="option" aria-selected={value === ''} className={cn('flex w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent', value === '' && 'bg-primary/10 ring-1 ring-primary')} onClick={() => onChange('')}>
            Harga custom / harga beli manual
          </button>
        )}
        {visible.map(p => (
          <button key={p.id} type="button" role="option" aria-selected={p.id === value} className={cn('flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent', p.id === value && 'bg-primary/10 ring-1 ring-primary')} onClick={() => onChange(p.id)}>
            <span className="flex items-start justify-between gap-3">
              <span className="font-medium">{[p.produk, p.model || p.kode].filter(Boolean).join(' · ')}</span>
              <span className="shrink-0 font-semibold tabular-nums">{p.harga ? fmtRp(p.harga) : 'Belum ada harga'}</span>
            </span>
            <span className="break-all text-xs text-muted-foreground">{[labelVarian(p), p.sku].filter(Boolean).join(' · ')}</span>
          </button>
        ))}
        {!visible.length && !manual && <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada produk yang cocok</p>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{matches.length} dari {production.length} produk terstruktur.</p>
    {value && !production.some(p => p.id === value) && <p className="text-xs text-muted-foreground">Pemetaan ini memakai harga lama yang tersimpan. Pilih produk terstruktur untuk menggantinya.</p>}
    {!matches.length && search.trim() && <p role="status" className="text-xs text-muted-foreground">Tidak ada produk yang cocok. Coba nama, model, atau ukuran lainnya.</p>}
  </div>
}
function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{fmtRp(value)}</span>
    </div>
  )
}

function MappingEditor({
  job,
  catalog,
  prices: catalogPrices,
  packingOnly,
  catalogMode,
  onClose,
  onSaved,
}: {
  job: ProcessingJob
  catalog: ProcessingCatalog | null | undefined
  prices: ProcessingPrice[]
  packingOnly: boolean
  catalogMode?: 'manual' | 'otomatis'
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const prices = [...new Map([
    ...[job.production_reference, job.painting_reference].filter((p): p is ProcessingPrice => !!p).map(p => [p.id, p] as const),
    ...catalogPrices.map(p => [p.id, p] as const),
  ]).values()]
  const [edit, setEdit] = useState<ProcessingJobEdit>({
    version: job.version,
    party_id: job.party_id,
    price_id: job.price_id,
    production_price: job.production_price,
    production_sku: job.production_sku || '',
    catalog_mode: catalogMode || job.catalog_mode || 'manual',
    supplier_product_id: job.supplier_product_id || '',
    supplier_product_name: job.supplier_product_name || job.produk,
    supplier_sku: job.supplier_sku || '',
    refresh_catalog_price: false,
    color: job.color,
    paint_price_id: job.paint_price_id,
    paint_price: job.paint_price,
    packing_type: job.packing_type,
    packing_price: job.packing_price,
    packing_by: job.packing_by ?? 'internal',
    packing_party_id: job.packing_party_id ?? '',
  })
  const [packingTariff, setPackingTariff] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const parties = job.route === 'tukang' ? catalog?.tukang : catalog?.supplier
  const set = (k: keyof ProcessingJobEdit, v: string) => setEdit((p) => ({ ...p, [k]: v }))
  const pickPrice = (id: string, paint = false) => {
    const p = prices.find((r) => r.id === id)
    setEdit((v) =>
      paint
        ? {
            ...v,
            color: id === job.paint_price_id ? job.color : p?.warna || v.color,
            paint_price_id: id,
            paint_price: id === job.paint_price_id ? job.paint_price : p?.harga || '0',
          }
        : {
            ...v,
            price_id: id,
            production_sku: id === job.price_id ? job.production_sku || p?.sku || '' : p?.sku || '',
            production_price: id === job.price_id ? job.production_price : p?.harga || null,
          },
    )
  }
  const valid = packingOnly
    ? edit.packing_price !== '' && (edit.packing_by !== 'supplier' || !!edit.packing_party_id)
    : Boolean(
        (edit.packing_by !== 'supplier' || !!edit.packing_party_id) &&
          edit.party_id &&
          edit.production_price !== null &&
          edit.production_price !== '' &&
          (edit.price_id || job.source !== 'erp' || job.route === 'supplier') &&
          (job.route === 'supplier' || edit.color.trim()) &&
          (job.route !== 'supplier' || edit.catalog_mode !== 'otomatis' || !!edit.supplier_product_id),
      )
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose()
      }}
    >
      <DialogContent className="processing-dialog max-h-[90dvh] overflow-y-auto text-left [&_p]:text-left sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {packingOnly ? 'Atur packing' : job.stage === 'draft' ? 'Petakan produk' : 'Edit pemetaan'}
          </DialogTitle>
          <DialogDescription>
            <span className="break-all">{job.order_number}</span> · {job.source !== 'erp' ? job.customer : job.shop}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-background">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">{job.produk}</p>
            <p className="text-sm text-muted-foreground">
              {job.varian || 'Tanpa varian'} · {job.qty} unit
            </p>
          </div>
        </div>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              if (packingOnly) await editProcessingPacking(job, edit.packing_type, edit.packing_price, edit.packing_by, edit.packing_party_id)
              else await editProcessingJob(job.id, edit)
              await onSaved()
              onClose()
              toast.success('Pemetaan tersimpan')
            } catch (err) {
              setError(getApiError(err))
              toast.error(getApiError(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          {!packingOnly && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">
                  01 · {job.route === 'tukang' ? 'Pelaksana & produksi' : 'Supplier & harga beli'}
                </h3>
                <Field title={job.route === 'tukang' ? 'Tukang kayu' : 'Supplier'}>
                  <SelectField
                    required
                    value={edit.party_id}
                    onChange={(e) => set('party_id', e.target.value)}
                  >
                    <option value="">Pilih {job.route === 'tukang' ? 'tukang kayu' : 'supplier'}</option>
                    {parties?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </SelectField>
                </Field>
                {job.route === 'supplier' ? <div className="space-y-3">
                  <Field title="Katalog produk"><SelectField value={edit.catalog_mode || 'manual'} onChange={e => setEdit(v => ({ ...v, catalog_mode: e.target.value as 'manual' | 'otomatis', price_id: '', supplier_product_id: '', refresh_catalog_price: false }))}>
                    <option value="manual">Manual</option><option value="otomatis">Otomatis</option>
                  </SelectField></Field>
                  {edit.catalog_mode === 'otomatis' ? <SupplierCatalogPanel selectedId={edit.supplier_product_id} onPick={p => setEdit(v => ({ ...v, supplier_product_id: p.id, supplier_product_name: p.name, supplier_sku: p.sku, production_sku: p.sku, production_price: p.sell_price, refresh_catalog_price: true, price_id: '' }))} /> : <>
                    <Field title="Produk katalog manual"><SelectField value={edit.price_id} onChange={e => {
                      pickPrice(e.target.value)
                      const p = prices.find(p => p.id === e.target.value)
                      setEdit(v => ({ ...v, supplier_product_name: p ? namaDenganVarian(p) : v.supplier_product_name, supplier_sku: p?.sku || '', production_sku: p?.sku || '', production_price: p ? p.harga || null : v.production_price }))
                    }}><option value="">Isi produk dan harga sendiri</option><PriceOptions prices={prices.filter(p => p.kind === 'non_kayu' || p.id === job.price_id)} /></SelectField></Field>
                    {!!edit.price_id && !prices.find(p => p.id === edit.price_id)?.harga && edit.production_price === null && <p role="alert" className="text-sm text-destructive">Produk ini belum punya harga. Isi dulu lewat Edit di Katalog Produk Non Kayu › Katalog Manual, lalu pilih lagi.</p>}
                    <Field title="Nama produk supplier"><Input required maxLength={300} value={edit.supplier_product_name || ''} disabled={!!edit.price_id} onChange={e => set('supplier_product_name', e.target.value)} /></Field>
                    <Field title="SKU supplier (opsional)"><Input maxLength={200} disabled={!!edit.price_id} value={edit.supplier_sku || ''} onChange={e => setEdit(v => ({ ...v, supplier_sku: e.target.value, production_sku: e.target.value }))} /></Field>
                  </>}
                  <Field title="Harga beli per unit (Rp)"><Input required type="number" min="0" step="0.01" disabled={edit.catalog_mode === 'otomatis' || !!edit.price_id} value={edit.production_price ?? ''} onChange={e => set('production_price', e.target.value)} /></Field>
                  {edit.catalog_mode === 'otomatis' && job.supplier_reference && !edit.refresh_catalog_price && <p className="text-xs text-muted-foreground">Harga pada order memakai harga tersimpan. Klik Gunakan harga terkini untuk memperbarui harga pada pemetaan ini.</p>}
                </div> : <>
                <ProductionPricePicker prices={prices} value={edit.price_id} onChange={id => pickPrice(id)} manual={job.source !== 'erp'} />
                <Field title="Harga produksi / beli per unit (Rp)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={!!edit.price_id || job.source === 'erp'}
                    value={edit.production_price ?? ''}
                    onChange={(e) => set('production_price', e.target.value)}
                  />
                </Field>
                </>}
              </section>
              {job.source === 'reseller' && job.seller_code && <Field title="SKU produksi untuk kode pesanan">
                <Input required maxLength={200} disabled={(job.route === 'supplier' && edit.catalog_mode === 'otomatis') || (!!edit.price_id && !!prices.find(p => p.id === edit.price_id)?.sku)} value={edit.production_sku || ''} onChange={e => set('production_sku', e.target.value)} placeholder="Pilih harga produksi atau isi SKU custom" />
              </Field>}
              {job.route === 'tukang' && (
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">02 · Finishing</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={edit.color === POL0S ? 'default' : 'outline'}
                      onClick={() =>
                        setEdit((v) => ({ ...v, color: POL0S, paint_price: '0', paint_price_id: '' }))
                      }
                    >
                      Polos / Tanpa Cat
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={edit.color && edit.color !== POL0S ? 'default' : 'outline'}
                      onClick={() => set('color', edit.color === POL0S ? '' : edit.color)}
                    >
                      Dengan cat
                    </Button>
                  </div>
                  {edit.color !== POL0S && (
                    <ProcessingColorField
                      value={edit.color}
                      colors={prices.filter(p => p.kind === 'pengecatan').map(p => p.warna || '')}
                      onChange={color => setEdit(v => ({ ...v, color, paint_price_id: '', paint_price: '0' }))}
                    />
                  )}
                  {job.source === 'reseller' && edit.color !== POL0S && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field title="Tarif pengecatan">
                        <SelectField
                          value={edit.paint_price_id}
                          onChange={(e) => pickPrice(e.target.value, true)}
                        >
                          <option value="">Tarif custom</option>
                          <PriceOptions prices={prices.filter((p) => p.kind === 'pengecatan')} />
                        </SelectField>
                      </Field>
                      <Field title="Harga pengecatan / unit (Rp)">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          disabled={!!edit.paint_price_id}
                          value={edit.paint_price}
                          onChange={(e) => set('paint_price', e.target.value)}
                        />
                      </Field>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">
              {packingOnly ? 'Packing' : job.route === 'tukang' ? '03 · Packing' : '02 · Packing'}
            </h3>
            <Field title="Tarif packing"><SelectField value={packingTariff} onChange={e => {
              setPackingTariff(e.target.value)
              const p = prices.find(p => p.id === e.target.value)
              if(p) setEdit(v => ({ ...v, packing_type: p.packing_type || 'biasa', packing_price: p.harga ?? '' }))
            }}><option value="">Manual / biaya fleksibel</option><PriceOptions prices={prices.filter(p => p.kind === 'packing')} /></SelectField></Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Jenis packing">
                <SelectField value={edit.packing_type} onChange={(e) => { setPackingTariff(''); set('packing_type', e.target.value) }}>
                  <option value="biasa">Packing biasa</option>
                  <option value="kayu">Packing kayu</option>
                </SelectField>
              </Field>
              <Field title="Harga packing / unit (Rp)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={edit.packing_price}
                  onChange={(e) => { setPackingTariff(''); set('packing_price', e.target.value) }}
                />
              </Field>
            </div>
            <Field title="Dipacking oleh">
              <SelectField value={edit.packing_by ?? 'internal'} onChange={(e) => setEdit((v) => ({ ...v, packing_by: e.target.value as 'internal' | 'supplier', packing_party_id: '' }))}>
                <option value="internal">Internal</option>
                <option value="supplier">Supplier</option>
              </SelectField>
            </Field>
            {edit.packing_by === 'supplier' && (
              <Field title="Supplier yang packing">
                <SelectField required value={edit.packing_party_id ?? ''} onChange={(e) => set('packing_party_id', e.target.value)}>
                  <option value="">Pilih supplier</option>
                  {catalog?.supplier?.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </SelectField>
              </Field>
            )}
            <p className="text-xs text-muted-foreground">
              {job.source === 'reseller'
                ? job.route === 'tukang' && edit.color !== POL0S && edit.packing_type === 'biasa' && edit.packing_by !== 'supplier'
                  ? 'Packing biasa sudah termasuk di biaya cat; tidak dibayar dan tidak ditagihkan terpisah.'
                  : 'Packing masuk ke tagihan reseller.'
                : 'Dicatat sebagai biaya packing internal.'}
            </p>
          </section>
          {job.source === 'reseller' && (() => {
            const cat = edit.color !== POL0S ? Number(edit.paint_price || 0) : 0
            const harga = Number(edit.production_price || 0) * job.qty
            const termasuk = job.route === 'tukang' && edit.color !== POL0S && edit.packing_type === 'biasa' && edit.packing_by !== 'supplier'
            const packing = Number(edit.packing_price || 0)
            const catPacking = (cat + (edit.packing_type === 'biasa' && !termasuk ? packing : 0)) * job.qty
            const kayu = edit.packing_type === 'kayu' ? packing * job.qty : 0
            return (
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="mb-2 text-sm font-semibold">Ringkasan tagihan · {job.qty} unit</p>
                <Amount label="Harga produk" value={String(harga)} />
                <Amount label="Cat + packing" value={String(catPacking)} />
                {kayu > 0 && <Amount label="Packing kayu" value={String(kayu)} />}
                <Amount label="Biaya proses" value={job.process_fee} />
                <div className="mt-2 border-t pt-2">
                  <Amount label="Total estimasi" value={String(harga + catPacking + kayu + Number(job.process_fee))} />
                </div>
                {termasuk && <p className="mt-2 text-xs text-muted-foreground">Packing biasa sudah termasuk di biaya cat, tidak ditagihkan terpisah.</p>}
              </div>
            )
          })()}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button disabled={busy || !valid || job.order_cancelled} type="submit">
              {busy
                ? 'Menyimpan…'
                : packingOnly
                  ? 'Simpan packing'
                  : job.stage === 'draft'
                    ? 'Petakan'
                    : 'Simpan perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function JobDetails({ job, onClose }: { job: ProcessingJob; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="processing-dialog max-h-[90dvh] overflow-y-auto text-left [&_p]:text-left sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detail pekerjaan</DialogTitle>
          <DialogDescription>
            <span className="break-all">{job.order_number}</span> · {job.source !== 'erp' ? job.customer : job.shop}
          </DialogDescription>
        </DialogHeader>
        <div>
          <p className="font-semibold">{job.produk}</p>
          <p className="text-sm text-muted-foreground">
            {job.varian} · {job.qty} unit
          </p>
          {job.note && <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm">{job.note}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4 text-sm">
          {[
            ['Tanggal pesanan', workTime(job.ordered_at)],
            ['Kirim sebelum', workTime(job.deadline)],
            ['Pelaksana', job.party_name || 'Belum dipilih'],
            ['Warna', job.color || 'Belum ditentukan'],
            ['Produksi selesai', workTime(job.production_done_at)],
            ['Barang diterima', workTime(job.received_at)],
            ['Cat selesai', workTime(job.painting_done_at)],
            ['Packing selesai', workTime(job.packing_done_at)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-1 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Amount label="Total produksi / beli" value={job.production_total} />
          <Amount label="Total pengecatan" value={job.paint_total} />
          <Amount label={job.packing_termasuk_cat ? 'Total packing (termasuk di cat)' : 'Total packing'} value={job.packing_total} />
          {job.source === 'reseller' && (
            <>
              <Amount label="Harga produk" value={job.harga_produk_total || '0'} />
              <Amount label="Cat + packing" value={job.cat_packing_total || '0'} />
              {Number(job.packing_kayu_total || 0) > 0 && <Amount label="Packing kayu" value={job.packing_kayu_total || '0'} />}
              <Amount label="Biaya proses" value={job.process_fee} />
              <Amount label="Tagihan reseller" value={job.reseller_total || '0'} />
            </>
          )}
        </div>
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-medium">Riwayat pekerjaan</summary>
          <ol className="mt-3 space-y-3">
            {job.events.map((e, i) => (
              <li key={i} className="border-l-2 border-primary/20 pl-3">
                <p className="text-sm capitalize">{e.action.replaceAll('_', ' ')}</p>
                <p className="text-xs text-muted-foreground">{workTime(e.at)} WIB</p>
              </li>
            ))}
          </ol>
        </details>
        {job.source === 'erp' && (
          <Button asChild variant="outline">
            <Link to={`/pesanan/${job.order_id}`}>
              Lihat pesanan ERP <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** A job made from an order of the Pesanan menu (a marketplace order or a manual one), as opposed to a legacy hand-typed job. */
const dariPesanan = (r: { source: string; item_id?: string }) => r.source === 'erp' || !!r.item_id

export default function ProcessingWorkflow({ catalog }: { catalog: ProcessingCatalog | null | undefined }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-jobs'], queryFn: getProcessingJobs })
  const prices = useQuery({ queryKey: ['processing-prices'], queryFn: getProcessingPrices })
  // The API includes imported rows and applies retirement overrides consistently.
  const priceOptions = prices.data?.items || []
  const confirm = useConfirm()
  const [table, setTable] = useState<WorkTable>('tukang')
  const [picker, setPicker] = useState<'tukang' | 'supplier' | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<{ job: ProcessingJob; packingOnly: boolean; catalogMode?: 'manual' | 'otomatis' } | null>(null)
  const [detail, setDetail] = useState<ProcessingJob | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const all = q.data?.items || []
  const meta = TABLES[table]
  const sourceTable = table === 'tukang' || table === 'supplier'
  const items = all.filter(
    (r) =>
      belongs(r, table) &&
      (status === 'all' || (status === 'active' ? pending(r, table) : !!r[meta.time])) &&
      [r.order_number, r.produk, r.varian, r.customer, r.shop, r.party_name, r.color]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const maxPage = Math.max(1, Math.ceil(items.length / 15))
  const current = Math.min(page, maxPage)
  const shown = items.slice((current - 1) * 15, current * 15)
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['processing-jobs'] }),
      qc.invalidateQueries({ queryKey: ['processing-candidates'] }),
    ])
  }
  const run = async (job: ProcessingJob, action: () => Promise<unknown>) => {
    setBusy(job.id)
    try {
      await action()
      await refresh()
      toast.success('Pekerjaan diperbarui')
    } catch (err) {
      toast.error(getApiError(err))
      await refresh()
    } finally {
      setBusy(null)
    }
  }
  const progress = (r: ProcessingJob) => {
    const completed = r[meta.time]
    return (
      <div className="space-y-1.5">
        <Badge
          variant={r.order_cancelled ? 'destructive' : r.stage === 'siap_kirim' ? 'default' : 'secondary'}
        >
          {r.order_cancelled ? 'Periksa pembatalan' : STAGES[r.stage]}
        </Badge>
        {(r.stage === meta.stage || completed) && (
          <label className="flex items-center gap-2 text-xs">
            <input
              className="h-4 w-4 accent-primary"
              type="checkbox"
              aria-label={`${table === 'supplier' ? 'Diterima' : 'Selesai'} ${table} ${r.produk}`}
              checked={!!completed}
              disabled={!!busy || r.order_cancelled || r.stage !== meta.stage}
              onChange={() => void run(r, () => transitionProcessingJob(r, meta.stage))}
            />
            {table === 'supplier' ? 'Diterima' : 'Selesai'}
            {busy === r.id ? '…' : ''}
          </label>
        )}
        {completed && (
          <p className="whitespace-nowrap text-xs text-muted-foreground">{workTime(completed)}</p>
        )}
      </div>
    )
  }
  const actions = (r: ProcessingJob) => {
    const completed = r[meta.time]
    const next =
      table === 'tukang' && r.color !== POL0S ? 'pengecatan' : table === 'packing' ? 'siap_kirim' : 'packing'
    const editable =
      (sourceTable && ['draft', 'produksi', 'supplier'].includes(r.stage)) ||
      (table === 'packing' && r.stage === 'packing')
    return (
      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <Button
            size="sm"
            variant={r.stage === 'draft' ? 'default' : 'outline'}
            disabled={!!busy || r.order_cancelled}
            onClick={() => setEditing({ job: r, packingOnly: table === 'packing' })}
          >
            {r.stage === 'draft' ? (
              'Petakan'
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </>
            )}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
          Detail
        </Button>
        {completed && r.stage === next && (
          <Button
            size="sm"
            variant="ghost"
            disabled={!!busy}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Buka kembali pekerjaan?',
                  description: 'Tahap ini akan dibuka kembali. Riwayat penyelesaian tetap tersimpan.',
                })
              )
                void run(r, () => transitionProcessingJob(r, meta.stage, true))
            }}
          >
            Buka kembali
          </Button>
        )}
        {dariPesanan(r) && r.stage !== 'draft' && (
          <Button
            size="sm"
            variant={r.order_cancelled ? 'destructive' : 'ghost'}
            disabled={!!busy}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Lepas pemetaan?',
                  description: 'Item dikeluarkan dari pemetaan, data yang sudah diisi dibuang, dan item muncul lagi di Cek Pesanan untuk dipetakan ulang. Tidak ada yang dikirim ke Shopee.',
                  confirmLabel: 'Lepas pemetaan',
                  destructive: true,
                })
              )
                void run(r, () => releaseProcessingJob(r))
            }}
          >
            Lepas pemetaan
          </Button>
        )}
        {!dariPesanan(r) && r.stage !== 'draft' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={!!busy}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Batalkan pemetaan?',
                  description: 'Tukang atau supplier, harga, warna, packing, dan progres diatur ulang ke draf. Data pesanan manual (pemesan, tanggal, item) tetap ada dan bisa dipetakan lagi.',
                  confirmLabel: 'Batalkan pemetaan',
                  destructive: true,
                })
              )
                void run(r, () => resetProcessingJob(r))
            }}
          >
            Batalkan pemetaan
          </Button>
        )}
        {(r.stage === 'draft' || !dariPesanan(r)) && (
          <Button
            size="sm"
            variant="ghost"
            disabled={!!busy}
            onClick={async () => {
              if (
                await confirm({
                  title: dariPesanan(r) ? 'Hapus draf pemetaan?' : 'Hapus pesanan manual?',
                  description:
                    dariPesanan(r)
                      ? 'Item ERP akan tersedia kembali di Cek Pesanan.'
                      : 'Pesanan manual ini dihapus beserta data yang sudah diisi di semua tahap. Tindakan ini tidak bisa dibatalkan.',
                  confirmLabel: 'Hapus',
                  destructive: true,
                })
              )
                void run(r, () => removeProcessingDraft(r))
            }}
          >
            Hapus
          </Button>
        )}
      </div>
    )
  }
  const product = (r: ProcessingJob) => (
    <div className="flex min-w-0 items-start gap-3">
      {r.foto ? (
        <img
          loading="lazy"
          src={r.foto}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg border object-cover"
        />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
          <Package className="h-4 w-4 text-muted-foreground" />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-medium leading-snug">{r.produk}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[r.varian, r.color && r.color !== r.varian ? r.color : ''].filter(Boolean).join(' · ') ||
            'Spesifikasi belum diisi'}
        </p>
        {r.supplier_product_name && <p className="mt-1 break-words text-xs text-muted-foreground">Katalog: {r.supplier_product_name}{r.supplier_sku ? ` · ${r.supplier_sku}` : ''}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {r.qty} unit{table === 'packing' ? ` · Packing ${r.packing_type}${r.packing_by === 'supplier' && r.packing_party_name ? ` oleh ${r.packing_party_name}` : ''}` : ''}
        </p>
      </div>
    </div>
  )
  const order = (r: ProcessingJob) => (
    <div className="space-y-1">
      <p className="break-all text-xs font-medium" title={r.order_number}>
        {r.order_number}
      </p>
      <p className="text-xs text-muted-foreground">{r.source !== 'erp' ? r.customer : r.shop}</p>
      {r.source !== 'erp' && (
        <Badge variant="outline" className="text-[10px]">
          {r.source === 'reseller' ? 'Reseller' : 'Internal'}
        </Badge>
      )}
    </div>
  )
  return (
    <div className="min-w-0 space-y-5 text-left [&_p]:text-left">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {(Object.keys(TABLES) as WorkTable[]).map((t) => {
          const Icon = TABLES[t].icon
          const count = all.filter((r) => belongs(r, t) && pending(r, t)).length
          return (
            <button
              key={t}
              aria-label={`Tabel ${TABLES[t].name}`}
              aria-pressed={table === t}
              onClick={() => {
                setTable(t)
                setPage(1)
              }}
              className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-colors sm:p-4 ${table === t ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/40'}`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${table === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-muted-foreground">
                  {TABLES[t].name}
                </span>
                <span className="mt-0.5 block text-xl font-semibold tabular-nums">
                  {count}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">pekerjaan aktif</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <section className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="space-y-4 border-b p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {table === 'tukang' ? 'Produksi Tukang Kayu' : meta.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {table === 'tukang'
                  ? 'Atur pelaksana dan pantau penyelesaian setiap produk.'
                  : table === 'supplier'
                    ? 'Catat penerimaan barang sebelum diteruskan ke packing.'
                    : table === 'pengecatan'
                      ? 'Antrean produk berwarna yang telah selesai diproduksi.'
                      : 'Selesaikan packing biasa atau kayu sebelum barang siap dikirim.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sourceTable && (
                <Button onClick={() => setPicker(table)}>
                  <Plus className="h-4 w-4" /> Cek Pesanan
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                aria-label="Cari pemetaan order"
                placeholder="Cari pesanan, produk, atau pelaksana…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <SelectField
              aria-label="Filter status pekerjaan"
              className="sm:w-44"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="completed">Selesai tahap ini</option>
            </SelectField>
          </div>
        </div>
        {!catalog && (
          <p role="alert" className="border-b bg-muted/30 px-5 py-3 text-sm">
            Muat daftar tukang dan supplier melalui tab Data untuk mulai memetakan.
          </p>
        )}
        {(q.error || prices.error) && (
          <div role="alert" className="p-5 text-sm text-destructive">
            {getApiError(q.error || prices.error)}{' '}
            <Button
              variant="outline"
              onClick={() => {
                void q.refetch()
                void prices.refetch()
              }}
            >
              Coba lagi
            </Button>
          </div>
        )}
        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Memuat pekerjaan…</div>
        ) : !items.length ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </span>
            <h3 className="text-sm font-semibold">
              {search || status !== 'all'
                ? 'Tidak ada hasil yang cocok'
                : `Belum ada pekerjaan ${meta.name.toLowerCase()}`}
            </h3>
            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
              {search || status !== 'all'
                ? 'Ubah pencarian atau filter status untuk melihat pekerjaan lain.'
                : sourceTable
                  ? 'Pilih item dari Cek Pesanan atau tambahkan pesanan manual.'
                  : table === 'pengecatan'
                    ? 'Produk yang perlu dicat otomatis masuk setelah produksi selesai.'
                    : 'Produk otomatis masuk setelah produksi, pengecatan, atau penerimaan supplier selesai.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table
                aria-label={table === 'tukang' ? 'Produksi Tukang Kayu' : meta.name}
                style={{ minWidth: table === 'supplier' ? 1180 : 940 }}
              >
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    {[
                      'Produk',
                      'Pesanan',
                      'Pelaksana',
                      ...(table === 'supplier' ? ['Katalog produk'] : []),
                      'Kirim sebelum',
                      'Biaya / unit',
                      'Status',
                      'Aksi',
                    ].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="w-[25%] min-w-56">{product(r)}</TableCell>
                      <TableCell>{order(r)}</TableCell>
                      <TableCell className="text-sm">
                        {r.party_name || <span className="text-muted-foreground">Belum dipilih</span>}
                      </TableCell>
                      {table === 'supplier' && <TableCell><SelectField aria-label={`Katalog produk ${r.produk}`} value={r.catalog_mode || 'manual'} disabled={r.order_cancelled || !['draft','supplier'].includes(r.stage)} onChange={e => setEditing({job:r, packingOnly:false, catalogMode:e.target.value as 'manual' | 'otomatis'})}><option value="manual">Manual</option><option value="otomatis">Otomatis</option></SelectField></TableCell>}
                      <TableCell className="whitespace-nowrap text-xs">
                        {workTime(r.deadline)}
                        {r.deadline && !r[meta.time] && new Date(r.deadline).getTime() < now && (
                          <span className="mt-1 block text-destructive">Lewat batas kirim</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium tabular-nums">
                        {r.stage === 'draft'
                          ? '—'
                          : fmtRp(
                              table === 'packing'
                                ? r.packing_price
                                : table === 'pengecatan'
                                  ? r.paint_price
                                  : r.production_price || '0',
                            )}
                      </TableCell>
                      <TableCell>{progress(r)}</TableCell>
                      <TableCell className="max-w-52">{actions(r)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y md:hidden">
              {shown.map((r) => (
                <article key={r.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">{product(r)}</div>
                    <Badge variant="outline" className="shrink-0">
                      {r.qty} unit
                    </Badge>
                  </div>
                  {table === 'supplier' && <Field title="Katalog produk"><SelectField aria-label={`Katalog produk ${r.produk}`} value={r.catalog_mode || 'manual'} disabled={r.order_cancelled || !['draft','supplier'].includes(r.stage)} onChange={e => setEditing({job:r, packingOnly:false, catalogMode:e.target.value as 'manual' | 'otomatis'})}><option value="manual">Manual</option><option value="otomatis">Otomatis</option></SelectField></Field>}
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-3">
                    {order(r)}
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Kirim sebelum
                      </p>
                      <p className="mt-1 text-xs">{workTime(r.deadline)}</p>
                      {r.deadline && !r[meta.time] && new Date(r.deadline).getTime() < now && (
                        <p className="mt-1 text-xs text-destructive">Lewat batas kirim</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {r.party_name || 'Pelaksana belum dipilih'}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {r.stage === 'draft'
                          ? 'Harga belum dipilih'
                          : `${fmtRp(table === 'packing' ? r.packing_price : table === 'pengecatan' ? r.paint_price : r.production_price || '0')} / unit`}
                      </p>
                    </div>
                    {progress(r)}
                  </div>
                  <div className="border-t pt-3">{actions(r)}</div>
                </article>
              ))}
            </div>
          </>
        )}
        {!!items.length && (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {(current - 1) * 15 + 1}–{Math.min(current * 15, items.length)} dari {items.length} item
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current === maxPage}
                onClick={() => setPage(current + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </section>
      <div className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Waktu penyelesaian dicatat otomatis dalam WIB. Satu item diselesaikan untuk seluruh jumlah unitnya.
        </p>
      </div>
      {picker && (
        <OrderPicker
          route={picker}
          onClose={() => setPicker(null)}
          onSaved={async () => {
            await refresh()
            setStatus('all')
            setSearch('')
            setPage(1)
          }}
        />
      )}{' '}
      {editing && (
        <MappingEditor
          key={`${editing.job.id}:${editing.job.version}`}
          {...editing}
          catalog={catalog}
          prices={priceOptions}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}{' '}
      {detail && <JobDetails job={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
