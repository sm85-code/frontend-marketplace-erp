import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import * as reports from '@/api/financialReports'
import { useKategori, useKelompok } from '@/api/kategori'
import { emptyLembar, isGroup, type Block } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { susunLaporan } from '@/lib/susunLaporan'
import { applyRinci } from '@/lib/arusKasRinci'
import { bulanAntara, bulanSetelah } from '@/lib/labaBulan'

/** Each row's last shown figure of a month: what the next month opens with (Saldo awal Kas Utama = Saldo akhir, Kas Kecil, Neraca). */
export function posisiAkhir(blocks: Block[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const b of blocks)
    for (const l of b.lines) {
      if (isGroup(l)) continue
      const last = l.cells.map((c) => c.value).filter((v): v is number => v !== null).at(-1)
      if (last !== undefined) out[l.def.key] = last
    }
  return out
}

/**
 * Opening figures of a month that starts with no closed report: the previous months' closing figures, worked out month by
 * month from the first month after the books' opening (Oktober 2026 opens from the typed opening balance). `null` when the
 * month already has a closed report at its start (or is the first month), `undefined` while loading.
 */
export function useAwalBulan(month: string, data: reports.Overview | undefined): Record<string, number> | null | undefined {
  const awalBulan = data?.saldo_awal?.tanggal.slice(0, 7)
  const pertama = awalBulan ? bulanSetelah(awalBulan) : undefined
  const { records } = data ? sheetDays(data, month) : { records: [] }
  const butuh = !!data && !!pertama && pertama < month && !records.length
  const bulan = butuh ? bulanAntara(pertama!, month) : []
  const ov = useQueries({ queries: bulan.map((m) => ({ queryKey: ['financial-reports', 'laba-bulan', m], queryFn: () => reports.overview(m) })) })
  const lb = useQueries({ queries: bulan.map((m) => ({ queryKey: ['financial-manual-sheet', m], queryFn: () => reports.lembarManual(m) })) })
  const op = useQueries({ queries: bulan.map((m) => ({ queryKey: ['operasional-arus-kas', m, false], queryFn: () => reports.operasionalBulan(m, false) })) })
  const daftar = useKategori()
  const kelompok = useKelompok()
  const siap = ov.every((q) => q.data) && lb.every((q) => q.data) && op.every((q) => q.data)
  const kunci = [ov, lb, op].flat().map((q) => q.dataUpdatedAt).join('|')
  return useMemo(() => {
    if (!data) return undefined
    if (!butuh) return null
    if (!siap) return undefined
    let awal: Record<string, number> | null = null
    bulan.forEach((m, i) => {
      const o = ov[i].data!
      const { records: rs, days } = sheetDays(o, m)
      const { plain, sheet, lembarTampil } = susunLaporan(o, rs, days, lb[i].data!.lembar ?? emptyLembar(), op[i].data!, daftar, kelompok, rs.length ? null : awal)
      // Kas Utama and Kas Kecil closing as the Arus Kas table shows them (rolled forward in applyRinci).
      const arus = applyRinci(sheet.find((b) => b.tabel === 'arus_kas')!, days, lembarTampil)
      awal = { ...(awal ?? {}), ...posisiAkhir(plain), ...posisiAkhir([arus]) }
    })
    return awal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, butuh, siap, kunci, bulan.join('|'), daftar, kelompok])
}

/** Today's date in WIB (YYYY-MM-DD). */
const hariIniWib = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)

/**
 * A month counts as final once every weekly period of it has passed: periods up to the running one are taken as closed,
 * also those filled from the Google Drive import without a closing record. Closed books make it final too.
 */
export const bulanFinal = (data: reports.Overview, month: string) => !!data.bulanan?.final || (data.akhir_bulan ?? `${month}-31`) < hariIniWib()
