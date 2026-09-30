import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/lib/auth'

export default function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Profil Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Nama</div>
            <div className="font-medium">{user.nama}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Role</div>
            <div className="font-medium">{ROLE_LABELS[user.role]}</div>
          </div>
          <Button asChild variant="outline">
            <Link to="/ganti-password">Ganti Password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
