import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as endpoints from '@/api/endpoints'
import { aksesSaya } from '@/api/roles'
import type { AksesSaya, Tingkat, User } from '@/api/types'
import { AKSES_ADMIN_CADANGAN, bisa as bisaAkses } from '@/lib/akses'

const AuthCtx = createContext<AuthContextValue | null>(null)
const USER_KEY = 'mpe_user'

interface AuthContextValue {
  user: User | null
  /** What the user's role may do; null while it loads. */
  akses: AksesSaya | null
  /** Whether the role reaches a page (halaman) at a level. */
  bisa: (halaman: string, perlu?: Tingkat) => boolean
  /** Reload the settings (after an admin changed a role). */
  muatUlangAkses: () => Promise<void>
  loading: boolean
  login: (identitas: string, password: string) => Promise<User>
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>
  refreshUser: () => Promise<User>
  logout: () => Promise<void>
}

function readCachedUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as User | null
  } catch {
    return null
  }
}

function cacheUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* private mode */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readCachedUser())
  const [akses, setAkses] = useState<AksesSaya | null>(null)
  const [loading, setLoading] = useState(true)

  const muatAkses = useCallback(async (u: User | null) => {
    if (!u) return setAkses(null)
    try {
      setAkses(await aksesSaya())
    } catch {
      setAkses(AKSES_ADMIN_CADANGAN(u.role)) // the settings could not be read: show no menus rather than guess
    }
  }, [])

  useEffect(() => {
    endpoints
      .me()
      .then(async (u) => {
        setUser(u)
        cacheUser(u)
        await muatAkses(u)
      })
      .catch(() => {
        cacheUser(null)
        setUser(null)
        setAkses(null)
      })
      .finally(() => setLoading(false))
  }, [muatAkses])

  const login = useCallback(async (identitas: string, password: string) => {
    const u = await endpoints.login(identitas, password)
    cacheUser(u)
    setUser(u)
    await muatAkses(u)
    return u
  }, [muatAkses])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const u = await endpoints.changePassword(currentPassword, newPassword)
    cacheUser(u)
    setUser(u)
    return u
  }, [])

  const refreshUser = useCallback(async () => {
    const u = await endpoints.me()
    cacheUser(u)
    setUser(u)
    await muatAkses(u)
    return u
  }, [muatAkses])

  const muatUlangAkses = useCallback(() => muatAkses(user), [muatAkses, user])

  const logout = useCallback(async () => {
    try {
      await endpoints.logout()
    } catch {
      /* ignore */
    }
    cacheUser(null)
    setUser(null)
    setAkses(null)
    window.location.href = '/login'
  }, [])

  const bisa = useCallback((halaman: string, perlu: Tingkat = 'baca') => bisaAkses(akses, halaman, perlu), [akses])
  const value = useMemo(
    () => ({ user, akses, bisa, muatUlangAkses, login, changePassword, refreshUser, logout, loading }),
    [user, akses, bisa, muatUlangAkses, login, changePassword, refreshUser, logout, loading],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
