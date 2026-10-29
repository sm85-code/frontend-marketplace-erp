import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import FinancialClosePanel from './FinancialClosePanel'
import type { Overview, Report } from '@/api/financialReports'
const record = {
  tanggal: '2026-10-31',
  tutup_bulanan: true,
  lengkap: true,
  hasil: {
    pemasukan: '100.25',
    pengeluaran: '20.00',
    laba: '80.25',
    saldo_akhir: { kas_utama: '100.00' },
  },
} as Report
function render(saved: boolean, latest: string, writable = true, complete = true) {
  const snapshot = { ...record, lengkap: complete }
  const data = {
    akhir_bulan: '2026-10-31',
    jadwal_bulanan: '2026-11-03',
    laporan: saved ? [snapshot] : [],
    laporan_bulanan: saved ? snapshot : null,
    terakhir: latest,
    berikutnya: '2026-11-01',
  } as Overview
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <FinancialClosePanel
        data={data}
        month="2026-10"
        writable={writable}
        live={{
          pemasukan: '101.30',
          pengeluaran: null,
          laba: '80.25',
          kas_utama: '99.50',
        }}
      />
    </QueryClientProvider>,
  )
}
describe('monthly baseline presentation', () => {
  it('shows exact saved/live values, signed differences and ledger editability', () => {
    const html = render(true, '2026-10-31')
    expect(html).toContain('Patokan tersimpan')
    expect(html).toContain('Rp 1,05')
    expect(html).toContain('Rp -0,50')
    expect(html).toContain('tetap dapat diedit')
    expect(html).toContain('Perbarui patokan')
  })
  it('disables updating older baselines and explains the latest-only restriction', () => {
    expect(render(true, '2026-11-01')).toContain('disabled=""')
    expect(render(true, '2026-11-01')).toContain('Hanya cut-off terbaru')
  })
  it('marks an incomplete monthly snapshot as partial and suppresses all variances', () => {
    const html = render(true, '2026-10-31', true, false)
    expect(html).toContain('Tersimpan · cakupan belum lengkap')
    expect(html).toContain('Patokan (parsial / belum ada)')
    expect(html).toContain('Selisih hanya dihitung terhadap patokan lengkap')
    const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)!.slice(1)
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      const cells = row.match(/<td\b[^>]*>[\s\S]*?<\/td>/g)!
      expect(cells[1]).toContain('Rp ')
      expect(cells[2]).toContain('<span>—</span>')
      expect(cells[2]).not.toContain('Rp ')
    }
  })
  it('does not display zero as an unsaved baseline or offer writes to read-only users', () => {
    const html = render(false, '2026-11-01', false)
    expect(html).toContain('Belum ditutup')
    expect(html).not.toContain('Perbarui patokan')
    expect(html).not.toContain('Rp 0,00')
  })
})
