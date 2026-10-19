import type { Overview, Report } from '@/api/financialReports'

/** The reporting periods of a month: every closed report, then the next open weeks, as the report sheet shows them. */
export function sheetDays(data: Overview, month: string): { records: Report[]; days: string[] } {
  const records = [...data.laporan].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const days = records.map((r) => r.tanggal)
  // Continue from the last actual report, keeping imported historical dates intact.
  if (data.berikutnya?.startsWith(month)) {
    let next = data.berikutnya
    for (let i = 0; i < 6 && next.startsWith(month); i++) {
      if (!days.includes(next)) days.push(next)
      const d = new Date(`${next}T12:00:00Z`)
      const untilSunday = (7 - d.getUTCDay()) % 7 || 7
      d.setUTCDate(d.getUTCDate() + untilSunday)
      const sunday = d.toISOString().slice(0, 10)
      next = next < data.akhir_bulan && sunday > data.akhir_bulan ? data.akhir_bulan : sunday
    }
  }
  if (!days.length) for (const w of data.mingguan) if (w.tanggal.startsWith(month)) days.push(w.tanggal)
  return { records, days }
}
