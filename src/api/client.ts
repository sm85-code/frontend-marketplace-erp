import axios from 'axios'

/** Base path of the marketplace_erp tenant on sm85-arch (main.py include_router prefix). */
export const API_PREFIX = '/api/marketplace-erp'

export function resolveBackendOrigin(raw: string | undefined, fallbackOrigin: string): string {
  const value = (raw || '').trim() || fallbackOrigin
  return value.replace(/\/+$/, '').replace(/\/api(\/marketplace-erp)?$/i, '')
}

const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'
export const BACKEND_ORIGIN = resolveBackendOrigin(import.meta.env.VITE_BACKEND_URL, fallbackOrigin)
export const API_BASE = `${BACKEND_ORIGIN}${API_PREFIX}`

/**
 * Axios client — HttpOnly cookie `marketplace_erp_token` (withCredentials = fetch credentials: 'include').
 */
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

/** Routes that must not bounce to /login on 401. */
export function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/oauth/')
}

api.interceptors.response.use(
  (r) => r,
  (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status
    const url = (err as { config?: { url?: string } })?.config?.url || ''
    if (status === 401 && !url.startsWith('/auth/') && typeof window !== 'undefined') {
      if (!isPublicPath(window.location.pathname)) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?next=${next}`
      }
    }
    return Promise.reject(err)
  },
)

export default api

export function getApiError(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  const e = error as {
    response?: { status?: number; data?: { detail?: unknown } }
    message?: string
  }
  const detail = e?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string; loc?: unknown[] }) => {
        const field = Array.isArray(item?.loc) ? item.loc.filter((p) => p !== 'body').join('.') : ''
        const msg = item?.msg ?? String(item)
        return field ? `${field}: ${msg}` : msg
      })
      .join(', ')
  }
  if (typeof detail === 'string' && detail) return detail
  if (e?.response === undefined && e?.message === 'Network Error') {
    return 'Tidak dapat menghubungi server (cek VITE_BACKEND_URL / CORS).'
  }
  return e?.message || fallback
}
