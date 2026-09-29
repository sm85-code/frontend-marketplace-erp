import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Link2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { akunApi, oauthApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import { PLATFORMS, type AkunMarketplaceOut } from '@/api/types'
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { useConfirm } from '@/components/ConfirmProvider'
import TableCard from '@/components/TableCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAkunList } from '@/hooks/queries'
import { AKUN_STATUS_OPTIONS, akunStatusLabel, akunStatusTone, platformLabel, PLATFORM_LABEL } from '@/lib/labels'
import { buildShopeeRedirectUri } from '@/lib/oauth'
import { akunDefaults, akunSchema, toAkunCreatePayload, toAkunPatchPayload, type AkunValues } from '@/schemas/forms'

function AkunFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AkunMarketplaceOut | null
}) {
  const qc = useQueryClient()
  const isEdit = Boolean(editing)
  const form = useForm<AkunValues>({ resolver: zodResolver(akunSchema), defaultValues: akunDefaults })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    if (!open) return
    reset(
      editing
        ? {
            ...akunDefaults,
            platform: editing.platform as AkunValues['platform'],
            nama_toko: editing.nama_toko,
            id_toko_eksternal: editing.id_toko_eksternal ?? '',
            status: editing.status,
            catatan: editing.catatan ?? '',
          }
        : akunDefaults,
    )
  }, [open, editing, reset])

  const onSubmit = async (values: AkunValues) => {
    try {
      if (editing) {
        await akunApi.update(editing.id, toAkunPatchPayload(values))
        toast.success('Toko diperbarui')
      } else {
        await akunApi.create(toAkunCreatePayload(values))
        toast.success('Toko ditambahkan')
      }
      await qc.invalidateQueries({ queryKey: qk.akunAll })
      onOpenChange(false)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const statusOptions = useMemo(() => {
    const known: { value: string; label: string }[] = AKUN_STATUS_OPTIONS.map((o) => ({ ...o }))
    if (editing && !known.some((o) => o.value === editing.status)) {
      known.push({ value: editing.status, label: editing.status })
    }
    return known
  }, [editing])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit toko' : 'Tambah toko'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Ubah data akun marketplace. Platform tidak dapat diubah.'
              : 'Buat akun toko dulu, lalu klik "Hubungkan Shopee" untuk otorisasi.'}
          </DialogDescription>
        </DialogHeader>
        <form id="akun-form" className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Platform" htmlFor="platform" error={errors.platform?.message}>
            <NativeSelect id="platform" disabled={isEdit} {...register('platform')}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Nama toko" htmlFor="nama_toko" error={errors.nama_toko?.message}>
            <Input id="nama_toko" {...register('nama_toko')} />
          </Field>
          <Field
            label="ID toko di marketplace (opsional)"
            htmlFor="id_toko_eksternal"
            error={errors.id_toko_eksternal?.message}
            hint="Terisi otomatis (shop_id) setelah OAuth Shopee berhasil."
          >
            <Input id="id_toko_eksternal" {...register('id_toko_eksternal')} />
          </Field>
          {isEdit ? (
            <Field label="Status" htmlFor="status">
              <NativeSelect id="status" {...register('status')}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <Field label="Catatan" htmlFor="catatan">
            <Textarea id="catatan" rows={2} {...register('catatan')} />
          </Field>
          {isEdit ? (
            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Token manual (opsional)</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Hanya jika OAuth belum bisa dipakai. Kosongkan untuk tidak mengubah token yang tersimpan.
              </p>
              <div className="mt-3 grid gap-3">
                <Field label="Access token" htmlFor="access_token">
                  <Input id="access_token" autoComplete="off" {...register('access_token')} />
                </Field>
                <Field label="Refresh token" htmlFor="refresh_token">
                  <Input id="refresh_token" autoComplete="off" {...register('refresh_token')} />
                </Field>
              </div>
            </details>
          ) : null}
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="akun-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AkunPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [platform, setPlatform] = useState('')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AkunMarketplaceOut | null>(null)
  const { data, isLoading, isError, error, refetch, isFetching } = useAkunList(platform || undefined)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data ?? []
    return (data ?? []).filter(
      (a) => a.nama_toko.toLowerCase().includes(q) || (a.id_toko_eksternal ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const terhubung = (data ?? []).filter((a) => a.status === 'terhubung').length

  const connect = useMutation({
    mutationFn: (akun: AkunMarketplaceOut) =>
      oauthApi.shopeeStart(akun.id, buildShopeeRedirectUri(window.location.origin, akun.id)),
    onSuccess: (res) => {
      toast.info('Mengarahkan ke Shopee…')
      window.location.assign(res.authorize_url)
    },
    onError: (err) => toast.error(getApiError(err, 'Gagal memulai OAuth Shopee')),
  })

  const sync = useMutation({
    mutationFn: ({ akun, kind }: { akun: AkunMarketplaceOut; kind: 'pesanan' | 'produk' }) =>
      kind === 'pesanan' ? akunApi.syncPesanan(akun.id) : akunApi.syncProduk(akun.id),
    onSuccess: (res, vars) => {
      toast.success(`Sinkron ${vars.kind}: ${res.pulled} data ditarik`)
      qc.invalidateQueries({ queryKey: vars.kind === 'pesanan' ? qk.pesananAll : qk.listingAll })
    },
    onError: (err) => toast.error(getApiError(err, 'Sinkron gagal')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => akunApi.remove(id),
    onSuccess: () => {
      toast.success('Toko dihapus')
      qc.invalidateQueries({ queryKey: qk.akunAll })
    },
    onError: (err) => toast.error(getApiError(err, 'Gagal menghapus toko')),
  })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Toko / Akun Marketplace"
        description={data ? `${data.length} toko · ${terhubung} terhubung` : 'Kelola akun toko per platform.'}
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? 'animate-spin' : ''} /> Muat ulang
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Tambah toko
            </Button>
          </>
        }
      />
      <TableCard
        toolbar={
          <>
            <Field label="Platform" htmlFor="f-platform" className="w-40">
              <NativeSelect id="f-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">Semua</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Cari" htmlFor="f-search" className="min-w-48 flex-1">
              <Input
                id="f-search"
                placeholder="Nama toko / shop id"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
            title="Belum ada toko"
            hint="Tambahkan akun toko Shopee Anda, lalu hubungkan lewat OAuth."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus /> Tambah toko
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Toko</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Shop ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="font-medium">{a.nama_toko}</p>
                    {a.catatan ? <p className="max-w-xs truncate text-xs text-muted-foreground">{a.catatan}</p> : null}
                  </TableCell>
                  <TableCell>{platformLabel(a.platform)}</TableCell>
                  <TableCell className="font-mono text-xs">{a.id_toko_eksternal || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge tone={akunStatusTone(a.status)}>{akunStatusLabel(a.status)}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {a.platform === 'shopee' ? (
                        <Button
                          size="sm"
                          variant={a.status === 'terhubung' ? 'outline' : 'default'}
                          disabled={connect.isPending}
                          onClick={() => connect.mutate(a)}
                        >
                          {connect.isPending && connect.variables?.id === a.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Link2 />
                          )}
                          {a.status === 'terhubung' ? 'Hubungkan ulang' : 'Hubungkan Shopee'}
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Tarik pesanan dari marketplace"
                        aria-label="Tarik pesanan"
                        disabled={sync.isPending}
                        onClick={() => sync.mutate({ akun: a, kind: 'pesanan' })}
                      >
                        <Download />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(a)
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
                            title: 'Hapus toko?',
                            description: `Toko "${a.nama_toko}" akan dihapus permanen.`,
                            confirmLabel: 'Hapus',
                            destructive: true,
                          })
                          if (ok) remove.mutate(a.id)
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
      <AkunFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </>
  )
}
