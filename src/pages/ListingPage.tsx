import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { listingApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import type { AkunMarketplaceOut, ProdukListingOut, ProdukOut } from '@/api/types'
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { useConfirm } from '@/components/ConfirmProvider'
import TableCard from '@/components/TableCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { akunName, produkName, useAkunList, useById, useProdukList } from '@/hooks/queries'
import { fmtNumber, fmtRp } from '@/lib/format'
import { platformLabel } from '@/lib/labels'
import {
  listingDefaults,
  listingSchema,
  toListingCreatePayload,
  toListingPatchPayload,
  type ListingValues,
} from '@/schemas/forms'

function ListingFormDialog({
  open,
  onOpenChange,
  editing,
  produk,
  akun,
  defaultProdukId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ProdukListingOut | null
  produk: ProdukOut[]
  akun: AkunMarketplaceOut[]
  defaultProdukId?: string
}) {
  const qc = useQueryClient()
  const isEdit = Boolean(editing)
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ListingValues>({ resolver: zodResolver(listingSchema), defaultValues: listingDefaults })

  useEffect(() => {
    if (!open) return
    reset(
      editing
        ? {
            produk_id: editing.produk_id,
            akun_id: editing.akun_id,
            id_eksternal: editing.id_eksternal,
            harga_jual: editing.harga_jual ?? '',
            stok_listing: editing.stok_listing === null ? '' : String(editing.stok_listing),
            aktif: editing.aktif,
          }
        : { ...listingDefaults, produk_id: defaultProdukId ?? '' },
    )
  }, [open, editing, reset, defaultProdukId])

  const akunId = watch('akun_id')
  const selectedAkun = akun.find((a) => a.id === akunId)

  const onSubmit = async (values: ListingValues) => {
    try {
      if (editing) {
        await listingApi.update(editing.id, toListingPatchPayload(values))
        toast.success('Listing diperbarui')
      } else {
        const target = akun.find((a) => a.id === values.akun_id)
        if (!target) {
          toast.error('Toko tidak ditemukan')
          return
        }
        await listingApi.create(toListingCreatePayload(values, target.platform))
        toast.success('Listing dipetakan')
      }
      await qc.invalidateQueries({ queryKey: qk.listingAll })
      onOpenChange(false)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit listing' : 'Petakan SKU ke listing toko'}</DialogTitle>
          <DialogDescription>
            Hubungkan SKU induk ke ID produk/listing di marketplace. Harga & stok listing opsional (override).
          </DialogDescription>
        </DialogHeader>
        <form id="listing-form" className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Produk (SKU induk)" htmlFor="produk_id" error={errors.produk_id?.message}>
            <NativeSelect id="produk_id" disabled={isEdit} {...register('produk_id')}>
              <option value="">— Pilih produk —</option>
              {produk.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku_induk} · {p.nama}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Toko"
            htmlFor="akun_id"
            error={errors.akun_id?.message}
            hint={selectedAkun ? `Platform: ${platformLabel(selectedAkun.platform)}` : undefined}
          >
            <NativeSelect id="akun_id" disabled={isEdit} {...register('akun_id')}>
              <option value="">— Pilih toko —</option>
              {akun.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama_toko} ({platformLabel(a.platform)})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="ID listing di marketplace"
            htmlFor="id_eksternal"
            error={errors.id_eksternal?.message}
            hint="Mis. item_id Shopee. Unik per platform."
          >
            <Input id="id_eksternal" className="font-mono" disabled={isEdit} {...register('id_eksternal')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Harga jual (opsional)" htmlFor="harga_jual" error={errors.harga_jual?.message}>
              <Input id="harga_jual" inputMode="decimal" {...register('harga_jual')} />
            </Field>
            <Field label="Stok listing (opsional)" htmlFor="stok_listing" error={errors.stok_listing?.message}>
              <Input id="stok_listing" inputMode="numeric" {...register('stok_listing')} />
            </Field>
          </div>
          {isEdit ? (
            <Controller
              control={control}
              name="aktif"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Listing aktif
                </label>
              )}
            />
          ) : null}
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="listing-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ListingPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const produkId = params.get('produk_id') || ''
  const [akunFilter, setAkunFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProdukListingOut | null>(null)

  const produkQ = useProdukList()
  const akunQ = useAkunList()
  const produkMap = useById(produkQ.data)
  const akunMap = useById(akunQ.data)
  const listingQ = useQuery({
    queryKey: qk.listing(produkId || undefined),
    queryFn: () => listingApi.list({ produk_id: produkId || undefined }),
  })

  const rows = useMemo(
    () => (listingQ.data ?? []).filter((l) => !akunFilter || l.akun_id === akunFilter),
    [listingQ.data, akunFilter],
  )

  const remove = useMutation({
    mutationFn: (id: string) => listingApi.remove(id),
    onSuccess: () => {
      toast.success('Listing dihapus')
      qc.invalidateQueries({ queryKey: qk.listingAll })
    },
    onError: (err) => toast.error(getApiError(err, 'Gagal menghapus listing')),
  })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Listing"
        description="Mapping SKU induk ke listing di tiap toko marketplace."
        actions={
          <>
            <Button variant="outline" onClick={() => listingQ.refetch()} disabled={listingQ.isFetching}>
              <RefreshCw className={listingQ.isFetching ? 'animate-spin' : ''} /> Muat ulang
            </Button>
            <Button onClick={openCreate} disabled={!produkQ.data?.length || !akunQ.data?.length}>
              <Plus /> Petakan listing
            </Button>
          </>
        }
      />
      <TableCard
        toolbar={
          <>
            <Field label="Produk" htmlFor="l-produk" className="min-w-56 flex-1">
              <NativeSelect
                id="l-produk"
                value={produkId}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  if (e.target.value) next.set('produk_id', e.target.value)
                  else next.delete('produk_id')
                  setParams(next, { replace: true })
                }}
              >
                <option value="">Semua produk</option>
                {(produkQ.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku_induk} · {p.nama}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Toko" htmlFor="l-akun" className="min-w-48 flex-1">
              <NativeSelect id="l-akun" value={akunFilter} onChange={(e) => setAkunFilter(e.target.value)}>
                <option value="">Semua toko</option>
                {(akunQ.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama_toko}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </>
        }
      >
        {listingQ.isLoading ? (
          <LoadingState />
        ) : listingQ.isError ? (
          <ErrorState message={getApiError(listingQ.error)} onRetry={() => listingQ.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada listing"
            hint={
              !produkQ.data?.length || !akunQ.data?.length
                ? 'Tambahkan minimal 1 produk dan 1 toko terlebih dahulu.'
                : 'Petakan SKU induk ke ID listing di toko marketplace.'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>ID listing</TableHead>
                <TableHead className="text-right">Harga jual</TableHead>
                <TableHead className="text-right">Stok listing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="max-w-64 truncate">{produkName(produkMap, l.produk_id)}</TableCell>
                  <TableCell>{akunName(akunMap, l.akun_id)}</TableCell>
                  <TableCell>{platformLabel(l.platform)}</TableCell>
                  <TableCell className="font-mono text-xs">{l.id_eksternal}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {l.harga_jual === null ? (
                      <span className="text-muted-foreground">
                        {fmtRp(produkMap.get(l.produk_id)?.harga_dasar)} (dasar)
                      </span>
                    ) : (
                      fmtRp(l.harga_jual)
                    )}
                  </TableCell>
                  <TableCell className="text-right">{l.stok_listing === null ? '-' : fmtNumber(l.stok_listing)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={l.aktif ? 'success' : 'muted'}>{l.aktif ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(l)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Hapus"
                        aria-label="Hapus"
                        className="text-destructive"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Hapus mapping listing?',
                            description: `Listing ${l.id_eksternal} tidak lagi terhubung ke SKU induk.`,
                            confirmLabel: 'Hapus',
                            destructive: true,
                          })
                          if (ok) remove.mutate(l.id)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
      <ListingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        produk={produkQ.data ?? []}
        akun={akunQ.data ?? []}
        defaultProdukId={produkId || undefined}
      />
    </>
  )
}
