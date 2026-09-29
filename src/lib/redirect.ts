/** Only allow same-app relative paths for ?next= (prevents open redirects). */
export function safeNext(raw: string | null | undefined, fallback = '/pesanan'): string {
  if (!raw) return fallback
  let value = raw
  try {
    value = decodeURIComponent(raw)
  } catch {
    return fallback
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.startsWith('/login')) return fallback
  return value
}
