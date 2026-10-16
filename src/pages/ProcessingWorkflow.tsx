import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { OrderPicker, ResellerForm } from './ProcessingOrderPicker'
import { POL0S, SelectField } from './processingShared'
import { workTime } from '@/lib/processingTime'

const STAGES = {
  draft: 'Belum dipetakan',
  produksi: 'Dalam produksi',
  supplier: 'Menunggu barang',
  pengecatan: 'Menunggu pengecatan',
  packing: 'Menunggu packing',
  siap_kirim: 'Siap Kirim',
}
type WorkTable = 'tukang' | 'supplier' | 'pengecatan' | 'packing'
const NAMES: Record<WorkTable, string> = {
  tukang: 'Produksi Tukang Kayu',
  supplier: 'Supplier',
  pengecatan: 'Pengecatan',
  packing: 'Packing',
}
const timeKey = {
  tukang: 'production_done_at',
  supplier: 'received_at',
  pengecatan: 'painting_done_at',
  packing: 'packing_done_at',
} as const
function PriceOptions({ prices }: { prices: ProcessingPrice[] }) {
  return (
    <>
      {prices.map((p) => (
        <option key={p.id} value={p.id}>
          {[p.produk, p.ukuran, p.sku].filter(Boolean).join(' · ')} — {fmtRp(p.harga)}
          {p.sumber ? ` · ${p.sumber}` : ''}
        </option>
      ))}
    </>
  )
}
function Detail({ job }: { job: ProcessingJob }) {
  return (
    <>
      <div className="font-medium">
        {job.source === 'erp' ? (
          <Link className="underline" to={`/pesanan/${job.order_id}`}>
            {job.order_number}
          </Link>
        ) : (
          job.order_number
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {job.source === 'reseller' ? `Reseller: ${job.customer}` : job.shop}
      </div>
      {job.reference && <div className="text-xs">Ref: {job.reference}</div>}
      {job.order_cancelled && <Badge variant="destructive">Periksa pembatalan pesanan</Badge>}
    </>
  )
}
function Product({ job }: { job: ProcessingJob }) {
  return (
    <div className="flex min-w-52 max-w-80 gap-2">
      {job.foto && <img className="h-12 w-12 rounded-md object-cover" loading="lazy" alt="" src={job.foto} />}
      <div className="whitespace-normal">
        <div>{job.produk}</div>
        <div className="text-sm text-muted-foreground">{job.varian}</div>
        {job.note && <p className="text-xs font-medium">Catatan: {job.note}</p>}
      </div>
    </div>
  )
}

function WorkflowRow({
  job,
  table,
  catalog,
  prices,
  onSaved,
}: {
  job: ProcessingJob
  table: WorkTable
  catalog: ProcessingCatalog | null | undefined
  prices: ProcessingPrice[]
  onSaved: () => Promise<void>
}) {
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
  const editable =
    (table === 'tukang' || table === 'supplier') && ['draft', 'produksi', 'supplier'].includes(job.stage)
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await onSaved()
      toast.success('Processing tersimpan')
    } catch (err) {
      setError(getApiError(err))
      toast.error(getApiError(err))
      await onSaved()
    } finally {
      setBusy(false)
    }
  }
  const set = (k: keyof ProcessingJobEdit, value: string) => setEdit((v) => ({ ...v, [k]: value }))
  const choosePrice = (id: string) => {
    const p = prices.find((x) => x.id === id)
    setEdit((v) => ({
      ...v,
      price_id: id,
      production_price: id === job.price_id ? job.production_price : p?.harga || null,
    }))
  }
  const choosePaint = (id: string) => {
    const p = prices.find((x) => x.id === id)
    setEdit((v) => ({
      ...v,
      paint_price_id: id,
      paint_price: id === job.paint_price_id ? job.paint_price : p?.harga || '0',
    }))
  }
  const stage = table === 'tukang' ? 'produksi' : table
  const completed = job[timeKey[table]]
  const next =
    stage === 'produksi' && job.color !== POL0S
      ? 'pengecatan'
      : stage === 'packing'
        ? 'siap_kirim'
        : 'packing'
  const canReopen = Boolean(completed) && job.stage === next
  const [now] = useState(() => Date.now())
  const tooLate = !completed && job.deadline && new Date(job.deadline).getTime() < now
  const parties = job.route === 'tukang' ? catalog?.tukang : catalog?.supplier
  const valid = Boolean(
    edit.party_id &&
      edit.production_price !== null &&
      (edit.price_id || job.source === 'reseller' || job.route === 'supplier') &&
      (job.route === 'supplier' || edit.color.trim()),
  )
  const dirty =
    JSON.stringify(edit) !==
    JSON.stringify({
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
  return (
    <>
      <TableRow data-job-id={job.id}>
        <TableCell>
          <Detail job={job} />
        </TableCell>
        <TableCell>
          <Product job={job} />
        </TableCell>
        <TableCell>{job.qty}</TableCell>
        <TableCell className="whitespace-nowrap">{workTime(job.ordered_at)}</TableCell>
        <TableCell className="whitespace-nowrap">
          {workTime(job.deadline)}
          {tooLate && (
            <Badge variant="destructive" className="block w-fit">
              Lewat batas kirim
            </Badge>
          )}
        </TableCell>
        {table === 'tukang' || table === 'supplier' ? (
          <>
            <TableCell>
              {editable ? (
                <SelectField
                  aria-label={`Pelaksana ${job.produk}`}
                  value={edit.party_id}
                  onChange={(e) => set('party_id', e.target.value)}
                >
                  <option value="">Pilih {job.route === 'tukang' ? 'tukang' : 'supplier'}</option>
                  {parties?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </SelectField>
              ) : (
                job.party_name
              )}
            </TableCell>
            <TableCell className="min-w-72">
              {editable ? (
                <div className="space-y-2">
                  <SelectField
                    aria-label={`Harga produksi ${job.produk}`}
                    value={edit.price_id}
                    onChange={(e) => choosePrice(e.target.value)}
                  >
                    <option value="">
                      {job.source === 'reseller' || job.route === 'supplier'
                        ? 'Isi harga custom / harga beli'
                        : 'Pilih produk produksi'}
                    </option>
                    <PriceOptions prices={prices.filter((p) => p.kind === 'produksi')} />
                  </SelectField>
                  <Input
                    aria-label={`Harga per unit ${job.produk}`}
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!!edit.price_id}
                    value={edit.production_price ?? ''}
                    onChange={(e) => set('production_price', e.target.value)}
                  />
                </div>
              ) : (
                fmtRp(job.production_price || '0')
              )}
              <p className="mt-1 text-xs text-muted-foreground">Total: {fmtRp(job.production_total)}</p>
            </TableCell>
            <TableCell className="min-w-44">
              {editable && job.route === 'tukang' ? (
                <>
                  <Input
                    aria-label={`Warna ${job.produk}`}
                    placeholder="Warna / Polos"
                    value={edit.color}
                    maxLength={200}
                    onChange={(e) => set('color', e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEdit((v) => ({ ...v, color: POL0S, paint_price: '0', paint_price_id: '' }))
                    }
                  >
                    Polos / Tanpa Cat
                  </Button>
                </>
              ) : (
                job.color || '—'
              )}
            </TableCell>
            <TableCell className="min-w-64">
              {job.source === 'reseller' && job.route === 'tukang' && edit.color !== POL0S ? (
                editable ? (
                  <div className="space-y-2">
                    <SelectField
                      aria-label={`Tarif pengecatan ${job.produk}`}
                      value={edit.paint_price_id}
                      onChange={(e) => choosePaint(e.target.value)}
                    >
                      <option value="">Isi tarif custom</option>
                      <PriceOptions prices={prices.filter((p) => p.kind === 'pengecatan')} />
                    </SelectField>
                    <Input
                      aria-label={`Harga pengecatan ${job.produk}`}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!!edit.paint_price_id}
                      value={edit.paint_price}
                      onChange={(e) => set('paint_price', e.target.value)}
                    />
                  </div>
                ) : (
                  fmtRp(job.paint_price)
                )
              ) : (
                <span className="text-muted-foreground">
                  {job.source === 'erp' ? 'Tanpa tagihan jasa internal' : 'Tanpa cat'}
                </span>
              )}
            </TableCell>
            <TableCell className="min-w-44">
              {editable ? (
                <div className="space-y-2">
                  <SelectField
                    aria-label={`Jenis packing ${job.produk}`}
                    value={edit.packing_type}
                    onChange={(e) => set('packing_type', e.target.value)}
                  >
                    <option value="biasa">Biasa</option>
                    <option value="kayu">Kayu</option>
                  </SelectField>
                  <Input
                    aria-label={`Harga packing ${job.produk}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={edit.packing_price}
                    onChange={(e) => set('packing_price', e.target.value)}
                  />
                </div>
              ) : (
                <>
                  {job.packing_type} · {fmtRp(job.packing_price)}/unit
                </>
              )}
              <span className="block text-xs text-muted-foreground">
                {job.source === 'reseller' ? 'Tagihan reseller' : 'Biaya internal'}
              </span>
            </TableCell>
            <TableCell>{fmtRp(job.process_fee)}</TableCell>
            <TableCell>{job.reseller_total === null ? '—' : fmtRp(job.reseller_total)}</TableCell>
          </>
        ) : (
          <>
            <TableCell>{job.color || '—'}</TableCell>
            <TableCell>{job.party_name}</TableCell>
            {table === 'packing' ? (
              <>
                <TableCell>
                  <SelectField
                    disabled={job.stage !== 'packing'}
                    aria-label={`Jenis packing ${job.produk}`}
                    value={edit.packing_type}
                    onChange={(e) => set('packing_type', e.target.value)}
                  >
                    <option value="biasa">Biasa</option>
                    <option value="kayu">Kayu</option>
                  </SelectField>
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={`Harga packing ${job.produk}`}
                    disabled={job.stage !== 'packing'}
                    type="number"
                    min="0"
                    step="0.01"
                    value={edit.packing_price}
                    onChange={(e) => set('packing_price', e.target.value)}
                  />
                  <div className="text-xs">
                    {job.source === 'reseller' ? 'Tagihan reseller' : 'Biaya internal'} / unit
                  </div>
                  {job.stage === 'packing' && dirty && (
                    <Button
                      size="sm"
                      disabled={busy || edit.packing_price === ''}
                      onClick={() =>
                        void run(() => editProcessingPacking(job, edit.packing_type, edit.packing_price))
                      }
                    >
                      Simpan packing
                    </Button>
                  )}
                </TableCell>
              </>
            ) : (
              <TableCell>
                {job.source === 'reseller' ? fmtRp(job.paint_price) : 'Tanpa tagihan jasa internal'}
              </TableCell>
            )}
          </>
        )}
        <TableCell className="min-w-48">
          <Badge variant="secondary">{STAGES[job.stage]}</Badge>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`${table === 'supplier' ? 'Diterima' : 'Selesai'} ${table} ${job.produk}`}
              checked={!!completed}
              disabled={busy || job.order_cancelled || job.stage !== stage || dirty}
              onChange={() => void run(() => transitionProcessingJob(job, stage))}
            />
            {table === 'supplier' ? 'Diterima' : 'Selesai'}
          </label>
          <div className="mt-1 whitespace-nowrap text-xs">
            {workTime(completed)}
            {completed ? ' WIB' : ''}
          </div>
        </TableCell>
        <TableCell className="min-w-44 space-y-2">
          {editable && (
            <Button
              disabled={busy || !valid || job.order_cancelled || (!dirty && job.stage !== 'draft')}
              onClick={() => void run(() => editProcessingJob(job.id, edit))}
            >
              {job.stage === 'draft' ? 'Petakan' : 'Simpan perubahan'}
            </Button>
          )}
          {canReopen && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (
                  await confirm({
                    title: 'Buka kembali pekerjaan?',
                    description:
                      'Status tahap ini dibuka kembali. Riwayat penyelesaian tetap tersimpan; tidak ada perubahan ke Shopee.',
                  })
                )
                  void run(() => transitionProcessingJob(job, stage, true))
              }}
            >
              Buka kembali
            </Button>
          )}
          {job.stage === 'draft' && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                if (
                  await confirm({
                    title: 'Hapus draf pemetaan?',
                    description: 'Item ERP akan tersedia kembali di Cek Pesanan.',
                    destructive: true,
                  })
                )
                  void run(() => removeProcessingDraft(job))
              }}
            >
              Hapus draf
            </Button>
          )}
          <details>
            <summary className="cursor-pointer text-xs">Riwayat</summary>
            <ul className="mt-2 space-y-1 text-xs">
              {job.events.map((ev, i) => (
                <li key={i}>
                  {ev.action.replaceAll('_', ' ')} · {workTime(ev.at)} WIB
                </li>
              ))}
            </ul>
          </details>
        </TableCell>
      </TableRow>
      {error && (
        <TableRow>
          <TableCell colSpan={16} role="alert" className="text-destructive">
            {error}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
function WorkTableCard({
  table,
  items,
  catalog,
  prices,
  onSaved,
  onPick,
}: {
  table: WorkTable
  items: ProcessingJob[]
  catalog: ProcessingCatalog | null | undefined
  prices: ProcessingPrice[]
  onSaved: () => Promise<void>
  onPick: (route: 'tukang' | 'supplier') => void
}) {
  const [page, setPage] = useState(1)
  const maxPage = Math.max(1, Math.ceil(items.length / 20))
  const current = Math.min(page, maxPage)
  const sourceTable = table === 'tukang' || table === 'supplier'
  const headers = [
    'Pesanan / Sumber',
    'Produk / Varian',
    'Jumlah',
    'Tanggal pesanan (WIB)',
    'Kirim sebelum (WIB)',
    ...(sourceTable
      ? [
          'Pelaksana',
          'Harga produksi / beli per unit',
          'Warna',
          'Pengecatan / unit',
          'Packing / unit',
          'Biaya proses',
          'Tagihan reseller',
        ]
      : table === 'packing'
        ? ['Warna', 'Asal pelaksana', 'Jenis packing', 'Harga packing / unit']
        : ['Warna', 'Tukang asal', 'Tarif pengecatan / unit']),
    'Status / Tanggal selesai',
    'Aksi',
  ]
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            {NAMES[table]} <span className="text-sm font-normal">({items.length})</span>
          </CardTitle>
          {sourceTable && (
            <Button variant="outline" onClick={() => onPick(table)}>
              Cek Pesanan
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {table === 'tukang'
            ? 'Pilih tukang dan harga, tentukan warna serta packing, lalu Petakan. Selesai produksi diteruskan otomatis sesuai kebutuhan cat.'
            : table === 'supplier'
              ? 'Barang dari supplier langsung ke packing internal setelah diterima. Default packing biasa.'
              : table === 'pengecatan'
                ? 'Produk berwarna masuk setelah produksi selesai. Polos / Tanpa Cat melewati tahap ini.'
                : 'Dikerjakan internal. Centang selesai untuk menandai Siap Kirim; tidak mengubah status Shopee.'}
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <div className="overflow-x-auto rounded-xl border">
          <Table aria-label={NAMES[table]} style={{ minWidth: sourceTable ? 2300 : 1350 }}>
            <TableHeader className="bg-muted">
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.slice((current - 1) * 20, current * 20).map((job) => (
                <WorkflowRow
                  key={`${job.id}:${job.version}`}
                  job={job}
                  table={table}
                  catalog={catalog}
                  prices={prices}
                  onSaved={onSaved}
                />
              ))}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">
                    Belum ada item.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {items.length > 20 && (
          <div className="flex justify-between gap-3">
            <Button variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>
              Sebelumnya
            </Button>
            <span>
              {current} / {maxPage}
            </span>
            <Button variant="outline" disabled={current === maxPage} onClick={() => setPage(current + 1)}>
              Berikutnya
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProcessingWorkflow({ catalog }: { catalog: ProcessingCatalog | null | undefined }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['processing-jobs'], queryFn: getProcessingJobs })
  const prices = useQuery({ queryKey: ['processing-prices'], queryFn: getProcessingPrices })
  const [picker, setPicker] = useState<'tukang' | 'supplier' | null>(null)
  const [manual, setManual] = useState(false)
  const [search, setSearch] = useState('')
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['processing-jobs'] }),
      qc.invalidateQueries({ queryKey: ['processing-candidates'] }),
    ])
  }
  const items = (q.data?.items || []).filter((r) =>
    [r.order_number, r.produk, r.varian, r.customer, r.shop, r.party_name, r.color]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Proses internal per item. Belum membentuk jurnal, pembayaran, atau perubahan ke Shopee.
        </p>
        <Button onClick={() => setManual(true)}>Tambah Pesanan Reseller</Button>
      </div>
      <Input
        aria-label="Cari pemetaan order"
        placeholder="Cari pesanan, reseller, toko, produk, atau pelaksana"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!catalog && (
        <p role="alert">
          Muat data tukang dan supplier pada tab Data terlebih dahulu agar pemetaan dapat disimpan.
        </p>
      )}
      {q.isLoading && <p>Memuat pemetaan…</p>}
      {(q.error || prices.error) && (
        <p role="alert">
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
        </p>
      )}
      {(['tukang', 'supplier', 'pengecatan', 'packing'] as const).map((table) => (
        <WorkTableCard
          key={table}
          table={table}
          items={items.filter((r) =>
            table === 'tukang' || table === 'supplier'
              ? r.route === table
              : table === 'pengecatan'
                ? !!r.production_done_at && r.color !== POL0S
                : !!r.received_at || !!r.painting_done_at || (!!r.production_done_at && r.color === POL0S),
          )}
          catalog={catalog}
          prices={prices.data?.items || []}
          onSaved={refresh}
          onPick={setPicker}
        />
      ))}
      {picker && <OrderPicker route={picker} onClose={() => setPicker(null)} onSaved={refresh} />}{' '}
      {manual && <ResellerForm onClose={() => setManual(false)} onSaved={refresh} />}
      <p className="text-xs text-muted-foreground">
        Seluruh jumlah pada satu baris diselesaikan bersamaan. Biaya packing toko sendiri dicatat sebagai
        biaya internal; angka di sini belum masuk laporan keuangan.
      </p>
    </div>
  )
}
