import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'

export default function GantiPasswordPage() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeat,setRepeat]=useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if(newPassword !== repeat) { setError('Konfirmasi password belum cocok'); return }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password berhasil diganti')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
          <CardDescription>
            {user?.must_change_password
              ? 'Akun Anda masih memakai password bawaan. Ganti dulu sebelum melanjutkan.'
              : 'Perbarui password akun Anda.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="current">Password saat ini</Label>
              <Input
                autoComplete="current-password"
                id="current"
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">Password baru</Label>
              <Input
                autoComplete="new-password"
                id="new"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5"><Label htmlFor="repeat">Ulangi password baru</Label><Input id="repeat" autoComplete="new-password" type={showPassword?'text':'password'} required minLength={8} value={repeat} onChange={e=>setRepeat(e.target.value)} aria-invalid={!!repeat&&repeat!==newPassword}/><p className="text-xs text-muted-foreground">Minimal 8 karakter. Konfirmasi harus sama.</p></div>
            <Button type="button" variant="ghost" aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Sembunyikan password':'Tampilkan password'}</Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan Password Baru'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
