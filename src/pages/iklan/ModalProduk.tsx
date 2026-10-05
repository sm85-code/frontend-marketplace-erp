import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import type { KampanyeProduk } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { angkaDari, hargaAcuan, type ModeModal, pratinjauImpas } from '@/lib/iklanKampanye'
import { Foto } from './FotoProduk'
import { kali } from './kolom'

/** One advertised product with its modal (cost price): a Rp or a % input, a live break-even ROAS, Save / Clear. */
export default function ModalProduk({ akunId, produk: p, biayaShopee }: { akunId: string; produk: KampanyeProduk; biayaShopee: number | null }) {
  const qc = useQueryClient()
  const awalMode: ModeModal = p.modal_rp != null && p.modal_persen == null ? 'rp' : 'persen'
  const [mode, setMode] = useState<ModeModal>(awalMode)
  const [nilai, setNilai] = useState(String(angkaDari(awalMode === 'rp' ? p.modal_rp : p.modal_persen) || ''))
  const harga = hargaAcuan(p.harga_min, p.harga_max)
  const tersimpan = p.modal_rp != null || p.modal_persen != null
  const hasil = pratinjauImpas(mode, Number(nilai), harga, biayaShopee)
  const id = `modal-${p.item_id}`

  const simpan = useMutation({
    mutationFn: (kosong: boolean) =>
      endpoints.simpanModalProduk(akunId, p.item_id, kosong ? {} : mode === 'rp' ? { modal_rp: Number(nilai) } : { modal_persen: Number(nilai) }),
    onSuccess: (_d, kosong) => {
      toast.success(kosong ? 'Modal dihapus' : 'Modal disimpan')
      if (kosong) setNilai('')
      qc.invalidateQueries({ queryKey: ['iklan-kampanye'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  const sah = Number(nilai) > 0 && (mode === 'rp' || Number(nilai) < 100)

  return (
    <li className="space-y-2 p-3 text-sm">
      <div className="flex items-start gap-3">
        <Foto produk={p} ukuran={56} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{p.nama ?? `Produk ${p.item_id} (belum ada di Katalog)`}</p>
          <p className="teks-kecil text-muted-foreground">
            {harga ? `Harga ${fmtRp(p.harga_min)}${p.harga_max && p.harga_max !== p.harga_min ? ` – ${fmtRp(p.harga_max)}` : ''}` : 'Harga belum diketahui'}
            {p.stok != null ? ` · stok ${p.stok.toLocaleString('id-ID')}` : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor={id} className="teks-kecil text-muted-foreground">
            Modal per unit
          </label>
          <div className="flex gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as ModeModal)}>
              <SelectTrigger aria-label={`Satuan modal ${p.nama ?? p.item_id}`} className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rp">Rp</SelectItem>
                <SelectItem value="persen">%</SelectItem>
              </SelectContent>
            </Select>
            <Input id={id} type="number" inputMode="decimal" min={0} className="w-32" value={nilai} onChange={(e) => setNilai(e.target.value)} />
          </div>
        </div>
        <Button size="sm" disabled={!sah || simpan.isPending} onClick={() => simpan.mutate(false)}>
          Simpan modal
        </Button>
        {tersimpan && (
          <Button size="sm" variant="ghost" disabled={simpan.isPending} onClick={() => simpan.mutate(true)}>
            Hapus
          </Button>
        )}
      </div>
      {mode === 'rp' && !harga && nilai !== '' && <p className="teks-kecil text-muted-foreground">Harga produk belum diketahui, pakai satuan % atau tarik Katalog dulu.</p>}
      {hasil && (
        <p className="teks-kecil text-muted-foreground" aria-live="polite">
          Margin kotor sekitar {hasil.margin.toLocaleString('id-ID')}%
          {hasil.impas ? `, iklan impas di ROAS ${kali(String(hasil.impas))}` : ', iklan tidak akan untung berapa pun ROAS-nya'}
          {biayaShopee == null ? ' (biaya Shopee belum dihitung: belum ada data settlement)' : ` (sudah termasuk biaya Shopee ${(biayaShopee * 100).toFixed(1)}%)`}.
        </p>
      )}
    </li>
  )
}
