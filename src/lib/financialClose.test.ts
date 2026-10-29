import { describe, expect, it } from 'vitest'
import {
  closePayload,
  cutoffFinished,
  difference,
  emptyClose,
  exactRp,
  latestMonthlyCutoff,
} from './financialClose'
import type { Overview } from '@/api/financialReports'

describe('financial close safety', () => {
  it('discards stale tokens and derived transaction totals while preserving dated evidence', () => {
    const input = {
      ...emptyClose('2026-10-31'),
      preview_token: 'old',
      operasional: '125',
      biaya_iklan: '10',
      transaksi: [
        {
          tanggal: '2026-10-25',
          jenis: 'operasional' as const,
          nominal: '125',
        },
      ],
      stok: '500',
      catatan: 'Koreksi biaya',
    }
    const next = closePayload(input)
    expect(next.preview_token).toBeUndefined()
    expect(next.operasional).toBe('0')
    expect(next.biaya_iklan).toBeNull()
    expect(next.transaksi).toEqual(input.transaksi)
    expect(next.stok).toBe('500')
    expect(next.sumber_diperiksa).toBe(true)
    expect(input.preview_token).toBe('old')
  })
  it('only allows cut-offs after the whole day has ended in WIB', () => {
    expect(cutoffFinished('2026-10-31', new Date('2026-10-31T16:59:59Z'))).toBe(
      false,
    )
    expect(cutoffFinished('2026-10-31', new Date('2026-10-31T17:00:00Z'))).toBe(
      true,
    )
  })
  it('compares exact cents, negative profits and large balances', () => {
    expect(difference('1000000000000000.01', '1000000000000000.00')).toBe(
      '0.01',
    )
    expect(difference('-20.25', '-10.50')).toBe('-9.75')
    expect(exactRp('-1234567.89')).toBe('Rp -1.234.567,89')
  })
  it('does not confuse a calendar-final month or an aggregate report with a saved monthly cut-off', () => {
    expect(
      latestMonthlyCutoff({
        akhir_bulan: '2026-10-31',
        laporan: [{ tanggal: '2026-10-31', tutup_bulanan: true }],
        patokan_bulanan: null,
        bulanan: { final: true },
      } as unknown as Overview),
    ).toBeUndefined()
  })
})
