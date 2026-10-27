import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import * as reports from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { bagiLaba, keyPembagian } from '@/config/pembagianLaba'
import { useAuth } from '@/lib/auth'
import { bulanAntara, bulanSetelah, hitungBagi, rugiBerjalan, useLabaBanyakBulan } from '@/lib/labaBulan'
import { cellKey, emptyLembar } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const namaBulan = (month: string) => `${NAMA_BULAN[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`

/**
 * Profit split of this month (admin 40%, owner 60%), shown under the Neraca table. Before the month is final (closings
 * cover the 1st to the last day) it is an estimate from the profit so far; only a final month can be filed, into the
 * Pembagian laba rows of the next month's Arus Kas (first period). The backend checks the same. Only the admin sees this.
 */
export default function KartuPembagianLaba({ month, laba, final, mulai }: { month: string; laba: number; final: boolean; mulai?: string }) {
  const { user } = useAuth()
  const admin = user?.role === 'admin'
  const qc = useQueryClient()
  const next = bulanSetelah(month)
  const aktif = admin && final
  const ovNext = useQuery({ queryKey: ['financial-reports', 'laba-bulan', next], queryFn: () => reports.overview(next), enabled: aktif })
  const manualNext = useQuery({ queryKey: ['financial-manual-sheet', next], queryFn: () => reports.lembarManual(next), enabled: aktif })
  const lalu = bulanAntara(mulai && mulai < month ? mulai : month, month)
  const riwayat = useLabaBanyakBulan(lalu, admin)
  const rugiMasuk = riwayat ? rugiBerjalan(riwayat.laba) : 0
  const { dibagi, rugiKeluar } = hitungBagi(laba, rugiMasuk)
  const bagian = bagiLaba(dibagi)
  const hari = ovNext.data ? sheetDays(ovNext.data, next).days[0] : undefined
  const lembar = manualNext.data?.lembar ?? emptyLembar()
  const sudah = !!hari && bagian.every((p) => lembar.sel[cellKey(keyPembagian(p.id), hari)] === String(p.jumlah))
  const save = useMutation({
    mutationFn: () => {
      if (!hari || !manualNext.data) throw new Error('Data bulan berikutnya belum siap')
      const sel = { ...lembar.sel, ...Object.fromEntries(bagian.map((p) => [cellKey(keyPembagian(p.id), hari), String(p.jumlah)])) }
      return reports.saveLembarManual(next, manualNext.data.version, { ...lembar, sel })
    },
    onSuccess: (saved) => {
      qc.setQueryData(['financial-manual-sheet', next], saved)
      toast.success(`Pembagian laba diisi di Arus Kas ${namaBulan(next)}`)
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  if (!admin) return null

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-heading font-semibold">Pembagian laba {namaBulan(month)}</div>
          {final ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Final</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Estimasi, belum tutup buku</span>
          )}
        </div>
        <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{final ? 'Laba/rugi bulan ini' : 'Laba/rugi bulan ini (sampai saat ini)'}</dt>
          <dd className="text-right font-semibold tabular-nums">{fmtRp(laba)}</dd>
          <dt className="text-muted-foreground">Rugi dibawa dari bulan lalu</dt>
          <dd className="text-right tabular-nums">{riwayat ? (rugiMasuk > 0 ? `- ${fmtRp(rugiMasuk)}` : fmtRp(0)) : '…'}</dd>
          <dt className="font-medium">Laba yang dibagikan</dt>
          <dd className="text-right font-heading text-lg font-bold tabular-nums">{fmtRp(dibagi)}</dd>
          {bagian.map((p) => (
            <div key={p.id} className="contents">
              <dt className="pl-3 text-muted-foreground">{p.nama} {p.persen}%</dt>
              <dd className="text-right font-semibold tabular-nums">{fmtRp(p.jumlah)}</dd>
            </div>
          ))}
          {rugiKeluar > 0 ? (
            <>
              <dt className="text-red-700">Rugi dibawa ke bulan depan</dt>
              <dd className="text-right font-semibold tabular-nums text-red-700">{fmtRp(rugiKeluar)}</dd>
            </>
          ) : null}
        </dl>
        {final && dibagi > 0 ? (
          <Button variant={sudah ? 'outline' : 'default'} disabled={sudah || save.isPending || !hari || !manualNext.data || !riwayat} onClick={() => save.mutate()}>
            {sudah ? `Sudah diisi di Arus Kas ${namaBulan(next)}` : `Isi pembagian laba di Arus Kas ${namaBulan(next)}`}
          </Button>
        ) : null}
        {riwayat && riwayat.kosong.length ? (
          <p className="text-xs text-muted-foreground">Tanpa data (dihitung Rp0): {riwayat.kosong.map(namaBulan).join(', ')}.</p>
        ) : null}
        {!lalu.length ? <p className="text-xs text-muted-foreground">Tidak ada data bulan sebelumnya; rugi bawaan dihitung Rp0.</p> : null}
        {!final ? <p className="text-xs text-muted-foreground">Angka bisa berubah. Pembagian laba bisa diisi setelah tutup buku mencakup tanggal 1 sampai akhir bulan.</p> : null}
      </CardContent>
    </Card>
  )
}
