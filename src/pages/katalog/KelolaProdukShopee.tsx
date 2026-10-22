import InfoTip from '@/components/InfoTip'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BarisAksi } from './bagian'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { useAuth } from '@/lib/auth'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function KelolaProdukShopee({ detail }: { detail: KatalogDetail }) {
  const { bisa } = useAuth()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [nama, setNama] = useState(detail.nama)
  const [sku, setSku] = useState(detail.sku)
  const [deskripsi, setDeskripsi] = useState(detail.deskripsi)
  const [warnings, setWarnings] = useState<string[]>([])
  const mutation = useMutation({
    retry: false,
    mutationFn: (operation: { fields?: { nama?: string; sku?: string; deskripsi?: string }; unlist?: boolean }) => operation.fields
      ? endpoints.editProdukShopee(detail.id, operation.fields)
      : endpoints.statusProdukShopee(detail.id, operation.unlist!),
    onSuccess: (result) => {
      setEditing(false)
      setWarnings(result.warnings)
      toast.success('Perubahan dikonfirmasi Shopee')
      qc.invalidateQueries({ queryKey: ['katalog'] })
      qc.invalidateQueries({ queryKey: ['listing'] })
    },
  })
  if (!bisa('katalog', 'tulis')) return null

  async function status() {
    const unlist = detail.status === 'NORMAL'
    if (await confirm({
      title: unlist ? 'Nonaktifkan produk di Shopee?' : 'Aktifkan produk di Shopee?',
      description: `${detail.nama} · ${detail.nama_toko}. Perubahan ini berlaku pada listing toko Shopee.`,
    })) mutation.mutate({ unlist })
  }
  const fields = {
    ...(nama.trim() !== detail.nama ? { nama: nama.trim() } : {}),
    ...(sku !== detail.sku ? { sku } : {}),
    ...(deskripsi !== detail.deskripsi ? { deskripsi } : {}),
  }
  return (
    <section aria-label="Kelola produk di Shopee">
      <h2 className="pt-4 font-semibold">Kelola produk di Shopee</h2>
      <BarisAksi judul="Nama, SKU induk, dan deskripsi" ket="Ubah teks produk langsung di Shopee.">
        <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => {
          mutation.reset(); setWarnings([]); setNama(detail.nama); setSku(detail.sku); setDeskripsi(detail.deskripsi); setEditing(true)
        }}>Ubah</Button>
      </BarisAksi>
      <BarisAksi judul="Status di Shopee" ket={detail.status === 'NORMAL' ? 'Produk tayang. Nonaktifkan untuk menyembunyikannya.' : 'Produk tidak tayang. Aktifkan untuk menayangkannya lagi.'}>
        <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={status}>
          {detail.status === 'NORMAL' ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      </BarisAksi>
      {editing && <form className="space-y-3 pb-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate({ fields }) }}>
        <div className="space-y-1"><Label htmlFor="shopee-product-name">Nama produk</Label><Input id="shopee-product-name" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={255} required /></div>
        <div className="space-y-1"><Label htmlFor="shopee-product-sku">SKU produk induk</Label><Input id="shopee-product-sku" value={sku} onChange={(e) => setSku(e.target.value)} maxLength={128} /></div>
        <div className="space-y-1"><Label htmlFor="shopee-product-description">Deskripsi produk Shopee</Label><Textarea id="shopee-product-description" rows={5} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
        <InfoTip teks={"Edit teks deskripsi maksimal 3.000 karakter. Deskripsi yang tidak diubah tetap dipertahankan. Shopee memeriksa aturan kategori dan format deskripsi."} />
        <p className="text-sm text-muted-foreground">SKU ini milik produk induk, bukan SKU setiap varian. Mengosongkannya akan menghapus SKU induk di Shopee.</p>
        <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending || !nama.trim() || !Object.keys(fields).length || (fields.deskripsi !== undefined && (!deskripsi.trim() || deskripsi.length > 3000))}>Simpan ke Shopee</Button><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setEditing(false)}>Batal</Button></div>
      </form>}
      {mutation.isPending && <p role="status" className="pb-3">Mengirim perubahan ke Shopee…</p>}
      {mutation.error && <p role="alert" className="break-words pb-3 text-sm text-destructive">{getApiError(mutation.error)}</p>}
      {warnings.map((warning, i) => <p key={i} role="status" className="break-words pb-3 text-sm text-muted-foreground">{warning}</p>)}
    </section>
  )
}
