import PilihanProdukToko from '@/components/PilihanProdukToko'
import FormDialog from '@/components/FormDialog'
import MoneyInput from '@/components/MoneyInput'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Kata = { kata: string; bid: number; tipe: 'exact' | 'broad' }

/** Create an item-level ad. "Cari saran" asks Shopee for a ROAS target, budget range and keywords (with search volume). */
export default function BuatIklan({ akunId, onTutup }: { akunId: string; onTutup: () => void }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [itemId, setItemId] = useState('')
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [anggaran, setAnggaran] = useState('')
  const [roas, setRoas] = useState('')
  const [kata, setKata] = useState<Kata[]>([])
  const [cari, setCari] = useState('')
  const itemAngka = Number(itemId)
  const itemSah = Number.isInteger(itemAngka) && itemAngka > 0

  const saran = useQuery({
    queryKey: ['iklan-saran', akunId, itemAngka, mode, cari],
    queryFn: () => endpoints.saranIklan(akunId, itemAngka, { kata: cari, bidding: mode }),
    enabled: false,
    retry: false,
  })
  const buat = useMutation({
    retry: false,
    mutationFn: () =>
      endpoints.buatKampanyeIklan(akunId, {
        item_id: itemAngka,
        bidding: mode,
        budget: Number(anggaran),
        ...(mode === 'auto' && Number(roas) > 0 ? { roas_target: Number(roas) } : {}),
        ...(mode === 'manual' ? { kata_kunci: kata } : {}),
      }),
    onSuccess: () => {
      toast.success('Pembuatan iklan dikonfirmasi Shopee')
      qc.invalidateQueries({ queryKey: ['iklan-kampanye'] })
      onTutup()
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const bisaKirim = itemSah && Number.isFinite(Number(anggaran)) && Number(anggaran) > 0 && (mode === 'auto' || kata.length > 0)
  async function kirim() {
    if (buat.isPending) return
    const ringkas = [
      `Produk Shopee ${itemId}, ${mode === 'auto' ? 'penawaran otomatis' : `manual dengan ${kata.length} kata kunci`}.`,
      `Anggaran ${fmtRp(anggaran)} per hari, mulai hari ini tanpa tanggal akhir.`,
      'Iklan langsung aktif dan memakai saldo iklan toko.',
    ].join('\n')
    if (await confirm({ title: 'Buat iklan di Shopee?', description: ringkas, confirmLabel: 'Ya, buat iklan' })) buat.mutate()
  }
  const tambah = (k: Kata) => setKata((daftar) => (daftar.some((x) => x.kata === k.kata) ? daftar : [...daftar, k]))
  const s = saran.data

  return (
    <FormDialog open values={{itemId,mode,anggaran,roas,kata}} busy={buat.isPending} onOpenChange={(o) => !o && onTutup()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buat iklan produk</DialogTitle>
          <DialogDescription>Satu produk per iklan. Hasilnya muncul di daftar kampanye setelah Shopee memprosesnya.</DialogDescription>
        </DialogHeader>
        <PilihanProdukToko akunId={akunId} onPilih={setItemId}/>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="iklan-baru-item">ID produk Shopee</Label>
            <Input id="iklan-baru-item" inputMode="numeric" value={itemId} onChange={(e) => setItemId(e.target.value.trim())} aria-invalid={itemId !== '' && !itemSah} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iklan-baru-mode">Jenis</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as 'auto' | 'manual')}>
              <SelectTrigger id="iklan-baru-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Penawaran otomatis</SelectItem>
                <SelectItem value="manual">Manual (kata kunci)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iklan-baru-anggaran">Anggaran per hari (Rp)</Label>
            <MoneyInput id="iklan-baru-anggaran" type="number" inputMode="numeric" min={0} value={anggaran} onChange={(e) => setAnggaran(e.target.value)} />
          </div>
          {mode === 'auto' && (
            <div className="space-y-1.5">
              <Label htmlFor="iklan-baru-roas">Target ROAS (opsional)</Label>
              <Input id="iklan-baru-roas" type="number" inputMode="decimal" min={0} step="0.1" value={roas} onChange={(e) => setRoas(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {mode === 'manual' && (
            <div className="space-y-1.5">
              <Label htmlFor="iklan-baru-cari">Cari kata kunci (opsional)</Label>
              <Input id="iklan-baru-cari" className="w-52" value={cari} onChange={(e) => setCari(e.target.value)} />
            </div>
          )}
          <Button variant="outline" disabled={!itemSah || saran.isFetching} onClick={() => saran.refetch()}>
            {saran.isFetching ? 'Mencari saran…' : 'Cari saran dari Shopee'}
          </Button>
        </div>
        {saran.error && <p role="alert" className="text-sm text-destructive">{getApiError(saran.error)}</p>}
        {s && (
          <section aria-label="Saran Shopee" className="space-y-3 rounded-lg border p-3">
            {s.catatan.length > 0 && <p className="teks-kecil text-muted-foreground">{s.catatan.join(' · ')}</p>}
            {s.anggaran && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Anggaran yang disarankan</p>
                <div className="flex flex-wrap gap-2">
                  {([['Minimum', s.anggaran.min], ['Disarankan', s.anggaran.rekomendasi], ['Maksimum', s.anggaran.maks]] as const).map(
                    ([label, nilai]) =>
                      nilai != null && (
                        <Button key={label} size="sm" variant="outline" onClick={() => setAnggaran(String(nilai))}>
                          {label} {fmtRp(nilai)}
                        </Button>
                      ),
                  )}
                </div>
              </div>
            )}
            {s.roas && mode === 'auto' && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Target ROAS yang disarankan</p>
                <div className="flex flex-wrap gap-2">
                  {(['rendah', 'sedang', 'tinggi'] as const).map(
                    (t) =>
                      s.roas?.[t]?.nilai != null && (
                        <Button key={t} size="sm" variant="outline" onClick={() => setRoas(String(s.roas![t].nilai))}>
                          {t} {s.roas![t].nilai}× {s.roas![t].persentil != null ? `(lebih unggul dari ${100 - (s.roas![t].persentil as number)}%)` : ''}
                        </Button>
                      ),
                  )}
                </div>
              </div>
            )}
            {mode === 'manual' && s.kata_kunci.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Kata kunci yang disarankan</p>
                <ul className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
                  {s.kata_kunci.map((w) => (
                    <li key={w.kata} className="flex flex-wrap items-center gap-2 p-2">
                      <span className="min-w-[8rem] flex-1 font-medium">{w.kata}</span>
                      <span className="teks-kecil text-muted-foreground">
                        cari {w.volume?.toLocaleString('id-ID') ?? '—'} · skor {w.skor ?? '—'} · bid {w.bid != null ? fmtRp(w.bid) : '—'}
                      </span>
                      <Button size="sm" variant="outline" disabled={kata.some((x) => x.kata === w.kata)} onClick={() => tambah({ kata: w.kata, bid: w.bid ?? 0, tipe: 'broad' })}>
                        Tambah
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {mode === 'manual' && (
          <section aria-label="Kata kunci dipilih" className="space-y-2">
            <h3 className="text-sm font-semibold">Kata kunci dipilih ({kata.length})</h3>
            {kata.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pilih dari saran di atas.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {kata.map((w, i) => (
                  <li key={w.kata} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                    <span className="min-w-[8rem] flex-1 font-medium">{w.kata}</span>
                    <Input
                      aria-label={`Bid ${w.kata}`}
                      type="number"
                      inputMode="numeric"
                      className="w-24"
                      value={w.bid || ''}
                      onChange={(e) => setKata((d) => d.map((x, j) => (j === i ? { ...x, bid: Number(e.target.value) } : x)))}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setKata((d) => d.filter((_, j) => j !== i))}>
                      Buang
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onTutup}>
            Batal
          </Button>
          <Button disabled={!bisaKirim || buat.isPending || (mode === 'manual' && kata.some((x) => !(x.bid > 0)))} onClick={kirim}>
            {buat.isPending ? 'Mengirim…' : 'Buat iklan'}
          </Button>
        </div>
      </DialogContent>
    </FormDialog>
  )
}
