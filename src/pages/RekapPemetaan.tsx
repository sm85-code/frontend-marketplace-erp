import { fmtAngka } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { getProcessingRekap } from '@/api/processing'
import TabelLaporan from '@/components/TabelLaporan'

const angka = (n: number) => fmtAngka(n)

/** Items mapped vs not yet mapped per shop, in the report-table pattern; folded by default so the work list keeps the space. */
export default function RekapPemetaan() {
  const q = useQuery({ queryKey: ['processing-rekap'], queryFn: getProcessingRekap, staleTime: 60_000 })
  if (!q.data) return null
  const d = q.data
  return (
    <TabelLaporan
      judul="Rekap pemetaan"
      ringkas={`Belum ${angka(d.belum)} · Sudah ${angka(d.sudah)} item`}
      lipat
      kolom={[{ judul: 'Toko' }, { judul: 'Belum dipetakan', angka: true }, { judul: 'Sudah dipetakan', angka: true }, { judul: 'Total', angka: true }]}
      baris={d.items.map((r) => ({ kunci: r.toko, sel: [r.toko, <span key="b" className={r.belum ? 'font-semibold text-destructive' : ''}>{angka(r.belum)}</span>, angka(r.sudah), angka(r.belum + r.sudah)] }))}
      total={['Total', angka(d.belum), angka(d.sudah), angka(d.belum + d.sudah)]}
    />
  )
}
