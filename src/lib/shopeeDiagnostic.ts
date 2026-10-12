import type { ShopeeDiagnostic } from '@/api/commerce'

/** Only server-sanitized diagnostics or transport metadata; no headers or request body. */
export function shopeeDiagnostic(error: unknown): ShopeeDiagnostic | null {
  if (!error) return null
  const value = error as { response?: { status?: number; data?: { detail?: { diagnostic?: ShopeeDiagnostic } } }; config?: { url?: string } }
  const supplied = value.response?.data?.detail?.diagnostic
  if (supplied) return supplied
  return { diagnostic_id: crypto.randomUUID(), time: new Date().toISOString(),
    endpoint: value.config?.url?.split('?')[0] || 'Shopee / ERP', account_id: null, request_id: null,
    error: value.response?.status ? `http_${value.response.status}` : 'network_error',
    message: 'Diagnostik server tidak tersedia. Periksa log backend; jangan mengulang perubahan sebelum memastikan hasilnya.', failures: [] }
}
