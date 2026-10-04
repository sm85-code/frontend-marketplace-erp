import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/lib/auth'

/** A quick check for the obvious mistakes while typing; the server does the real one (syntax and the domain). */
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [nama, setNama] = useState(user?.nama ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

  useEffect(() => {
    setNama(user?.nama ?? '')
    setEmail(user?.email ?? '')
  }, [user?.nama, user?.email])

  const simpan = useMutation({
    mutationFn: () => endpoints.updateProfil({ nama: nama.trim(), email: email.trim() || null }),
    onSuccess: async () => {
      await refreshUser()
      toast.success('Profil disimpan')
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  if (!user) return null
  const emailTerisi = email.trim() !== ''
  const emailSalah = emailTerisi && !FORMAT_EMAIL.test(email.trim())
  const berubah = nama.trim() !== user.nama || email.trim() !== (user.email ?? '')

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <h1 className="font-heading text-base leading-none font-semibold tracking-tight">Profil Saya</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">Username</div>
            <div className="font-mono font-medium">{user.username ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Dipakai untuk login. Hanya admin yang bisa mengubahnya.</p>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Role</div>
            <div className="font-medium">{ROLE_LABELS[user.role]}</div>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!emailSalah) simpan.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="profil-nama">Nama</Label>
              <Input id="profil-nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profil-email">Email (opsional)</Label>
              <Input
                id="profil-email"
                type="email"
                autoCapitalize="none"
                value={email}
                aria-invalid={emailSalah}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailSalah ? (
                <p className="text-xs text-destructive">Format email belum benar.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Email dicek saat disimpan (format dan domainnya harus bisa menerima email). Bisa dipakai untuk login. Kosongkan untuk menghapus.
                </p>
              )}
            </div>
            <Button type="submit" disabled={!berubah || emailSalah || !nama.trim() || simpan.isPending}>
              {simpan.isPending ? 'Menyimpan…' : 'Simpan Profil'}
            </Button>
          </form>
          <Button asChild variant="outline">
            <Link to="/ganti-password">Ganti Password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
