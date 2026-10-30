import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ErrorDetails } from './ShopeeEngagement'

const report = { diagnostic_id: '810d16fd-024c-4e43-a53e-07a06d127494', time: '2026-10-30', endpoint: '/api/v2/product/boost_item', account_id: 'shop-1', request_id: 'trace-123', error: 'error_api_permission', message: 'PRIVATE access_token=SECRET', failures: [] }
const error = (source: string, code = 'error_api_permission') => ({ response: { status: 403, data: { detail: { message: 'PRIVATE access_token=SECRET', diagnostic: { ...report, source, error: code } } } } })

describe('Shopee response diagnostics', () => {
  it('separates ERP permission from Shopee permission and hides raw diagnostics', () => {
    const erp = renderToStaticMarkup(<ErrorDetails error={error('erp_permission', 'erp_permission')} />)
    expect(erp).toContain('izin ERP')
    expect(erp).toContain('Katalog Lanjutan')
    const shopee = renderToStaticMarkup(<ErrorDetails error={error('shopee_permission')} />)
    expect(shopee).toContain('Izin API Shopee')
    for (const html of [erp, shopee]) {
      expect(html).toContain(report.diagnostic_id)
      expect(html).toContain('Salin kode pemeriksaan')
      expect(html).not.toMatch(/SECRET|PRIVATE|access_token|<pre|<details/)
    }
  })
  it('does not claim Shopee permission just from a legacy 403', () => {
    const html = renderToStaticMarkup(<ErrorDetails error={{ response: { status: 403, data: { detail: 'Akses ditolak SECRET' } } }} />)
    expect(html).toContain('Penyebab penolakan belum terverifikasi')
    expect(html).toContain('lokal')
    expect(html).not.toContain('SECRET')
  })
  it('summarizes partial rejections without rendering provider text', () => {
    const html = renderToStaticMarkup(<ErrorDetails result={{ ok: false, success_ids: ['1'], failures: [{ item_id: '2', error: 'boost_rejected', message: 'PRIVATE SECRET' }], request_id: 'trace-123', warnings: [], diagnostic: report }} />)
    expect(html).toContain('Sebagian atau seluruh item ditolak Shopee')
    expect(html).toContain(report.diagnostic_id)
    expect(html).not.toContain('SECRET')
  })
  it.each(['erp_account_scope', 'erp_account_mismatch'])('explains %s without mislabeling it as a Shopee permission', source => {
    const html = renderToStaticMarkup(<ErrorDetails error={error(source)} />)
    expect(html).toContain(source === 'erp_account_scope' ? 'tidak mencakup toko ini' : 'tidak cocok dengan toko yang dipilih')
    expect(html).not.toMatch(/SECRET|Izin API Shopee/)
  })
  it('distinguishes ERP origin protection without suggesting a bypass', () => {
    const html = renderToStaticMarkup(<ErrorDetails error={error('erp_origin')} />)
    expect(html).toContain('Permintaan lintas situs ditolak ERP')
    expect(html).toContain('alamat ERP resmi')
    expect(html).not.toMatch(/SECRET|Izin API Shopee/)
  })
  it('never renders a malformed support code as raw diagnostics', () => {
    const html = renderToStaticMarkup(<ErrorDetails error={{ response: { data: { detail: { diagnostic: { ...report, diagnostic_id: 'SECRET PRIVATE' } } } } }} />)
    expect(html).not.toMatch(/SECRET|PRIVATE|Salin kode pemeriksaan/)
  })
  it.each([
    { status: 403, source: 'shopee_permission', code: 'error_api_permission', message: 'Izin API Shopee' },
    { status: 504, source: 'shopee', code: 'http_504', message: 'Periksa status sebelum mengirim ulang' },
  ])('uses server preflight diagnostic for HTTP $status, never browser fallback', ({ status, source, code, message }) => {
    const preflightError = { response: { status, data: { detail: {
      message: 'Boost belum dikirim. PRIVATE SECRET',
      diagnostic: { ...report, endpoint: '/api/v2/product/get_item_base_info', source, error: code, request_id: null },
    } } } }
    const html = renderToStaticMarkup(<ErrorDetails error={preflightError} />)
    expect(html).toContain(message)
    expect(html).toContain(`Kode pemeriksaan: ${report.diagnostic_id}`)
    expect(html).toContain('Salin kode pemeriksaan')
    expect(html).not.toMatch(/lokal|SECRET|PRIVATE|access_token|get_item_base_info|trace-123/)
    expect(html).not.toContain('izin ERP')
  })
  it('offers safe generic guidance for unknown errors', () => {
    const html = renderToStaticMarkup(<ErrorDetails error={{ response: { status: 502, data: { detail: { message: 'PRIVATE SECRET' } } } }} />)
    expect(html).toContain('Periksa status sebelum mengirim ulang')
    expect(html).not.toContain('SECRET')
  })
})
