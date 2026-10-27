import { useQueries, useQuery } from '@tanstack/react-query'
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

export const bulanSetelah = (month: string) => {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
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

/** Months from `dari` up to, not including, `sampai` (both YYYY-MM), at most 36. */
export function bulanAntara(dari: string, sampai: string): string[] {
  const out: string[] = []
  for (let m = dari; m < sampai && out.length < 36; m = bulanSetelah(m)) out.push(m)
  return out
}

/**
 * Carries losses forward: a month's profit first covers the loss still open from earlier months; only the rest is shared
 * (and does not carry on). Returns the loss still open after the given months.
 */
export function rugiBerjalan(labaPerBulan: number[]): number {
  let rugi = 0
  for (const laba of labaPerBulan) {
    const sisa = laba - rugi
    rugi = sisa > 0 ? 0 : -sisa
  }
  return rugi
}

/** Profit split figures for a month: the open loss brought in is taken off first; what is left over carries on. */
export function hitungBagi(laba: number, rugiMasuk: number): { dibagi: number; rugiKeluar: number } {
  const sisa = laba - rugiMasuk
  return sisa > 0 ? { dibagi: sisa, rugiKeluar: 0 } : { dibagi: 0, rugiKeluar: -sisa }
}

/** Net profit of each month (same figure as their Laba/Rugi tab) and which months have no data at all. */
export function useLabaBanyakBulan(bulan: string[], aktif: boolean): { laba: number[]; kosong: string[] } | null {
  const opt = (m: string) => ({ enabled: aktif && bulan.length > 0, m })
  const ov = useQueries({ queries: bulan.map((m) => ({ queryKey: ['financial-reports', 'laba-bulan', m], queryFn: () => reports.overview(m), enabled: opt(m).enabled })) })
  const lb = useQueries({ queries: bulan.map((m) => ({ queryKey: ['financial-manual-sheet', m], queryFn: () => reports.lembarManual(m), enabled: opt(m).enabled })) })
  const op = useQueries({ queries: bulan.map((m) => ({ queryKey: ['operasional-arus-kas', m, false], queryFn: () => reports.operasionalBulan(m, false), enabled: opt(m).enabled })) })
  const daftar = useKategori()
  const kelompok = useKelompok()
  const siap = ov.every((q) => q.data) && lb.every((q) => q.data) && op.every((q) => q.data)
  const kunci = [ov, lb, op].flat().map((q) => q.dataUpdatedAt).join('|')
  return useMemo(() => {
    if (!siap) return null
    const laba: number[] = []
    const kosong: string[] = []
    bulan.forEach((m, i) => {
      const o = ov[i].data!, l = lb[i].data!, p = op[i].data!
      const { records, days } = sheetDays(o, m)
      if (!records.length && !Object.keys(l.lembar.sel).length && !p.length) {
        kosong.push(m)
        laba.push(0)
        return
      }
      const { plain } = susunLaporan(o, records, days, l.lembar ?? emptyLembar(), p, daftar, kelompok)
      const baris = plain.flatMap((b) => b.lines).find((x): x is Line => !isGroup(x) && x.def.key === 'laba')
      laba.push(baris?.total ?? 0)
    })
    return { laba, kosong }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, kunci, bulan.join('|'), daftar, kelompok])
}
