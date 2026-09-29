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

export const CHANGE_PASSWORD_PATH = '/ganti-password'

/**
 * Where a logged-in user must go instead of `pathname`, or null to stay.
 * Users flagged `must_change_password` are pinned to the Ganti Password page
 * (keeping the original target in ?next=).
 */
export function forcedPasswordRedirect(
  user: { must_change_password?: boolean } | null | undefined,
  pathname: string,
  search = '',
): string | null {
  if (!user?.must_change_password) return null
  if (pathname === CHANGE_PASSWORD_PATH) return null
  const target = pathname + search
  const keepNext = target && target !== '/' ? `?next=${encodeURIComponent(target)}` : ''
  return `${CHANGE_PASSWORD_PATH}${keepNext}`
}
