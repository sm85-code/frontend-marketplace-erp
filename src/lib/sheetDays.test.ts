import { describe, expect, it } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { sheetDays } from './sheetDays'

const weeks: Overview['mingguan'] = [
  ['2026-09-28', '2026-10-04'],
  ['2026-10-05', '2026-10-11'],
  ['2026-10-12', '2026-10-18'],
  ['2026-10-19', '2026-10-25'],
  ['2026-10-26', '2026-11-01'],
  ['2026-11-02', '2026-11-08'],
  ['2026-11-09', '2026-11-15'],
  ['2026-11-16', '2026-11-22'],
  ['2026-11-23', '2026-11-29'],
  ['2026-11-30', '2026-12-06'],
  ['2026-12-07', '2026-12-13'],
].map(([mulai, tanggal]) => ({ mulai, tanggal, jadwal_laporan: tanggal, laporan: null }))

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    sumber_utama: 'erp', asal: null, akhir_bulan: '2026-11-30', jadwal_bulanan: '2026-11-30',
    mingguan: weeks, laporan_bulanan: null, legacy: [], saldo_awal: null,
    laporan: [], berikutnya: null, terakhir: null,
    bulanan: { final: false, pemasukan: '100', pengeluaran: '40', laba: '60', saldo_akhir: null },
    ...overrides,
  }
}

describe('sheetDays', () => {
  it('includes every week intersecting November 2026, retaining the original end-date keys', () => {
    const data = overview()
    const before = structuredClone(data)
    expect(sheetDays(data, '2026-11')).toEqual({ records: [], days: [
      '2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29', '2026-12-06',
    ] })
    expect(data).toEqual(before)
  })

  it('includes both October partial weeks and excludes weeks wholly outside October', () => {
    expect(sheetDays(overview({ akhir_bulan: '2026-10-31' }), '2026-10').days).toEqual([
      '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01',
    ])
  })

  it('preserves historical report dates and their sorting instead of adding fallback weeks', () => {
    const reports = [
      { tanggal: '2026-11-14', imported_historical: true },
      { tanggal: '2026-11-07', imported_historical: true },
    ] as Report[]
    const result = sheetDays(overview({ laporan: reports }), '2026-11')
    expect(result.days).toEqual(['2026-11-07', '2026-11-14'])
    expect(result.records).toEqual([reports[1], reports[0]])
    expect(result.records[0]).toBe(reports[1])
    expect(reports.map(r => r.tanggal)).toEqual(['2026-11-14', '2026-11-07'])
  })

  it('preserves the next-report schedule and month-end close date', () => {
    expect(sheetDays(overview({ berikutnya: '2026-11-01' }), '2026-11').days).toEqual([
      '2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29', '2026-11-30',
    ])
  })
})
