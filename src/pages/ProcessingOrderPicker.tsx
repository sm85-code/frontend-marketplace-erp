import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProcessingCandidates, selectProcessingItems, createManualProcessingOrder } from '@/api/processing'
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Field, SelectField } from './processingShared'
import { workTime, wibInputNow } from '@/lib/processingTime'

export function OrderPicker({
  route,
  onClose,
  onSaved,
}: {
  route: 'tukang' | 'supplier'
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['processing-candidates', search, page],
    queryFn: () => getProcessingCandidates(search, page),
  })
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose()
      }}
    >
      <DialogContent className="processing-dialog max-h-[90dvh] overflow-y-auto text-left sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Cek Pesanan — {route === 'tukang' ? 'Tukang Kayu' : 'Supplier'}</DialogTitle>
          <DialogDescription>
            Pilih per produk/varian dari pesanan Shopee yang sudah diproses, dikirim, atau selesai. Item yang
            sudah masuk salah satu pemetaan tidak ditampilkan lagi.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Cari pesanan untuk pemetaan"
          placeholder="Cari nomor pesanan, toko, produk, atau varian"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <div className="hidden overflow-x-auto md:block">
          <Table style={{ minWidth: 850 }}>
            <TableHeader>
              <TableRow>
                {[
                  'Pilih',
                  'Pesanan / Toko',
                  'Produk / Varian',
                  'Jumlah',
                  'Tanggal pesanan',
                  'Kirim sebelum',
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.items.map((r) => (
                <TableRow key={r.item_id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${r.order_number} ${r.produk} ${r.varian}`}
                      checked={selected.has(r.item_id)}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(r.item_id)
                          else next.delete(r.item_id)
                          return next
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {r.order_number}
                    <div className="text-xs text-muted-foreground">{r.shop}</div>
                  </TableCell>
                  <TableCell>
                    {r.produk}
                    <div className="text-xs">{r.varian}</div>
                  </TableCell>
                  <TableCell>{r.qty}</TableCell>
                  <TableCell>{workTime(r.ordered_at)}</TableCell>
                  <TableCell>{workTime(r.deadline)}</TableCell>
                </TableRow>
              ))}
              {!q.isLoading && !q.data?.items.length && (
                <TableRow>
                  <TableCell colSpan={6}>Tidak ada item yang tersedia.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 md:hidden">
          {q.data?.items.map((r) => (
            <label
              key={r.item_id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${selected.has(r.item_id) ? 'border-primary bg-primary/5' : 'bg-card'}`}
            >
              <input
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                type="checkbox"
                aria-label={`Pilih ${r.order_number} ${r.produk} ${r.varian}`}
                checked={selected.has(r.item_id)}
                onChange={(e) =>
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (e.target.checked) next.add(r.item_id)
                    else next.delete(r.item_id)
                    return next
                  })
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{r.produk}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {r.varian || 'Tanpa varian'} · {r.qty} unit
                </span>
                <span className="mt-3 block text-xs font-medium">{r.order_number}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.shop}</span>
                <span className="mt-2 grid gap-1 border-t pt-2 text-xs text-muted-foreground">
                  <span>Dipesan: {workTime(r.ordered_at)}</span>
                  <span>Kirim sebelum: {workTime(r.deadline)}</span>
                </span>
              </span>
            </label>
          ))}
          {!q.isLoading && !q.data?.items.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada item yang tersedia.</p>
          )}
        </div>
        {q.isLoading && <p>Memuat pesanan…</p>}
        {q.error && (
          <p role="alert">
            {getApiError(q.error)}{' '}
            <Button variant="outline" onClick={() => void q.refetch()}>
              Coba lagi
            </Button>
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={page === 1 || q.isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-center text-xs">
            Halaman {page} · {q.data?.total || 0} item
          </span>
          <Button
            variant="outline"
            disabled={!q.data || page * 25 >= q.data.total || q.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={busy || !selected.size}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await selectProcessingItems(route, [...selected])
                await onSaved()
                onClose()
              } catch (err) {
                setError(getApiError(err))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Menambahkan…' : `Tambahkan ${selected.size} item`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ManualOrderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [source, setSource] = useState<'internal' | 'reseller'>('internal')
  const [route, setRoute] = useState<'tukang' | 'supplier'>('tukang')
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
                route,
                customer,
                reference,
                ordered_at: `${ordered}:00+07:00`,
                deadline: `${deadline}:00+07:00`,
                items,
              })
              await onSaved()
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
