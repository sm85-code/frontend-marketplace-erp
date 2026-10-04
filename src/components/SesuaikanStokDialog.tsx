import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { Produk } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { hitungPerubahanStok, type ModeStok } from '@/lib/stok'

/** Quick stock correction for one product (same endpoint as Gudang & Stok, so it lands in the stock ledger). */
export default function SesuaikanStokDialog({ produk, onClose }: { produk: Produk | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModeStok>('ubah')
  const [nilai, setNilai] = useState('')
  const [catatan, setCatatan] = useState('')

  const delta = produk ? hitungPerubahanStok(mode, produk.stok, nilai) : null
  const stokBaru = produk && delta !== null ? produk.stok + delta : null

  const mut = useMutation({
    mutationFn: endpoints.adjustStok,
    onSuccess: () => {
      toast.success('Stok disesuaikan')
      qc.invalidateQueries({ queryKey: ['produk'] })
      qc.invalidateQueries({ queryKey: ['stok-ledger'] })
      selesai()
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  function selesai() {
    setMode('ubah')
    setNilai('')
    setCatatan('')
    onClose()
  }

  return (
    <Dialog open={produk !== null} onOpenChange={(open) => !open && selesai()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok</DialogTitle>
        </DialogHeader>
        {produk && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium">{produk.nama}</div>
              <div className="text-xs text-muted-foreground">
                {produk.sku_induk} · stok sekarang {produk.stok}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === 'ubah' ? 'default' : 'outline'} onClick={() => setMode('ubah')}>
                Tambah / Kurangi
              </Button>
              <Button type="button" size="sm" variant={mode === 'atur' ? 'default' : 'outline'} onClick={() => setMode('atur')}>
                Atur jumlah
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sesuaikanstok-mode-ubah-perubahan-masu-1">{mode === 'ubah' ? 'Perubahan (+ masuk, - keluar)' : 'Jumlah stok yang benar'}</Label>
              <Input id="sesuaikanstok-mode-ubah-perubahan-masu-1"
                type="number"
                inputMode="numeric"
                placeholder={mode === 'ubah' ? 'mis. 10 atau -3' : 'mis. 25'}
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {stokBaru === null
                  ? nilai.trim() === ''
                    ? ' '
                    : 'Isi angka bulat yang tidak membuat stok minus.'
                  : `Stok ${produk.stok} → ${stokBaru} (${delta! >= 0 ? '+' : ''}${delta})`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sesuaikanstok-catatan-opsional-2">Catatan (opsional)</Label>
              <Textarea id="sesuaikanstok-catatan-opsional-2" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. stok awal, barang rusak" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={selesai}>
            Batal
          </Button>
          <Button
            disabled={!produk || delta === null || delta === 0 || mut.isPending}
            onClick={() => produk && delta !== null && mut.mutate({ produk_id: produk.id, qty_delta: delta, catatan: catatan || undefined })}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
