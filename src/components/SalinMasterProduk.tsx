import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { salinKatalogMaster, type SalinMasterHasil } from '@/api/endpoints'
import { bagiBatch } from '@/lib/katalog'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import QueryError from '@/components/QueryError'

export default function SalinMasterProduk({
  ids,
  disabled = false,
}: {
  ids: string[]
  disabled?: boolean
}) {
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    retry: false,
    mutationFn: async (selected: string[]) => {
      const results: SalinMasterHasil[] = []
      for (const batch of bagiBatch(selected))
        results.push(...(await salinKatalogMaster(batch)).hasil)
      return results
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['produk'] })
      void qc.invalidateQueries({ queryKey: ['produk-keluarga'] })
    },
  })
  async function copy() {
    if (
      !(await confirm({
        title: `Salin ${ids.length} produk ke master ERP?`,
        description:
          'Nama, foto, deskripsi, harga dan varian/pengiriman disalin. Stok master baru = 0; isi sesuai stok fisik. SKU yang sudah ada digunakan tanpa menimpa data atau stoknya. SKU kosong/berulang dibuat otomatis. Tidak mengubah Shopee atau mengaktifkan pemetaan toko.',
      }))
    )
      return
    mutation.reset()
    setOpen(true)
    mutation.mutate([...ids])
  }
  const created =
    mutation.data?.flatMap((r) => r.produk ?? []).filter((r) => r.baru)
      .length ?? 0
  const existing =
    mutation.data?.flatMap((r) => r.produk ?? []).filter((r) => !r.baru)
      .length ?? 0
  return (
    <>
      <Button
        variant="outline"
        disabled={!ids.length || disabled || mutation.isPending}
        onClick={() => void copy()}
      >
        Salin ke Master Produk
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending) setOpen(value)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hasil Salin Master Produk</DialogTitle>
          </DialogHeader>
          {mutation.isPending && (
            <p role="status">Menyalin produk dan varian…</p>
          )}
          {mutation.error && (
            <QueryError
              error={mutation.error}
              retry={() => mutation.mutate([...ids])}
            />
          )}
          {mutation.data && (
            <>
              <p role="status">
                {created} SKU baru · {existing} SKU sudah ada.
              </p>
              <div className="space-y-3">
                {mutation.data.map((r) => (
                  <div key={r.katalog_id} className="rounded-lg border p-3">
                    <p className="font-medium">{r.nama ?? 'Produk katalog'}</p>
                    {r.ok ? (
                      <>
                        <p>
                          {r.produk?.length} SKU master
                          {r.sku_dibuat
                            ? ` · ${r.sku_dibuat} SKU otomatis`
                            : ''}
                        </p>
                        <p className="text-sm break-words text-muted-foreground">
                          {r.produk?.map((p) => p.sku).join(', ')}
                        </p>
                      </>
                    ) : (
                      <p role="alert" className="text-destructive">
                        {r.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <Button asChild>
                <Link to="/produk">Buka Master Produk</Link>
              </Button>
            </>
          )}
          {mutation.error && (
            <p className="text-sm text-muted-foreground">
              Sebagian produk mungkin sudah tersalin. Aman mencoba lagi: SKU
              yang sudah ada tidak ditimpa.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
