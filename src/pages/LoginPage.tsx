import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import WallpaperLayer from '@/components/WallpaperLayer'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identitas, setIdentitas] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) {
    const from = (location.state as { from?: Location })?.from
    return <Navigate to={from?.pathname || '/dashboard'} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(identitas.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getApiError(err, 'Username/email atau password salah'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-bg relative isolate flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6">
      <WallpaperLayer />
      <Card className="relative w-full max-w-md gap-5 py-6 shadow-soft sm:py-8">
        <CardHeader className="space-y-3 px-6 text-center sm:px-8">
          <img
            src="/logo-ampel-kuning.png"
            alt="Ampel Kuning"
            className="mx-auto h-16 w-32 rounded-lg bg-white object-contain sm:h-20 sm:w-40"
          />
          <CardTitle className="modern-brand-title text-xl leading-tight sm:text-2xl">Ampel Kuning ERP</CardTitle>
          <CardDescription className="mx-auto max-w-xs text-sm leading-6">Masuk untuk mengelola toko dan pesanan Anda</CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="identitas">Username atau email</Label>
              <Input
                id="identitas"
                className="h-11 text-base"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                required
                value={identitas}
                onChange={(e) => setIdentitas(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                className="h-11 text-base"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--status-error-border)', background: 'var(--status-error-bg)', color: 'var(--status-error)' }}
              >
                {error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full text-base" disabled={busy}>
              {busy ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
