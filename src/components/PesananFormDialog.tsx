import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { pesananApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import { PLATFORMS } from '@/api/types'
import { Field } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useAkunList, useProdukList } from '@/hooks/queries'
import { fmtRp } from '@/lib/format'
import { PLATFORM_LABEL } from '@/lib/labels'
import { pesananDefaults, pesananSchema, toPesananPayload, type PesananValues } from '@/schemas/forms'

/** Manual order entry (POST /pesanan) — lets the owner test the T2 pipeline before live Shopee sync. */
export default function PesananFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const akunQ = useAkunList()
  const produkQ = useProdukList()
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PesananValues>({ resolver: zodResolver(pesananSchema), defaultValues: pesananDefaults })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (open) reset(pesananDefaults)
  }, [open, reset])

  const platform = watch('platform')
  const items = watch('items')
  const akunOptions = (akunQ.data ?? []).filter((a) => a.platform === platform)
  const total = items.reduce((sum, it) => sum + (Number(it.harga_satuan) || 0) * (Number(it.qty) || 0), 0)

  const onSubmit = async (values: PesananValues) => {
    try {
      const res = await pesananApi.create(toPesananPayload(values))
      toast.success(`Pesanan ${res.id_eksternal} dibuat`)
      await qc.invalidateQueries({ queryKey: qk.pesananAll })
      onOpenChange(false)
      navigate(`/pesanan/${res.id}`)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pesanan manual</DialogTitle>
          <DialogDescription>
            Pesanan dibuat berstatus “Belum Bayar”. Item yang ditautkan ke SKU induk akan mereservasi stok saat dikonfirmasi.
          </DialogDescription>
        </DialogHeader>
        <form id="pesanan-form" className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Platform" htmlFor="ps-platform" error={errors.platform?.message}>
              <NativeSelect
                id="ps-platform"
                {...register('platform', { onChange: () => setValue('akun_id', '') })}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Toko (opsional)" htmlFor="ps-akun">
              <NativeSelect id="ps-akun" {...register('akun_id')}>
                <option value="">— Tanpa toko —</option>
                {akunOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama_toko}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="No. pesanan marketplace" htmlFor="ps-id" error={errors.id_eksternal?.message}>
              <Input id="ps-id" className="font-mono" {...register('id_eksternal')} />
            </Field>
            <Field label="Nama pembeli" htmlFor="ps-pembeli">
              <Input id="ps-pembeli" {...register('nama_pembeli')} />
            </Field>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Item</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ produk_id: '', nama_produk: '', harga_satuan: '', qty: '1' })}
              >
                <Plus /> Item
              </Button>
            </div>
            {typeof errors.items?.message === 'string' ? (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            ) : null}
            {fields.map((f, idx) => {
              const itemErr = errors.items?.[idx]
              return (
                <div key={f.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12">
                  <div className="sm:col-span-12">
                    <NativeSelect
                      aria-label="SKU induk"
                      {...register(`items.${idx}.produk_id`, {
                        onChange: (e: { target: { value: string } }) => {
                          const p = produkQ.data?.find((x) => x.id === e.target.value)
                          if (!p) return
                          if (!getValues(`items.${idx}.nama_produk`)) setValue(`items.${idx}.nama_produk`, p.nama)
                          if (!getValues(`items.${idx}.harga_satuan`))
                            setValue(`items.${idx}.harga_satuan`, String(p.harga_dasar))
                        },
                      })}
                    >
                      <option value="">— Tanpa SKU induk (tidak reservasi stok) —</option>
                      {(produkQ.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku_induk} · {p.nama} (stok {p.stok})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="sm:col-span-6">
                    <Input placeholder="Nama produk" aria-label="Nama produk" {...register(`items.${idx}.nama_produk`)} />
                    {itemErr?.nama_produk ? <p className="text-xs text-destructive">{itemErr.nama_produk.message}</p> : null}
                  </div>
                  <div className="sm:col-span-3">
                    <Input placeholder="Harga" inputMode="decimal" aria-label="Harga satuan" {...register(`items.${idx}.harga_satuan`)} />
                    {itemErr?.harga_satuan ? <p className="text-xs text-destructive">{itemErr.harga_satuan.message}</p> : null}
                  </div>
                  <div className="flex gap-2 sm:col-span-3">
                    <div className="flex-1">
                      <Input placeholder="Qty" inputMode="numeric" aria-label="Qty" {...register(`items.${idx}.qty`)} />
                      {itemErr?.qty ? <p className="text-xs text-destructive">{itemErr.qty.message}</p> : null}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Hapus item"
                      className="text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(idx)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
            <p className="text-right text-sm">
              Total: <b>{fmtRp(total)}</b>
            </p>
          </div>
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="pesanan-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Buat pesanan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
