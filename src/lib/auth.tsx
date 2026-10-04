import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as endpoints from '@/api/endpoints'
import type { User } from '@/api/types'

const AuthCtx = createContext<AuthContextValue | null>(null)
const USER_KEY = 'mpe_user'

interface AuthContextValue {
  user: User | null
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    endpoints
      .me()
      .then((u) => {
        setUser(u)
        cacheUser(u)
      })
      .catch(() => {
        cacheUser(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (identitas: string, password: string) => {
    const u = await endpoints.login(identitas, password)
    cacheUser(u)
    setUser(u)
    return u
  }, [])

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
    return u
  }, [])

  const logout = useCallback(async () => {
    try {
      await endpoints.logout()
    } catch {
      /* ignore */
    }
    cacheUser(null)
    setUser(null)
    window.location.href = '/login'
  }, [])

  const value = useMemo(
    () => ({ user, login, changePassword, refreshUser, logout, loading }),
    [user, login, changePassword, refreshUser, logout, loading],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
