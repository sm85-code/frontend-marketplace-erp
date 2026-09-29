import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { produkApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import type { ProdukOut } from '@/api/types'
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { useConfirm } from '@/components/ConfirmProvider'
import TableCard from '@/components/TableCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useProdukList } from '@/hooks/queries'
import { fmtNumber, fmtRp } from '@/lib/format'
import { produkDefaults, produkSchema, toProdukCreatePayload, toProdukPatchPayload, type ProdukValues } from '@/schemas/forms'

function ProdukFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ProdukOut | null
}) {
  const qc = useQueryClient()
  const isEdit = Boolean(editing)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProdukValues>({ resolver: zodResolver(produkSchema), defaultValues: produkDefaults })

  useEffect(() => {
    if (!open) return
    reset(
      editing
        ? {
            sku_induk: editing.sku_induk,
            nama: editing.nama,
            deskripsi: editing.deskripsi ?? '',
            harga_dasar: String(editing.harga_dasar ?? ''),
            stok: String(editing.stok),
            foto_url: editing.foto_url ?? '',
            aktif: editing.aktif,
          }
        : produkDefaults,
    )
  }, [open, editing, reset])

  const onSubmit = async (values: ProdukValues) => {
    try {
      if (editing) {
        await produkApi.update(editing.id, toProdukPatchPayload(values))
        toast.success('Produk diperbarui')
      } else {
        await produkApi.create(toProdukCreatePayload(values))
        toast.success('Produk ditambahkan')
      }
      await qc.invalidateQueries({ queryKey: qk.produk })
      await qc.invalidateQueries({ queryKey: qk.ledgerAll })
      onOpenChange(false)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit produk' : 'Tambah produk (SKU induk)'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'SKU induk tidak dapat diubah. Stok diubah lewat menu Stok (penyesuaian).'
              : 'SKU induk adalah master produk yang dipetakan ke listing di tiap toko.'}
          </DialogDescription>
        </DialogHeader>
        <form id="produk-form" className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="SKU induk" htmlFor="sku_induk" error={errors.sku_induk?.message}>
            <Input id="sku_induk" disabled={isEdit} className="font-mono" {...register('sku_induk')} />
          </Field>
          <Field label="Nama produk" htmlFor="nama" error={errors.nama?.message}>
            <Input id="nama" {...register('nama')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Harga dasar (Rp)" htmlFor="harga_dasar" error={errors.harga_dasar?.message}>
              <Input id="harga_dasar" inputMode="decimal" {...register('harga_dasar')} />
            </Field>
            <Field
              label={isEdit ? 'Stok tersedia' : 'Stok awal'}
              htmlFor="stok"
              error={errors.stok?.message}
              hint={isEdit ? 'Ubah lewat menu Stok' : 'Dicatat di ledger sebagai "stok awal"'}
            >
              <Input id="stok" inputMode="numeric" disabled={isEdit} {...register('stok')} />
            </Field>
          </div>
          <Field label="URL foto (opsional)" htmlFor="foto_url" error={errors.foto_url?.message}>
            <Input id="foto_url" placeholder="https://…" {...register('foto_url')} />
          </Field>
          <Field label="Deskripsi" htmlFor="deskripsi">
            <Textarea id="deskripsi" rows={3} {...register('deskripsi')} />
          </Field>
          {isEdit ? (
            <Controller
              control={control}
              name="aktif"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Produk aktif
                </label>
              )}
            />
          ) : null}
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="produk-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProdukPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [aktif, setAktif] = useState<'all' | 'aktif' | 'nonaktif'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProdukOut | null>(null)
  const { data, isLoading, isError, error, refetch, isFetching } = useProdukList()

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter((p) => {
      if (aktif === 'aktif' && !p.aktif) return false
      if (aktif === 'nonaktif' && p.aktif) return false
      if (!q) return true
      return p.sku_induk.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q)
    })
  }, [data, search, aktif])

  const remove = useMutation({
    mutationFn: (id: string) => produkApi.remove(id),
    onSuccess: () => {
      toast.success('Produk dihapus')
      qc.invalidateQueries({ queryKey: qk.produk })
    },
    onError: (err) => toast.error(getApiError(err, 'Gagal menghapus produk')),
  })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Produk (SKU induk)"
        description={data ? `${data.length} SKU induk` : 'Master produk lintas toko.'}
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? 'animate-spin' : ''} /> Muat ulang
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Tambah produk
            </Button>
          </>
        }
      />
      <TableCard
        toolbar={
          <>
            <Field label="Cari" htmlFor="p-search" className="min-w-48 flex-1">
              <Input
                id="p-search"
                placeholder="SKU / nama"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="p-aktif" className="w-36">
              <NativeSelect id="p-aktif" value={aktif} onChange={(e) => setAktif(e.target.value as typeof aktif)}>
                <option value="all">Semua</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </NativeSelect>
            </Field>
          </>
        }
      >
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={getApiError(error)} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={data?.length ? 'Tidak ada produk yang cocok' : 'Belum ada produk'}
            action={
              data?.length ? undefined : (
                <Button size="sm" onClick={openCreate}>
                  <Plus /> Tambah produk
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU induk</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Harga dasar</TableHead>
                <TableHead className="text-right">Stok tersedia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku_induk}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt="" className="size-8 rounded object-cover" loading="lazy" />
                      ) : null}
                      <span className="font-medium">{p.nama}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{fmtRp(p.harga_dasar)}</TableCell>
                  <TableCell className="text-right">{fmtNumber(p.stok)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={p.aktif ? 'success' : 'muted'}>{p.aktif ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Lihat listing" aria-label="Lihat listing" asChild>
                        <Link to={`/listing?produk_id=${encodeURIComponent(p.id)}`}>
                          <Link2 />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(p)
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
                            title: 'Hapus produk?',
                            description: `SKU ${p.sku_induk} akan dihapus permanen. Pertimbangkan menonaktifkan saja.`,
                            confirmLabel: 'Hapus',
                            destructive: true,
                          })
                          if (ok) remove.mutate(p.id)
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
      <ProdukFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </>
  )
}
