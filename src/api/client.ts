import axios from 'axios'

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')
const normalizedBackendUrl = String(BACKEND_URL).replace(/\/+$/, '').replace(/\/api$/i, '')
export const API = `${normalizedBackendUrl}/api/marketplace-erp`

/** Axios client — HttpOnly cookie auth (marketplace_erp_token, withCredentials). */
const api = axios.create({ baseURL: API, withCredentials: true })

const PUBLIC_PATHS = ['/login']

api.interceptors.response.use(
  (r) => r,
  (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401 && !PUBLIC_PATHS.includes(window.location.pathname)) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api

export function getApiError(
  error: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.',
): string {
  const detail = (error as { response?: { data?: { detail?: unknown } }; message?: string })
    ?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((item: { msg?: string }) => item.msg ?? String(item)).join(', ')
  }
  if (typeof detail === 'string') return detail
  return (error as { message?: string })?.message || fallback
}

export function fmtRp(n: string | number | null | undefined): string {
  const v = typeof n === 'string' ? Number(n) : (n ?? 0)
  if (Number.isNaN(v)) return 'Rp 0'
  return 'Rp ' + Math.round(v).toLocaleString('id-ID')
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return s
  }
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return s
  }
}
