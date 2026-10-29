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
function render(saved: boolean, latest: string, writable = true, next = '2026-11-30', drive = false) {
  const data = {
    akhir_bulan: '2026-10-31',
    jadwal_bulanan: '2026-11-03',
    // Drive-imported weeks may sit in laporan/laporan_bulanan; they must never be shown as the baseline.
    laporan: drive ? [{ ...record, lengkap: false }] : [],
    laporan_bulanan: drive ? { ...record, lengkap: false } : null,
    patokan_bulanan: saved ? record : null,
    tutup_terakhir: saved ? latest : null,
    tutup_berikutnya: saved ? next : next,
    terakhir: '2026-10-13',
    berikutnya: '2026-10-18',
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
    expect(render(true, '2026-11-30')).toContain('disabled=""')
    expect(render(true, '2026-11-30')).toContain('Hanya tutup buku terbaru')
  })
  it('ignores Drive-imported weeks as a baseline', () => {
    const html = render(false, '', true, '2026-10-31', true)
    expect(html).toContain('Belum ditutup')
    expect(html).toContain('Patokan (belum ada)')
    const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)!.slice(1)
    for (const row of rows) expect(row.match(/<td\b[^>]*>[\s\S]*?<\/td>/g)![1]).toContain('<span>—</span>')
  })
  it('offers only a monthly close, never a weekly cut-off', () => {
    const html = render(false, '', true, '2026-10-31')
    expect(html).toContain('Tutup buku 2026-10')
    expect(render(false, '', true, '2026-10-18')).not.toContain('Tutup buku 2026-10<')
  })
  it('does not display zero as an unsaved baseline or offer writes to read-only users', () => {
    const html = render(false, '2026-11-01', false)
    expect(html).toContain('Belum ditutup')
    expect(html).not.toContain('Perbarui patokan')
    expect(html).not.toContain('Rp 0,00')
  })
})
