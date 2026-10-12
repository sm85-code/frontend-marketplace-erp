import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ErrorDetails } from './ShopeeEngagement'

describe('Shopee response diagnostics', () => {
  it('shows partial item rejection and copyable request reference', () => {
    const html = renderToStaticMarkup(<ErrorDetails result={{ ok: false, success_ids: ['1'], failures: [{ item_id: '2', error: 'boost_rejected', message: 'Cooldown masih aktif' }], request_id: 'trace-123', warnings: [], diagnostic: { diagnostic_id: 'diag-1', time: '2026-10-12', endpoint: '/api/v2/product/boost_item', account_id: 'shop-1', request_id: 'trace-123', error: 'partial_rejection', message: '', failures: [] } }} />)
    expect(html).toContain('Produk 2')
    expect(html).toContain('Cooldown masih aktif')
    expect(html).toContain('trace-123')
    expect(html).toContain('Salin diagnostik error')
  })
  it('shows the server message for a top-level API rejection', () => {
    const html = renderToStaticMarkup(<ErrorDetails error={{ response: { status: 502, data: { detail: { message: 'Izin Shopee ditolak' } } } }} />)
    expect(html).toContain('Izin Shopee ditolak')
    expect(html).toContain('http_502')
  })
})
