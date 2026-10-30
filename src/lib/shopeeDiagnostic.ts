import type { ShopeeDiagnostic } from '@/api/commerce'

/** Only server-sanitized diagnostics or transport metadata; no headers or request body. */
export function shopeeDiagnostic(error: unknown): ShopeeDiagnostic | null {
  if (!error) return null
  const value = error as { response?: { status?: number; data?: { detail?: string | { diagnostic?: ShopeeDiagnostic } } }; config?: { url?: string } }
  const detail = value.response?.data?.detail
  const supplied = typeof detail === 'object' ? detail?.diagnostic : null
  if (supplied) return supplied
  const reference = typeof detail === 'string' ? detail.match(/request_id:\s*([A-Za-z0-9_-]{1,100})/)?.[1] : null
  const provider = typeof detail === 'string' ? detail.match(/Shopee (\/api\/v2\/[a-z_]+\/[a-z_]+) gagal: ([A-Za-z0-9_.-]+)/) : null
  return { source: 'client_fallback', diagnostic_id: crypto.randomUUID(), time: new Date().toISOString(),
    endpoint: provider?.[1] || value.config?.url?.split('?')[0] || 'Shopee / ERP', account_id: null, request_id: reference || null,
    error: provider?.[2] || (value.response?.status ? `http_${value.response.status}` : 'network_error'),
    message: 'Diagnostik server tidak tersedia. Periksa log backend; jangan mengulang perubahan sebelum memastikan hasilnya.', failures: [] }
}
