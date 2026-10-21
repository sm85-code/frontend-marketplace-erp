import FormDialog from '@/components/FormDialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import api, { getApiError } from '@/api/client'
import { useTokoPenjualan, NAMA_JENIS } from '@/api/tokoPenjualan'
import { Medan } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { wibInputNow } from '@/lib/processingTime'

const ITEM_KOSONG = { produk: '', varian: '', qty: '1', note: '' }
const kosong = () => ({ toko_id: '', kode_pesanan: '', pemesan: '', ordered: wibInputNow(), deadline: '', reference: '' })

/** Dialog to type in an order for production (an own shop or a reseller); Pemetaan Order reads it like any other order. */
export default function FormPesananManual({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient()
  const { data: toko } = useTokoPenjualan()
  const [form, setForm] = useState(kosong)
  const [items, setItems] = useState([{ ...ITEM_KOSONG }])
  const daftar = (toko?.items ?? []).filter((t) => t.aktif)
  const dipilih = daftar.find((t) => t.id === form.toko_id)
  const internal = dipilih?.jenis === 'internal'

  const simpan = useMutation({
    mutationFn: () =>
      api.post('/pesanan/manual', {
        toko_id: form.toko_id,
        kode_pesanan: internal ? form.kode_pesanan : null,
        pemesan: form.pemesan,
        ordered_at: `${form.ordered}:00+07:00`,
        deadline: `${form.deadline}:00+07:00`,
        reference: form.reference,
        items: items.map((it) => ({ ...it, qty: Number(it.qty || 1) })),
      }),
    onSuccess: () => {
      toast.success('Pesanan manual ditambahkan')
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      qc.invalidateQueries({ queryKey: ['processing'] })
      onOpenChange(false)
      setForm(kosong())
      setItems([{ ...ITEM_KOSONG }])
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const ubahItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const lengkap =
    !!dipilih && (!internal || !!form.kode_pesanan.trim()) && !!form.deadline && items.every((it) => it.produk.trim() && Number(it.qty) >= 1)

  return (
    <FormDialog open={open} values={{ form, items }} busy={simpan.isPending} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pesanan Manual</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (lengkap) simpan.mutate()
          }}
        >
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <Medan label="Toko" untuk="pm-toko">
              <Select value={form.toko_id} onValueChange={(v) => setForm((f) => ({ ...f, toko_id: v }))}>
                <SelectTrigger id="pm-toko">
                  <SelectValue placeholder="Pilih toko internal / reseller" />
                </SelectTrigger>
                <SelectContent>
                  {daftar.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nama} · {NAMA_JENIS[t.jenis]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toko && daftar.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Belum ada toko. Tambahkan di Kelola Toko → Toko Internal & Reseller.</p>}
            </Medan>
            {internal && (
              <Medan label="Kode pesanan" untuk="pm-kode">
                <Input id="pm-kode" maxLength={200} value={form.kode_pesanan} onChange={(e) => setForm((f) => ({ ...f, kode_pesanan: e.target.value }))} />
              </Medan>
            )}
            {dipilih && !internal && <p className="text-xs text-muted-foreground">Kode pesanan dibentuk saat produk dipetakan: SKU produksi–DDMM–kode penjual–nomor urut.</p>}
            <Medan label={internal ? 'Nama pemesan' : 'Nama pemesan (opsional)'} untuk="pm-pemesan">
              <Input id="pm-pemesan" maxLength={200} value={form.pemesan} onChange={(e) => setForm((f) => ({ ...f, pemesan: e.target.value }))} />
            </Medan>
            <div className="grid grid-cols-2 gap-3">
              <Medan label="Tanggal pesanan (WIB)" untuk="pm-tgl">
                <Input id="pm-tgl" type="datetime-local" value={form.ordered} onChange={(e) => setForm((f) => ({ ...f, ordered: e.target.value }))} />
              </Medan>
              <Medan label="Kirim sebelum (WIB)" untuk="pm-batas">
                <Input id="pm-batas" type="datetime-local" min={form.ordered} value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              </Medan>
            </div>
            <Medan label="Nomor referensi (opsional)" untuk="pm-ref">
              <Input id="pm-ref" maxLength={200} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
            </Medan>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Produk</legend>
              {items.map((it, i) => (
                <div key={i} className="space-y-2 rounded-md border p-2">
                  <Input aria-label={`Nama produk ${i + 1}`} placeholder="Nama produk" maxLength={255} value={it.produk} onChange={(e) => ubahItem(i, { produk: e.target.value })} />
                  <div className="grid grid-cols-[2fr_1fr] gap-2">
                    <Input aria-label={`Ukuran produk ${i + 1}`} placeholder="Ukuran / spesifikasi" maxLength={255} value={it.varian} onChange={(e) => ubahItem(i, { varian: e.target.value })} />
                    <Input aria-label={`Jumlah produk ${i + 1}`} type="number" min={1} placeholder="Qty" value={it.qty} onChange={(e) => ubahItem(i, { qty: e.target.value })} />
                  </div>
                  <Input aria-label={`Catatan produk ${i + 1}`} placeholder="Catatan (opsional)" maxLength={2000} value={it.note} onChange={(e) => ubahItem(i, { note: e.target.value })} />
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((_, n) => n !== i))}>
                      Hapus produk {i + 1}
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { ...ITEM_KOSONG }])}>
                + Tambah produk
              </Button>
            </fieldset>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!lengkap || simpan.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </FormDialog>
  )
}
