import MoneyInput from '@/components/MoneyInput'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import type { AksiKampanye, KampanyeIklan, PerubahanKataKunci } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ModalProduk from './ModalProduk'
import { aksiTersedia, angkaDari, anggaranTeks, jenisKampanye, saranKampanye, statusKampanye } from '@/lib/iklanKampanye'

const WARNA = { bahaya: 'border-destructive/50 bg-destructive/10', peringatan: 'border-amber-500/50 bg-amber-500/10', baik: 'border-emerald-500/50 bg-emerald-500/10', info: 'bg-muted' }

/** Settings of one Shopee campaign: pause/resume/stop/delete, daily budget, ROAS target, and (manual) keywords. */
export default function KelolaKampanye({ akunId, kampanye: k, hari, biayaShopee, onTutup }: { akunId: string; kampanye: KampanyeIklan; hari: number; biayaShopee: number | null; onTutup: () => void }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const status = statusKampanye(k.status)
  const boleh = aksiTersedia(k.status)
  const [anggaran, setAnggaran] = useState(String(angkaDari(k.anggaran) || ''))
  const [roas, setRoas] = useState(String(angkaDari(k.roas_target) || ''))
  const [kataBaru, setKataBaru] = useState('')
  const [bidBaru, setBidBaru] = useState('')
  const [bidUbah, setBidUbah] = useState<Record<string, string>>({})
  const saran = saranKampanye(k)

  const segarkan = () => qc.invalidateQueries({ queryKey: ['iklan-kampanye'] })
  const aksiMut = useMutation({
    retry: false,
    mutationFn: (p: { aksi: AksiKampanye; budget?: number; roas_target?: number }) => endpoints.aksiKampanyeIklan(akunId, k.campaign_id, p),
    onSuccess: (_d, p) => {
      toast.success('Perubahan dikonfirmasi Shopee')
      segarkan()
      if (p.aksi === 'delete') onTutup()
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  const kataMut = useMutation({
    retry: false,
    mutationFn: (p: PerubahanKataKunci[]) => endpoints.kataKunciKampanyeIklan(akunId, k.campaign_id, p),
    onSuccess: () => {
      toast.success('Kata kunci diperbarui di Shopee')
      setKataBaru('')
      setBidBaru('')
      setBidUbah({})
      segarkan()
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  const sibuk = aksiMut.isPending || kataMut.isPending

  async function jalankan(p: { aksi: AksiKampanye; budget?: number; roas_target?: number }, judul: string, uraian: string, merusak = false) {
    if (sibuk) return
    if (await confirm({ title: judul, description: uraian, confirmLabel: 'Ya, kirim ke Shopee', destructive: merusak })) aksiMut.mutate(p)
  }
  async function ubahKata(p: PerubahanKataKunci, judul: string, uraian: string, merusak = false) {
    if (sibuk) return
    if (await confirm({ title: judul, description: uraian, confirmLabel: 'Ya, kirim ke Shopee', destructive: merusak })) kataMut.mutate([p])
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
        <Button variant="outline" disabled={sibuk} onClick={onTutup}>Kembali ke Kampanye</Button>
        <header>
          <h1 className="flex flex-wrap items-center gap-2">
            {k.nama} <Badge variant={status.varian}>{status.label}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {jenisKampanye(k)} · anggaran {anggaranTeks(k.anggaran, fmtRp)}/hari · {k.item_id.length} produk · performa {hari} hari
          </p>
        </header>

        {k.kinerja && (
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              ['Biaya', fmtRp(k.kinerja.expense)],
              ['Klik', k.kinerja.clicks.toLocaleString('id-ID')],
              ['Pesanan', k.kinerja.direct_order.toLocaleString('id-ID')],
              ['GMV', fmtRp(k.kinerja.direct_gmv)],
            ].map(([a, b]) => (
              <div key={a} className="rounded-md border p-2">
                <dt className="teks-kecil text-muted-foreground">{a}</dt>
                <dd className="font-semibold">{b}</dd>
              </div>
            ))}
          </dl>
        )}

        {saran.length > 0 && (
          <section aria-label="Saran otomatis" className="space-y-2">
            <h3 className="text-sm font-semibold">Saran otomatis</h3>
            <p className="teks-kecil text-muted-foreground">Dihitung dari angka performa dengan aturan sederhana. Anda yang memutuskan.</p>
            <ul className="space-y-1.5">
              {saran.map((s) => (
                <li key={s.teks} className={`rounded-md border p-2 text-sm ${WARNA[s.tingkat]}`}>
                  {s.teks}
                </li>
              ))}
            </ul>
          </section>
        )}

        {k.jumlah_produk > 0 && (
          <section aria-label="Produk diiklankan" className="space-y-2">
            <h3 className="text-sm font-semibold">Produk diiklankan ({k.jumlah_produk})</h3>
            <p className="teks-kecil text-muted-foreground">
              Isi modal supaya Asisten AI tahu kapan iklan ini untung atau rugi.
              {k.margin.roas_impas != null && ` ROAS impas kampanye ini ${k.margin.roas_impas.toLocaleString('id-ID')}× (rata-rata ${k.margin.terisi} dari ${k.margin.total} produk yang modalnya terisi).`}
            </p>
            <ul className="divide-y rounded-md border">
              {k.produk.map((p) => (
                <ModalProduk key={p.item_id} akunId={akunId} produk={p} biayaShopee={biayaShopee} />
              ))}
            </ul>
            {k.jumlah_produk > k.produk.length && (
              <p className="teks-kecil text-muted-foreground">Menampilkan {k.produk.length} dari {k.jumlah_produk} produk. Semua produk ikut dihitung untuk ROAS impas.</p>
            )}
          </section>
        )}

        <section aria-label="Status kampanye" className="space-y-2">
          <h3 className="text-sm font-semibold">Status</h3>
          <div className="flex flex-wrap gap-2">
            {boleh.jeda && (
              <Button variant="outline" disabled={sibuk} onClick={() => jalankan({ aksi: 'pause' }, 'Jeda kampanye?', `"${k.nama}" berhenti tayang sampai Anda lanjutkan lagi.`)}>
                Jeda
              </Button>
            )}
            {boleh.lanjut && (
              <Button disabled={sibuk} onClick={() => jalankan({ aksi: 'resume' }, 'Lanjutkan kampanye?', `"${k.nama}" tayang lagi dan memakai saldo iklan.`)}>
                Lanjutkan
              </Button>
            )}
            {boleh.hentikan && (
              <Button variant="outline" disabled={sibuk} onClick={() => jalankan({ aksi: 'stop' }, 'Hentikan kampanye?', `"${k.nama}" diakhiri sekarang.`, true)}>
                Hentikan
              </Button>
            )}
            {boleh.hapus && (
              <Button variant="destructive" disabled={sibuk} onClick={() => jalankan({ aksi: 'delete' }, 'Hapus kampanye?', `"${k.nama}" dihapus dari Shopee dan tidak bisa dikembalikan.`, true)}>
                Hapus
              </Button>
            )}
          </div>
        </section>

        {boleh.ubahAnggaran && (
          <section aria-label="Anggaran" className="space-y-2">
            <h3 className="text-sm font-semibold">Anggaran harian</h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="kampanye-anggaran">Rp per hari</Label>
                <MoneyInput id="kampanye-anggaran" type="number" inputMode="numeric" min={0} className="w-40" value={anggaran} onChange={(e) => setAnggaran(e.target.value)} />
              </div>
              <Button
                disabled={sibuk || !(Number(anggaran) > 0)}
                onClick={() => jalankan({ aksi: 'change_budget', budget: Number(anggaran) }, 'Ubah anggaran harian?', `Anggaran "${k.nama}" menjadi ${fmtRp(anggaran)} per hari.`)}
              >
                Simpan anggaran
              </Button>
            </div>
            {k.bidding === 'auto' && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="kampanye-roas">Target ROAS</Label>
                  <Input id="kampanye-roas" type="number" inputMode="decimal" min={0} step="0.1" className="w-40" value={roas} onChange={(e) => setRoas(e.target.value)} />
                </div>
                <Button
                  variant="outline"
                  disabled={sibuk || !(Number(roas) > 0)}
                  onClick={() => jalankan({ aksi: 'change_roas_target', roas_target: Number(roas) }, 'Ubah target ROAS?', `Target ROAS "${k.nama}" menjadi ${roas}×. Sering mengubahnya mengganggu masa belajar iklan.`)}
                >
                  Simpan target
                </Button>
              </div>
            )}
          </section>
        )}

        {k.bidding === 'manual' && (
          <section aria-label="Kata kunci" className="space-y-2">
            <h3 className="text-sm font-semibold">Kata kunci ({k.kata_kunci.length})</h3>
            {k.kata_kunci.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada kata kunci aktif.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {k.kata_kunci.map((w) => (
                  <li key={w.kata} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                    <span className="min-w-[8rem] flex-1 font-medium">{w.kata}</span>
                    <Badge variant="outline">{w.tipe === 'exact' ? 'Persis' : 'Luas'}</Badge>
                    <Input
                      aria-label={`Bid ${w.kata}`}
                      type="number"
                      inputMode="numeric"
                      className="w-24"
                      value={bidUbah[w.kata] ?? String(angkaDari(w.bid))}
                      onChange={(e) => setBidUbah((b) => ({ ...b, [w.kata]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sibuk || !(Number(bidUbah[w.kata]) > 0) || Number(bidUbah[w.kata]) === angkaDari(w.bid)}
                      onClick={() => ubahKata({ aksi: 'change_bid_price', kata: w.kata, bid: Number(bidUbah[w.kata]) }, 'Ubah bid?', `Bid "${w.kata}" menjadi ${fmtRp(bidUbah[w.kata])} per klik.`)}
                    >
                      Simpan bid
                    </Button>
                    <Button size="sm" variant="ghost" disabled={sibuk} onClick={() => ubahKata({ aksi: 'delete', kata: w.kata }, 'Hapus kata kunci?', `"${w.kata}" dihapus dari kampanye ini.`, true)}>
                      Hapus
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="kampanye-kata-baru">Tambah kata kunci</Label>
                <Input id="kampanye-kata-baru" className="w-48" value={kataBaru} onChange={(e) => setKataBaru(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kampanye-bid-baru">Bid (Rp)</Label>
                <MoneyInput id="kampanye-bid-baru" type="number" inputMode="numeric" className="w-24" value={bidBaru} onChange={(e) => setBidBaru(e.target.value)} />
              </div>
              <Button
                disabled={sibuk || !kataBaru.trim() || !(Number(bidBaru) > 0)}
                onClick={() => ubahKata({ aksi: 'add', kata: kataBaru.trim(), bid: Number(bidBaru), tipe: 'broad' }, 'Tambah kata kunci?', `"${kataBaru.trim()}" ditambahkan dengan bid ${fmtRp(bidBaru)} per klik (tipe luas).`)}
              >
                Tambah
              </Button>
            </div>
          </section>
        )}
      </div>
  )
}
