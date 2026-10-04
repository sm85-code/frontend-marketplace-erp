import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { AkunMarketplace } from '@/api/types'
import { Medan } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORM_LABELS } from '@/config/roles'

const ITEM_KOSONG = { nama_produk: '', harga_satuan: '', qty: '1' }
const FORM_KOSONG = { platform: 'shopee', id_eksternal: '', akun_id: '', nama_pembeli: '' }
const TANPA_TOKO = '__tanpa__' // a Select item cannot have an empty value

/** Dialog to type in an order by hand (an order that did not come from a marketplace). */
export default function FormPesananManual({
  open,
  onOpenChange,
  akunList,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  akunList: AkunMarketplace[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState(FORM_KOSONG)
  const [items, setItems] = useState([{ ...ITEM_KOSONG }])

  const simpan = useMutation({
    mutationFn: endpoints.createPesanan,
    onSuccess: () => {
      toast.success('Pesanan manual ditambahkan')
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      onOpenChange(false)
      setForm(FORM_KOSONG)
      setItems([{ ...ITEM_KOSONG }])
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const ubahItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  function kirim() {
    simpan.mutate({
      platform: form.platform,
      id_eksternal: form.id_eksternal,
      akun_id: form.akun_id || null,
      nama_pembeli: form.nama_pembeli,
      items: items
        .filter((it) => it.nama_produk && it.harga_satuan)
        .map((it) => ({ nama_produk: it.nama_produk, harga_satuan: it.harga_satuan, qty: Number(it.qty || 1) })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pesanan Manual</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Medan label="Platform" untuk="pm-platform">
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v, akun_id: '' }))}>
                <SelectTrigger id="pm-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Medan>
            <Medan label="Toko (opsional)" untuk="pm-toko">
              <Select value={form.akun_id || TANPA_TOKO} onValueChange={(v) => setForm((f) => ({ ...f, akun_id: v === TANPA_TOKO ? '' : v }))}>
                <SelectTrigger id="pm-toko">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TANPA_TOKO}>Tanpa toko</SelectItem>
                  {akunList
                    .filter((a) => a.platform === form.platform)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nama_toko}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Medan>
          </div>
          <Medan label="ID Pesanan Eksternal" untuk="pm-id">
            <Input id="pm-id" value={form.id_eksternal} onChange={(e) => setForm((f) => ({ ...f, id_eksternal: e.target.value }))} />
          </Medan>
          <Medan label="Nama Pembeli" untuk="pm-pembeli">
            <Input id="pm-pembeli" value={form.nama_pembeli} onChange={(e) => setForm((f) => ({ ...f, nama_pembeli: e.target.value }))} />
          </Medan>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Item</legend>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                <Input aria-label={`Nama produk item ${i + 1}`} placeholder="Nama produk" value={it.nama_produk} onChange={(e) => ubahItem(i, { nama_produk: e.target.value })} />
                <Input aria-label={`Harga item ${i + 1}`} type="number" placeholder="Harga" value={it.harga_satuan} onChange={(e) => ubahItem(i, { harga_satuan: e.target.value })} />
                <Input aria-label={`Jumlah item ${i + 1}`} type="number" placeholder="Qty" value={it.qty} onChange={(e) => ubahItem(i, { qty: e.target.value })} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { ...ITEM_KOSONG }])}>
              + Tambah Item
            </Button>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={kirim} disabled={!form.id_eksternal || simpan.isPending}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
