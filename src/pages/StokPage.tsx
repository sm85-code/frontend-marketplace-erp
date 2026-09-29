import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { stokApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import type { ProdukOut } from '@/api/types'
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import TableCard from '@/components/TableCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { produkName, useById, useGudangList, useProdukList } from '@/hooks/queries'
import { fmtDateTime, fmtNumber, fmtSignedQty } from '@/lib/format'
import { reasonLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { stokAdjustSchema, toStokAdjustPayload, type StokAdjustValues } from '@/schemas/forms'

const LIMITS = [50, 100, 200, 500] as const

function AdjustDialog({
  open,
  onOpenChange,
  produk,
  initialProdukId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  produk: ProdukOut[]
  initialProdukId: string
}) {
  const qc = useQueryClient()
  const gudangQ = useGudangList()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StokAdjustValues>({
    resolver: zodResolver(stokAdjustSchema),
    defaultValues: { produk_id: '', arah: 'masuk', qty: '', gudang_id: '', catatan: '' },
  })

  useEffect(() => {
    if (open) reset({ produk_id: initialProdukId, arah: 'masuk', qty: '', gudang_id: '', catatan: '' })
  }, [open, initialProdukId, reset])

  const [produkId, arah, qty] = watch(['produk_id', 'arah', 'qty'])
  const current = produk.find((p) => p.id === produkId)
  const qtyNum = Number(qty)
  const preview =
    current && Number.isInteger(qtyNum) && qtyNum > 0 ? current.stok + (arah === 'keluar' ? -qtyNum : qtyNum) : null

  const onSubmit = async (values: StokAdjustValues) => {
    try {
      const res = await stokApi.adjust(toStokAdjustPayload(values))
      toast.success(`Stok ${res.sku_induk} sekarang ${fmtNumber(res.stok)}`)
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.produk }),
        qc.invalidateQueries({ queryKey: qk.ledgerAll }),
      ])
      onOpenChange(false)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Penyesuaian stok</DialogTitle>
          <DialogDescription>Setiap penyesuaian dicatat di ledger (reason: adjust).</DialogDescription>
        </DialogHeader>
        <form id="adjust-form" className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Produk" htmlFor="adj-produk" error={errors.produk_id?.message}>
            <NativeSelect id="adj-produk" {...register('produk_id')}>
              <option value="">— Pilih produk —</option>
              {produk.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku_induk} · {p.nama} (stok {p.stok})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Jenis" htmlFor="adj-arah">
              <NativeSelect id="adj-arah" {...register('arah')}>
                <option value="masuk">Stok masuk (+)</option>
                <option value="keluar">Stok keluar (−)</option>
              </NativeSelect>
            </Field>
            <Field label="Jumlah" htmlFor="adj-qty" error={errors.qty?.message}>
              <Input id="adj-qty" inputMode="numeric" {...register('qty')} />
            </Field>
          </div>
          <Field label="Gudang" htmlFor="adj-gudang" hint="Kosong = gudang DEFAULT">
            <NativeSelect id="adj-gudang" {...register('gudang_id')}>
              <option value="">Default</option>
              {(gudangQ.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.kode} · {g.nama}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Catatan" htmlFor="adj-catatan">
            <Textarea id="adj-catatan" rows={2} placeholder="Mis. stock opname, barang rusak" {...register('catatan')} />
          </Field>
          {current ? (
            <p className={cn('rounded-lg bg-muted px-3 py-2 text-sm', preview !== null && preview < 0 && 'text-destructive')}>
              Stok tersedia: <b>{fmtNumber(current.stok)}</b>
              {preview !== null ? (
                <>
                  {' '}
                  → <b>{fmtNumber(preview)}</b>
                  {preview < 0 ? ' (tidak cukup)' : ''}
                </>
              ) : null}
            </p>
          ) : null}
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="adjust-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Simpan penyesuaian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function StokPage() {
  const produkQ = useProdukList()
  const produkMap = useById(produkQ.data)
  const [search, setSearch] = useState('')
  const [ledgerProduk, setLedgerProduk] = useState('')
  const [limit, setLimit] = useState<number>(100)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustProduk, setAdjustProduk] = useState('')

  const ledgerQ = useQuery({
    queryKey: qk.ledger(ledgerProduk || undefined, limit),
    queryFn: () => stokApi.ledger({ produk_id: ledgerProduk || undefined, limit }),
  })

  const stokRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (produkQ.data ?? []).filter(
      (p) => !q || p.sku_induk.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q),
    )
  }, [produkQ.data, search])

  const openAdjust = (produkId = '') => {
    setAdjustProduk(produkId)
    setAdjustOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Stok"
        description="Stok tersedia = stok fisik dikurangi reservasi pesanan yang sedang diproses."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                produkQ.refetch()
                ledgerQ.refetch()
              }}
              disabled={produkQ.isFetching || ledgerQ.isFetching}
            >
              <RefreshCw className={produkQ.isFetching || ledgerQ.isFetching ? 'animate-spin' : ''} /> Muat ulang
            </Button>
            <Button onClick={() => openAdjust()} disabled={!produkQ.data?.length}>
              <SlidersHorizontal /> Sesuaikan stok
            </Button>
          </>
        }
      />

      <div className="grid gap-6">
        <section>
          <h2 className="mb-2 text-base font-semibold">Stok saat ini</h2>
          <TableCard
            toolbar={
              <Field label="Cari" htmlFor="s-search" className="min-w-48 flex-1">
                <Input id="s-search" placeholder="SKU / nama" value={search} onChange={(e) => setSearch(e.target.value)} />
              </Field>
            }
          >
            {produkQ.isLoading ? (
              <LoadingState />
            ) : produkQ.isError ? (
              <ErrorState message={getApiError(produkQ.error)} onRetry={() => produkQ.refetch()} />
            ) : stokRows.length === 0 ? (
              <EmptyState title="Belum ada produk" hint="Tambahkan SKU induk di menu Produk." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU induk</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Tersedia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stokRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku_induk}</TableCell>
                      <TableCell>{p.nama}</TableCell>
                      <TableCell className={cn('text-right font-semibold', p.stok <= 0 && 'text-destructive')}>
                        {fmtNumber(p.stok)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={p.aktif ? 'success' : 'muted'}>{p.aktif ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openAdjust(p.id)}>
                            Sesuaikan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setLedgerProduk(p.id)}>
                            Ledger
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableCard>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Ledger stok</h2>
          <TableCard
            toolbar={
              <>
                <Field label="Produk" htmlFor="lg-produk" className="min-w-56 flex-1">
                  <NativeSelect id="lg-produk" value={ledgerProduk} onChange={(e) => setLedgerProduk(e.target.value)}>
                    <option value="">Semua produk</option>
                    {(produkQ.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku_induk} · {p.nama}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Jumlah baris" htmlFor="lg-limit" className="w-32">
                  <NativeSelect id="lg-limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                    {LIMITS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            }
          >
            {ledgerQ.isLoading ? (
              <LoadingState />
            ) : ledgerQ.isError ? (
              <ErrorState message={getApiError(ledgerQ.error)} onRetry={() => ledgerQ.refetch()} />
            ) : !ledgerQ.data?.length ? (
              <EmptyState title="Belum ada mutasi stok" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerQ.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(row.created_at)}</TableCell>
                      <TableCell className="max-w-56 truncate">{produkName(produkMap, row.produk_id)}</TableCell>
                      <TableCell>{reasonLabel(row.reason)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono',
                          row.qty_delta > 0 && 'text-success',
                          row.qty_delta < 0 && 'text-destructive',
                        )}
                      >
                        {fmtSignedQty(row.qty_delta)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.ref_type ? `${row.ref_type}${row.ref_id ? ` · ${row.ref_id.slice(0, 8)}` : ''}` : '-'}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-xs">{row.catatan || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableCard>
        </section>
      </div>

      <AdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        produk={produkQ.data ?? []}
        initialProdukId={adjustProduk}
      />
    </>
  )
}
