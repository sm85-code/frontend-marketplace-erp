import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProcessingCandidates, selectProcessingItems, createManualProcessingOrder, releaseProcessingJob, type CandidateStatus, type ProcessingCandidateItem } from '@/api/processing'
import { useConfirm } from '@/components/ConfirmProvider'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Field, SelectField } from './processingShared'
import { workTime, wibInputNow } from '@/lib/processingTime'

const FILTER_STATUS: { id: CandidateStatus; label: string }[] = [
  { id: 'menunggu', label: 'Menunggu penyerahan' },
  { id: 'dikirim', label: 'Dikirim' },
  { id: 'selesai', label: 'Selesai' },
  { id: 'semua', label: 'Semua' },
  { id: 'dipetakan', label: 'Sudah dipetakan' },
]
const ROUTE_LABEL = { tukang: 'Tukang', supplier: 'Supplier' } as const
const STATUS_ORDER: Record<string, string> = { to_ship: 'Menunggu penyerahan', shipped: 'Dikirim', completed: 'Selesai', cancelled: 'Dibatalkan' }

/** One dialog for both routes: filter the orders like the Pesanan menu, tick items, and send them to Tukang or Supplier without closing. */
export function OrderPicker({
  route,
  onClose,
  onSaved,
}: {
  route: 'tukang' | 'supplier'
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const confirm = useConfirm()
  const [status, setStatus] = useState<CandidateStatus>('menunggu')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const q = useQuery({
    queryKey: ['processing-candidates', status, search, page],
    queryFn: () => getProcessingCandidates(search, page, status),
  })
  const items = q.data?.items ?? []
  const perPage = q.data?.per_page ?? 25
  const mapped = status === 'dipetakan'
  const ids = items.map((r) => r.item_id)
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggle = (list: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of list) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  const groups = [...items.reduce((m, r) => m.set(r.order_id, [...(m.get(r.order_id) ?? []), r]), new Map<string, ProcessingCandidateItem[]>()).values()]
  const reload = async () => {
    await q.refetch()
    await onSaved()
  }
  const send = async (to: 'tukang' | 'supplier') => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await selectProcessingItems(to, [...selected])
      setInfo(`${selected.size} item dipetakan ke ${ROUTE_LABEL[to]}.`)
      setSelected(new Set())
      await reload()
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setBusy(false)
    }
  }
  const release = async (r: ProcessingCandidateItem) => {
    if (!r.job) return
    if (!(await confirm({ title: 'Lepas pemetaan?', description: `${r.produk}${r.varian ? ' · ' + r.varian : ''} (${r.order_number}) dikeluarkan dari ${ROUTE_LABEL[r.job.route]}. Data yang sudah diisi untuk item ini dibuang dan item bisa dipetakan ulang. Tidak ada yang dikirim ke Shopee.`, confirmLabel: 'Lepas pemetaan', destructive: true }))) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await releaseProcessingJob(r.job)
      setInfo('Pemetaan dilepas. Item bisa dipetakan lagi.')
      await reload()
    } catch (err) {
      setError(getApiError(err))
      await reload()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose()
      }}
    >
      <DialogContent className="processing-dialog flex max-h-[92dvh] flex-col gap-3 overflow-hidden text-left sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cek Pesanan</DialogTitle>
          <DialogDescription>
            Pilih item pesanan Shopee, lalu petakan ke Tukang atau Supplier. Pemetaan hanya tersimpan di sini, tidak dikirim ke Shopee.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter status pesanan">
          {FILTER_STATUS.map((f) => (
            <Button key={f.id} type="button" size="sm" className="shrink-0" variant={status === f.id ? 'default' : 'outline'} aria-pressed={status === f.id} onClick={() => { setStatus(f.id); setPage(1); setSelected(new Set()); setInfo('') }}>
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          aria-label="Cari pesanan untuk pemetaan"
          placeholder="Cari nomor pesanan, toko, produk, atau varian"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        {!mapped && items.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input className="h-4 w-4 accent-primary" type="checkbox" checked={allOn} onChange={(e) => toggle(ids, e.target.checked)} />
            Pilih semua di halaman ini ({items.length})
          </label>
        )}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {groups.map((g) => {
            const head = g[0]
            const groupIds = g.map((r) => r.item_id)
            const groupOn = groupIds.every((id) => selected.has(id))
            return (
              <section key={head.order_id} className="rounded-2xl border bg-card">
                <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{head.order_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {head.shop} · Kirim sebelum {workTime(head.deadline)}{head.status ? ` · ${STATUS_ORDER[head.status] ?? head.status}` : ''}
                    </p>
                  </div>
                  {!mapped && g.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => toggle(groupIds, !groupOn)}>
                      {groupOn ? 'Batal semua' : `Pilih ${g.length} item`}
                    </Button>
                  )}
                </header>
                <ul className="divide-y">
                  {g.map((r) => (
                    <li key={r.item_id}>
                      {mapped ? (
                        <div className="flex items-start justify-between gap-3 p-3">
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-semibold">{r.produk}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{r.varian || 'Tanpa varian'} · {r.qty} unit</p>
                            {r.job && (
                              <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                                <span className="rounded-full bg-secondary px-2 py-0.5">{ROUTE_LABEL[r.job.route]}</span>
                                {r.job.cancelled && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">Dibatalkan</span>}
                              </p>
                            )}
                          </div>
                          <Button type="button" size="sm" variant={r.job?.cancelled ? 'destructive' : 'outline'} disabled={busy} onClick={() => void release(r)}>
                            Lepas pemetaan
                          </Button>
                        </div>
                      ) : (
                        <label className={`flex cursor-pointer items-start gap-3 p-3 ${selected.has(r.item_id) ? 'bg-primary/5' : ''}`}>
                          <input
                            className="mt-1 h-5 w-5 shrink-0 accent-primary"
                            type="checkbox"
                            aria-label={`Pilih ${r.order_number} ${r.produk} ${r.varian}`}
                            checked={selected.has(r.item_id)}
                            onChange={(e) => toggle([r.item_id], e.target.checked)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{r.produk}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{r.varian || 'Tanpa varian'} · {r.qty} unit</span>
                          </span>
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {!q.isLoading && !items.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">{mapped ? 'Belum ada item yang dipetakan.' : 'Tidak ada item yang tersedia.'}</p>
          )}
          {q.isLoading && <p className="py-4 text-center text-sm">Memuat pesanan…</p>}
          {q.error && (
            <p role="alert">
              {getApiError(q.error)}{' '}
              <Button variant="outline" onClick={() => void q.refetch()}>
                Coba lagi
              </Button>
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page === 1 || q.isFetching} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-center text-xs">
            Halaman {page} · {q.data?.total || 0} item
          </span>
          <Button variant="outline" size="sm" disabled={!q.data || page * perPage >= q.data.total || q.isFetching} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {info && <p role="status" className="text-sm text-primary">{info}</p>}
        {!mapped && (
          <DialogFooter className="flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium">{selected.size ? `${selected.size} item dipilih` : 'Belum ada item dipilih'}</span>
            <div className="grid grid-cols-2 gap-2">
              {(['tukang', 'supplier'] as const).map((to) => (
                <Button key={to} type="button" variant={to === route ? 'default' : 'outline'} disabled={busy || !selected.size} onClick={() => void send(to)}>
                  {busy ? 'Memproses…' : `Ke ${ROUTE_LABEL[to]}`}
                </Button>
              ))}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ManualOrderForm({ onClose, onSaved }: { onClose: () => void; onSaved: (route: 'tukang' | 'supplier') => Promise<void> }) {
  const [source, setSource] = useState<'internal' | 'reseller'>('internal')
  const [route, setRoute] = useState<'tukang' | 'supplier'>('tukang')
  const [orderCode, setOrderCode] = useState('')
  const [sellerCode, setSellerCode] = useState('')
  const [customer, setCustomer] = useState('')
  const [reference, setReference] = useState('')
  const [ordered, setOrdered] = useState(wibInputNow)
  const [deadline, setDeadline] = useState('')
  const [items, setItems] = useState([{ produk: '', varian: '', qty: 1, note: '' }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (index: number, key: string, value: string | number) =>
    setItems((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose()
      }}
    >
      <DialogContent className="processing-dialog max-h-[90dvh] overflow-y-auto text-left sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tambah pesanan</DialogTitle>
          <DialogDescription>
            Pesanan custom/manual hanya disimpan internal. Setiap produk bisa dipetakan ke pelaksana berbeda.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              await createManualProcessingOrder({
                source,
                ...(source === 'internal' ? { order_code: orderCode } : { seller_code: sellerCode }),
                route,
                customer,
                reference,
                ordered_at: `${ordered}:00+07:00`,
                deadline: `${deadline}:00+07:00`,
                items,
              })
              await onSaved(route)
              onClose()
            } catch (err) {
              setError(getApiError(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field title="Jenis pesanan">
            <SelectField value={source} onChange={e => setSource(e.target.value as 'internal' | 'reseller')}>
              <option value="internal">Internal</option>
              <option value="reseller">Penjual lain / reseller</option>
            </SelectField>
          </Field>
          {source === 'internal' ? <Field title="Kode pesanan">
            <Input required maxLength={200} value={orderCode} onChange={e => setOrderCode(e.target.value)} placeholder="Ketik kode pesanan internal" />
          </Field> : <div className="space-y-2">
            <Field title="Kode penjual lain (2 huruf)">
              <Input required maxLength={2} pattern="[A-Za-z]{2}" value={sellerCode} onChange={e => setSellerCode(e.target.value.toUpperCase())} placeholder="Contoh: AB" />
            </Field>
            <p className="text-xs text-muted-foreground">Kode per produk dibuat setelah SKU produksi dipilih: SKU produksi–DDMM batas kirim–kode penjual–nomor urut (01, 02, dst.).</p>
          </div>}
          <Field title="Dikerjakan oleh">
            <SelectField value={route} onChange={e => setRoute(e.target.value as 'tukang' | 'supplier')}>
              <option value="tukang">Tukang kayu</option>
              <option value="supplier">Supplier</option>
            </SelectField>
          </Field>
          <p className="text-sm text-muted-foreground">
            {source === 'reseller' && route === 'tukang'
              ? 'Biaya proses Rp10.000 per unit berlaku untuk pesanan reseller yang dikerjakan tukang kayu.'
              : route === 'supplier' ? 'Tanpa biaya proses reseller. Barang dari supplier langsung ke packing setelah diterima.' : 'Tanpa biaya proses reseller. Pengecatan dilakukan oleh karyawan tanpa tagihan jasa.'}
          </p>
          <Field title={source === 'reseller' ? 'Nama reseller' : 'Nama pemesan'}>
            <Input required maxLength={200} value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </Field>
          <Field title="Nomor referensi (opsional)">
            <Input maxLength={200} value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field title="Tanggal pesanan (WIB)">
              <Input
                required
                type="datetime-local"
                value={ordered}
                onChange={(e) => setOrdered(e.target.value)}
              />
            </Field>
            <Field title="Kirim sebelum (WIB)">
              <Input
                required
                type="datetime-local"
                min={ordered}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>
          </div>
          {items.map((r, i) => (
            <fieldset key={i} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Produk {i + 1}</legend>
              <Field title="Nama produk">
                <Input
                  required
                  maxLength={300}
                  value={r.produk}
                  onChange={(e) => update(i, 'produk', e.target.value)}
                />
              </Field>
              <Field title="Ukuran / spesifikasi">
                <Input
                  maxLength={300}
                  value={r.varian}
                  onChange={(e) => update(i, 'varian', e.target.value)}
                />
              </Field>
              <Field title="Jumlah unit">
                <Input
                  required
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={r.qty}
                  onChange={(e) => update(i, 'qty', Number(e.target.value))}
                />
              </Field>
              <Field title="Catatan">
                <Input maxLength={2000} value={r.note} onChange={(e) => update(i, 'note', e.target.value)} />
              </Field>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItems((v) => v.filter((_, n) => n !== i))}
                >
                  Hapus produk {i + 1}
                </Button>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={items.length >= 100}
            onClick={() => setItems((v) => [...v, { produk: '', varian: '', qty: 1, note: '' }])}
          >
            Tambah produk
          </Button>
          <p className="text-sm text-muted-foreground">
            Harga produksi, warna, pengecatan, dan packing diatur setelah item masuk tabel. Biaya proses
            otomatis Rp10.000/unit produk buatan tukang.
          </p>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan pesanan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
