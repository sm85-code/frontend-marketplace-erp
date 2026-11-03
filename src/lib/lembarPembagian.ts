import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import * as reports from '@/api/financialReports'
import { bagiLaba, keyPembagian } from '@/config/pembagianLaba'
import { bulanFinal } from '@/lib/awalBulan'
import { bulanSebelum, hitungBagi, riwayatPembagian, rugiBerjalan, useLabaBanyakBulan, useLabaBulan, usePembagianLaba } from '@/lib/labaBulan'
import type { Lembar } from '@/lib/sheetEngine'

/** Replace only the first period's allocations in memory, leaving persisted cells untouched. */
export function denganPembagian(lembar: Lembar, first: string | undefined, dibagi: number): Lembar {
  if (!first) return lembar
  const sel = { ...lembar.sel }
  for (const p of bagiLaba(dibagi)) sel[`${keyPembagian(p.id)}|${first}`] = String(p.jumlah)
  return { ...lembar, sel }
}

/** Batched equivalent of the live allocation for historical cash reconstruction. */
export function usePembagianBanyakBulan(bulan: string[], hanyaLihat: boolean): (number | null | undefined)[] {
  const prior = bulan.map(bulanSebelum)
  const ov = useQueries({ queries: prior.map(m => ({
    queryKey: ['financial-reports', 'laba-bulan', m, ...(hanyaLihat ? ['arus-kas'] : [])],
    queryFn: () => (hanyaLihat ? reports.overviewArusKas : reports.overview)(m),
  })) })
  const histories = prior.map((m, i) => riwayatPembagian(m, ov[i].data?.saldo_awal))
  const months = [...new Set(prior.flatMap((m, i) => ov[i].data && bulanFinal(ov[i].data!, m) ? [...histories[i].lalu, m] : []))].sort()
  const profits = useLabaBanyakBulan(months, true, hanyaLihat)
  return prior.map((m, i) => {
    const o = ov[i].data
    if (!o) return undefined
    if (!bulanFinal(o, m)) return null
    if (!profits) return undefined
    const { lalu, awalNilai, pakaiAwal } = histories[i]
    const laba = (month: string) => profits.laba[months.indexOf(month)]
    const rugi = rugiBerjalan([pakaiAwal ? awalNilai : 0, ...lalu.map(laba)])
    return hitungBagi(laba(m), rugi).dibagi
  })
}

/** Latest final prior-month allocation, applied only to the calculation layer. Never saved. */
export function useLembarPembagian(lembar: Lembar, month: string, days: string[], hanyaLihat: boolean): Lembar {
  const prior = bulanSebelum(month)
  const overview = useQuery({ queryKey: ['financial-reports', 'laba-bulan', prior, ...(hanyaLihat ? ['arus-kas'] : [])], queryFn: () => (hanyaLihat ? reports.overviewArusKas : reports.overview)(prior) })
  const final = !!overview.data && bulanFinal(overview.data, prior)
  const laba = useLabaBulan(prior, final, hanyaLihat)
  const hasil = usePembagianLaba(prior, laba ?? 0, overview.data?.saldo_awal, final, hanyaLihat)
  const first = days[0]
  return useMemo(() => {
    if (!first || !final || laba === null || !hasil.siap) return lembar
    return denganPembagian(lembar, first, hasil.dibagi)
  }, [lembar, first, final, laba, hasil.siap, hasil.dibagi])
}
