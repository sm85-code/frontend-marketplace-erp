import { useState } from 'react'
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
import { OrderPicker, ResellerForm } from './ProcessingOrderPicker'
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
          {[p.produk, p.ukuran, p.warna, p.sku].filter(Boolean).join(' · ')} — {fmtRp(p.harga)}
        </option>
      ))}
    </>
  )
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
  prices,
  packingOnly,
  onClose,
  onSaved,
}: {
  job: ProcessingJob
  catalog: ProcessingCatalog | null | undefined
  prices: ProcessingPrice[]
  packingOnly: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [edit, setEdit] = useState<ProcessingJobEdit>({
    version: job.version,
    party_id: job.party_id,
    price_id: job.price_id,
    production_price: job.production_price,
    color: job.color,
    paint_price_id: job.paint_price_id,
    paint_price: job.paint_price,
    packing_type: job.packing_type,
    packing_price: job.packing_price,
  })
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
            production_price: id === job.price_id ? job.production_price : p?.harga || null,
          },
    )
  }
  const valid = packingOnly
    ? edit.packing_price !== ''
    : Boolean(
        edit.party_id &&
          edit.production_price !== null &&
          edit.production_price !== '' &&
          (edit.price_id || job.source === 'reseller' || job.route === 'supplier') &&
          (job.route === 'supplier' || edit.color.trim()),
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
            {job.order_number} · {job.source === 'reseller' ? job.customer : job.shop}
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
              if (packingOnly) await editProcessingPacking(job, edit.packing_type, edit.packing_price)
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
                <Field title="Produk pada daftar harga produksi">
                  <SelectField value={edit.price_id} onChange={(e) => pickPrice(e.target.value)}>
                    <option value="">
                      {job.source === 'reseller' || job.route === 'supplier'
                        ? 'Harga custom / harga beli manual'
                        : 'Pilih produk produksi'}
                    </option>
                    <PriceOptions prices={prices.filter((p) => p.kind === 'produksi')} />
                  </SelectField>
                </Field>
                <Field title="Harga produksi / beli per unit (Rp)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={!!edit.price_id || (job.source !== 'reseller' && job.route !== 'supplier')}
                    value={edit.production_price ?? ''}
                    onChange={(e) => set('production_price', e.target.value)}
                  />
                </Field>
              </section>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Jenis packing">
                <SelectField value={edit.packing_type} onChange={(e) => set('packing_type', e.target.value)}>
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
                  onChange={(e) => set('packing_price', e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {job.source === 'reseller'
                ? 'Packing masuk ke tagihan reseller.'
                : 'Dicatat sebagai biaya packing internal.'}
            </p>
          </section>
          {job.source === 'reseller' && (
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="mb-2 text-sm font-semibold">Ringkasan tagihan · {job.qty} unit</p>
              <Amount label="Produksi" value={String(Number(edit.production_price || 0) * job.qty)} />
              <Amount
                label="Pengecatan"
                value={String((edit.color !== POL0S ? Number(edit.paint_price || 0) : 0) * job.qty)}
              />
              <Amount label="Packing" value={String(Number(edit.packing_price || 0) * job.qty)} />
              <Amount label="Proses" value={job.process_fee} />
              <div className="mt-2 border-t pt-2">
                <Amount
                  label="Total estimasi"
                  value={String(
                    (Number(edit.production_price || 0) +
                      (edit.color !== POL0S ? Number(edit.paint_price || 0) : 0) +
                      Number(edit.packing_price || 0)) *
                      job.qty +
                      Number(job.process_fee),
                  )}
                />
              </div>
            </div>
          )}
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
            {job.order_number} · {job.source === 'reseller' ? job.customer : job.shop}
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
          <Amount label="Total packing" value={job.packing_total} />
          {job.source === 'reseller' && (
            <>
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

export default function ProcessingWorkflow({ catalog }: { catalog: ProcessingCatalog | null | undefined }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-jobs'], queryFn: getProcessingJobs })
  const prices = useQuery({ queryKey: ['processing-prices'], queryFn: getProcessingPrices })
  const confirm = useConfirm()
  const [table, setTable] = useState<WorkTable>('tukang')
  const [picker, setPicker] = useState<'tukang' | 'supplier' | null>(null)
  const [manual, setManual] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<{ job: ProcessingJob; packingOnly: boolean } | null>(null)
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
        {r.stage === 'draft' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={!!busy}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Hapus draf pemetaan?',
                  description: 'Item ERP akan tersedia kembali di Cek Pesanan.',
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
        <p className="mt-1 text-xs text-muted-foreground">
          {r.qty} unit{table === 'packing' ? ` · Packing ${r.packing_type}` : ''}
        </p>
      </div>
    </div>
  )
  const order = (r: ProcessingJob) => (
    <div className="space-y-1">
      <p className="max-w-44 truncate text-xs font-medium" title={r.order_number}>
        {r.order_number}
      </p>
      <p className="text-xs text-muted-foreground">{r.source === 'reseller' ? r.customer : r.shop}</p>
      {r.source === 'reseller' && (
        <Badge variant="outline" className="text-[10px]">
          Reseller
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
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">aktif</span>
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
              <Button variant="outline" onClick={() => setManual(true)}>
                Pesanan Reseller
              </Button>
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
                  ? 'Pilih item dari Cek Pesanan atau tambahkan pesanan reseller.'
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
                style={{ minWidth: 940 }}
              >
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    {[
                      'Produk',
                      'Pesanan',
                      'Pelaksana',
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
      {manual && (
        <ResellerForm
          onClose={() => setManual(false)}
          onSaved={async () => {
            await refresh()
            setTable('tukang')
            setStatus('all')
            setSearch('')
            setPage(1)
          }}
        />
      )}
      {editing && (
        <MappingEditor
          key={`${editing.job.id}:${editing.job.version}`}
          {...editing}
          catalog={catalog}
          prices={prices.data?.items || []}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}{' '}
      {detail && <JobDetails job={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
