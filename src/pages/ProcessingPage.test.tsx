import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { bisa } from '@/lib/akses'
import ProcessingPage from './ProcessingPage'

const state = vi.hoisted(() => ({ halaman: {} as Record<string, 'baca' | 'tulis'> }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ bisa: (page: string) => bisa({ role: 'delegated', nama: 'Delegated', akses_toko: 'semua', halaman: state.halaman }, page) }) }))
vi.mock('./ProcessingWorkflow', () => ({ default: () => <div>Workflow allowed</div> }))
vi.mock('@/components/daftar', () => ({ BarHalaman: () => null }))
vi.mock('./ProcessingPrices', () => ({ default: () => null }))
vi.mock('./ProcessingParties', () => ({ default: () => null }))
vi.mock('./SupplierCatalogPanel', () => ({ default: () => null }))

function render(halaman: typeof state.halaman) {
  state.halaman = halaman
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const html = renderToStaticMarkup(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/processing/pemetaan']}><ProcessingPage /></MemoryRouter></QueryClientProvider>)
  qc.clear()
  return html
}

describe('Pemetaan Order page permission', () => {
  it.each(['processing_tukang', 'processing_supplier', 'processing_pengecatan', 'processing_packing'])('opens for %s without a parent permission', (page) => {
    for (const level of ['baca', 'tulis'] as const) expect(render({ [page]: level })).toContain('Workflow allowed')
  })
  it('does not open for an obsolete parent permission or Data Produksi alone', () => {
    for (const pages of [{}, { processing: 'tulis' }, { data_tukang: 'baca' }] as typeof state.halaman[]) {
      expect(render(pages)).not.toContain('Workflow allowed')
    }
  })
})
