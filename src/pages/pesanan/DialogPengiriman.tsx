import Spinner from '@/components/Spinner'
import { useEffect, useState } from 'react'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { MetodePengiriman, OpsiPengiriman, PengaturanPengiriman, Pesanan } from '@/api/types'
import { awalPengiriman, galatPengiriman, LABEL_METODE } from '@/lib/pengiriman'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type HasilOpsi = { data?: OpsiPengiriman; error?: string }
const selectClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
export default function DialogPengiriman({ pesanan, cetak = false, onClose, onConfirm }: {
  pesanan: Pesanan[]; cetak?: boolean; onClose: () => void
  onConfirm: (ids: string[], pengaturan: Record<string, PengaturanPengiriman>) => void
}) {
  const [hasil, setHasil] = useState<Record<string, HasilOpsi>>({})
  const [metode, setMetode] = useState<MetodePengiriman | ''>('')
  const [edits, setPengaturan] = useState<Record<string, PengaturanPengiriman>>({})
  const [dikecualikan, setDikecualikan] = useState<Record<string, boolean>>({})
  const [putaran, setPutaran] = useState(0)
  // Snapshot targets: the detail page may rerender after a background status refresh.
  const [targets] = useState(pesanan)
  useEffect(() => {
    let active = true
    let index = 0
    async function worker() {
      while (active && index < targets.length) {
        const p = targets[index++]
        try {
          const data = await endpoints.opsiPengirimanPesanan(p.id)
          if (active) setHasil((h) => ({ ...h, [p.id]: { data } }))
        } catch (error) {
          if (active) setHasil((h) => ({ ...h, [p.id]: { error: getApiError(error) } }))
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, targets.length) }, worker))
    return () => { active = false }
  }, [targets, putaran])
  const pengaturan: Record<string, PengaturanPengiriman> = Object.fromEntries(targets.flatMap((p) => {
    const o = hasil[p.id]?.data?.opsi.find((o) => o.metode === metode)
    return o?.tersedia ? [[p.id, edits[p.id] ?? awalPengiriman(o)]] : []
  }))
  function pilihMetode(value: MetodePengiriman) { setMetode(value); setPengaturan({}) }
  const loading = targets.filter((p) => !hasil[p.id]).length
  const selected = targets.filter((p) => !dikecualikan[p.id])
  const errors = selected.map((p) => hasil[p.id]?.error ?? galatPengiriman(
    hasil[p.id]?.data?.opsi.find((o) => o.metode === metode), pengaturan[p.id],
  ))
  const ready = selected.length - errors.filter(Boolean).length
  const canSubmit = Boolean(metode) && !loading && selected.length > 0 && errors.every((e) => !e)
  const ulang = targets.filter((p) => hasil[p.id]?.data?.aksi === 'pickup_ulang'
    || (!hasil[p.id]?.data?.aksi && p.status_marketplace === 'RETRY_SHIP')).length
  function update(id: string, patch: Partial<PengaturanPengiriman>) {
    setPengaturan((prev) => ({ ...prev, [id]: { ...pengaturan[id], ...patch } }))
  }
  function reload() { setHasil({}); setPengaturan({}); setPutaran((n) => n + 1) }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>{ulang === targets.length ? 'Jadwalkan Ulang Pickup' : `Proses ${targets.length} pesanan Shopee`}</DialogTitle></DialogHeader>
      {ulang > 0 && <p className="text-sm">{ulang} pesanan membutuhkan penjadwalan ulang pickup. Pilih alamat dan jadwal terbaru dari Shopee.</p>}
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Metode pengiriman</legend>
        {(['dropoff', 'pickup'] as const).map((value) => {
          const supported = targets.some((p) => hasil[p.id]?.data?.opsi.some((o) => o.metode === value && o.tersedia))
          return <label key={value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="metode-pengiriman" checked={metode === value}
              disabled={loading > 0 || !supported} onChange={() => pilihMetode(value)} />
            {LABEL_METODE[value]}{!loading && !supported && ' (tidak tersedia)'}
          </label>
        })}
      </fieldset>
      {loading > 0 && <Spinner column label={`Memuat opsi dari Shopee… ${targets.length - loading}/${targets.length}`} />}
      {targets.map((p) => {
        const result = hasil[p.id]
        const o = result?.data?.opsi.find((o) => o.metode === metode)
        const s = pengaturan[p.id]
        const a = o?.alamat.find((a) => a.address_id === s?.address_id)
        const error = result?.error ?? (result?.data?.opsi.length === 0
          ? 'Shopee tidak menyediakan metode pengiriman yang didukung ERP. Gunakan Seller Centre.'
          : metode && result ? galatPengiriman(o, s) : null)
        const excluded = Boolean(dikecualikan[p.id])
        return <fieldset key={p.id} className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">#{p.id_eksternal}</legend>
          {targets.length > 1 && <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!excluded} onChange={() => setDikecualikan((prev) => ({ ...prev, [p.id]: !excluded }))} />
            Sertakan pesanan ini
          </label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {!excluded && o?.tersedia && s && <>
            {metode === 'pickup' && o.alamat.length > 0 && <label className="block space-y-1 text-sm">
              <span>Alamat penjemputan</span>
              <select className={selectClass} value={s.address_id ?? ''} onChange={(e) => {
                const addr = o.alamat.find((a) => a.address_id === Number(e.target.value))
                update(p.id, { address_id: addr?.address_id, pickup_time_id: o.wajib.includes('pickup_time_id')
                  ? (addr?.jadwal.find((t) => t.rekomendasi) ?? addr?.jadwal[0])?.pickup_time_id : undefined })
              }}>
                <option value="">Pilih alamat</option>
                {o.alamat.map((a) => <option key={a.address_id} value={a.address_id}>{a.label}{a.rekomendasi ? ' (rekomendasi)' : ''}</option>)}
              </select>
            </label>}
            {metode === 'pickup' && o.wajib.includes('pickup_time_id') && <label className="block space-y-1 text-sm">
              <span>Jadwal penjemputan</span>
              <select className={selectClass} value={s.pickup_time_id ?? ''} onChange={(e) => update(p.id, { pickup_time_id: e.target.value })}>
                <option value="">Pilih jadwal</option>
                {a?.jadwal.map((t) => <option key={t.pickup_time_id} value={t.pickup_time_id}>
                  {t.tanggal ? `${new Date(t.tanggal * 1000).toLocaleDateString('id-ID')} — ` : ''}{t.label}{t.rekomendasi ? ' (rekomendasi)' : ''}
                </option>)}
              </select>
            </label>}
            {metode === 'dropoff' && o.wajib.includes('branch_id') && <label className="block space-y-1 text-sm">
              <span>Gerai/cabang tujuan</span>
              <select className={selectClass} value={s.branch_id ?? ''} onChange={(e) => update(p.id, { branch_id: Number(e.target.value) || undefined })}>
                <option value="">Pilih cabang</option>
                {o.cabang.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.label}</option>)}
              </select>
            </label>}
            {metode === 'dropoff' && o.wajib.includes('sender_real_name') && <label className="block space-y-1 text-sm">
              <span>Nama pengirim</span>
              <Input value={s.sender_real_name ?? ''} maxLength={255} onChange={(e) => update(p.id, { sender_real_name: e.target.value })} />
            </label>}
            {metode === 'dropoff' && o.wajib.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada pengaturan tambahan. Serahkan paket ke gerai kurir yang melayani pesanan ini.</p>}
          </>}
        </fieldset>
      })}
      {metode && <p className="text-sm">{ready} siap, {selected.length - ready} perlu diperiksa, {targets.length - selected.length} dikecualikan.</p>}
      <p className="text-sm text-muted-foreground">Konfirmasi akan mengatur pengiriman di Shopee. Status Dikirim mengikuti Shopee setelah paket diserahkan. Jika hasil tidak pasti, sinkronkan status sebelum mencoba lagi.</p>
      <DialogFooter>
        <Button variant="ghost" onClick={reload} disabled={loading > 0}>Muat ulang opsi</Button>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button disabled={!canSubmit} onClick={() => onConfirm(selected.map((p) => p.id), Object.fromEntries(selected.map((p) => [p.id, pengaturan[p.id]])))}>
          {cetak ? 'Proses & cetak resi' : ulang === targets.length ? 'Jadwalkan ulang pickup' : 'Proses Pesanan'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
