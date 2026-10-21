import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fmtRp } from '@/api/client'
import { bagiLaba, keyPembagian } from '@/config/pembagianLaba'
import { useAuth } from '@/lib/auth'
import { bulanSebelum, useLabaBulan } from '@/lib/labaBulan'
import { cellKey, type Lembar } from '@/lib/sheetEngine'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const namaBulan = (month: string) => `${NAMA_BULAN[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`

/**
 * The whole net profit of the month before is shared out after it closes (admin 40%, owner 60%); none stays in the main cash.
 * The shares go into the Pembagian laba rows of Arus Kas, in the first period of this month. Only the admin sees this.
 */
export default function KartuPembagianLaba({ month, days, lembar, menyimpan, onIsi }: { month: string; days: string[]; lembar: Lembar; menyimpan: boolean; onIsi: (next: Lembar) => void }) {
  const { user } = useAuth()
  const admin = user?.role === 'admin'
  const lalu = bulanSebelum(month)
  const laba = useLabaBulan(lalu, admin)
  if (!admin || laba === null || days.length === 0) return null

  const bagian = bagiLaba(laba)
  const hari = days[0]
  const sudah = bagian.every((p) => lembar.sel[cellKey(keyPembagian(p.id), hari)] === String(p.jumlah))
  const isi = () => onIsi({ ...lembar, sel: { ...lembar.sel, ...Object.fromEntries(bagian.map((p) => [cellKey(keyPembagian(p.id), hari), String(p.jumlah)])) } })

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Laba bersih {namaBulan(lalu)}</div>
          <div className="font-heading text-xl font-bold">{fmtRp(laba)}</div>
        </div>
        {laba > 0 ? (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {bagian.map((p) => (
                <div key={p.id}>
                  <span className="text-muted-foreground">{p.nama} {p.persen}%</span> <span className="font-semibold">{fmtRp(p.jumlah)}</span>
                </div>
              ))}
            </div>
            <Button className="sm:ml-auto" variant={sudah ? 'outline' : 'default'} disabled={sudah || menyimpan} onClick={isi}>
              {sudah ? 'Sudah diisi di Arus Kas' : 'Isi pembagian laba di Arus Kas'}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada laba yang dibagikan.</p>
        )}
      </CardContent>
    </Card>
  )
}
