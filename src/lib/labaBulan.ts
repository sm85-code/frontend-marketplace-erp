import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import * as reports from '@/api/financialReports'
import { useKategori, useKelompok } from '@/api/kategori'
import { emptyLembar, isGroup, type Line } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { susunLaporan } from '@/lib/susunLaporan'

export const bulanSebelum = (month: string) => {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5))
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** Net profit of a month exactly as the Laba/Rugi tab shows it (closed books, typed figures and Operasional entries), or null while it loads. */
export function useLabaBulan(month: string, aktif: boolean): number | null {
  const overview = useQuery({ queryKey: ['financial-reports', 'laba-bulan', month], queryFn: () => reports.overview(month), enabled: aktif })
  const lembar = useQuery({ queryKey: ['financial-manual-sheet', month], queryFn: () => reports.lembarManual(month), enabled: aktif })
  const operasional = useQuery({ queryKey: ['operasional-arus-kas', month, false], queryFn: () => reports.operasionalBulan(month, false), enabled: aktif })
  const daftar = useKategori()
  const kelompok = useKelompok()
  return useMemo(() => {
    if (!overview.data || !lembar.data || !operasional.data) return null
    const { records, days } = sheetDays(overview.data, month)
    if (!records.length && !Object.keys(lembar.data.lembar.sel).length) return 0
    const { plain } = susunLaporan(overview.data, records, days, lembar.data.lembar ?? emptyLembar(), operasional.data, daftar, kelompok)
    const baris = plain.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === 'laba')
    return baris?.total ?? 0
  }, [overview.data, lembar.data, operasional.data, daftar, kelompok, month])
}
