import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import { useConfirm } from '@/components/ConfirmProvider'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PLATFORM_LABELS, ROLE_LABELS } from '@/config/roles'

export default function StaffPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [userDialog, setUserDialog] = useState(false)
  const [userForm, setUserForm] = useState({ nama: '', email: '', password: '', role: 'staff' as 'owner' | 'staff' })
  const [assignDialog, setAssignDialog] = useState(false)
  const [assignForm, setAssignForm] = useState({ user_id: '', akun_id: '' })

  const { data: users, isLoading } = useQuery({ queryKey: qk.users(), queryFn: endpoints.listUsers })
  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const { data: staffAkun } = useQuery({ queryKey: qk.staffAkun(), queryFn: () => endpoints.listStaffAkun() })

  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))
  const userMap = new Map((users ?? []).map((u) => [u.id, u]))
  const staffUsers = (users ?? []).filter((u) => u.role === 'staff')

  const createUserMut = useMutation({
    mutationFn: endpoints.createUser,
    onSuccess: () => {
      toast.success('Akun dibuat — beri tahu password sementara ke pengguna')
      qc.invalidateQueries({ queryKey: ['users'] })
      setUserDialog(false)
      setUserForm({ nama: '', email: '', password: '', role: 'staff' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const assignMut = useMutation({
    mutationFn: endpoints.assignStaffAkun,
    onSuccess: () => {
      toast.success('Staff ditugaskan ke toko')
      qc.invalidateQueries({ queryKey: ['staff-akun'] })
      setAssignDialog(false)
      setAssignForm({ user_id: '', akun_id: '' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const removeMut = useMutation({
    mutationFn: endpoints.removeStaffAkun,
    onSuccess: () => {
      toast.success('Penugasan dihapus')
      qc.invalidateQueries({ queryKey: ['staff-akun'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  async function onRemove(id: string) {
    const ok = await confirm({ title: 'Hapus penugasan?', description: 'Staff ini tidak akan lagi bisa mengakses toko tersebut.' })
    if (ok) removeMut.mutate(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Staff</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignDialog(true)} disabled={!staffUsers.length || !akunList?.length}>
            Tugaskan ke Toko
          </Button>
          <Button onClick={() => setUserDialog(true)}>Tambah Akun</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Akun Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat pengguna…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nama}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'owner' ? 'default' : 'secondary'}>{ROLE_LABELS[u.role]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penugasan Staff ke Toko</CardTitle>
        </CardHeader>
        <CardContent>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(staffAkun ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{userMap.get(row.user_id)?.nama ?? '—'}</TableCell>
                    <TableCell>
                      {akunMap.get(row.akun_id)?.nama_toko ?? '—'}
                      {akunMap.get(row.akun_id) && ` (${PLATFORM_LABELS[akunMap.get(row.akun_id)!.platform]})`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => onRemove(row.id)}>
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(staffAkun ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Belum ada penugasan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableShell>
        </CardContent>
      </Card>

      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={userForm.nama} onChange={(e) => setUserForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Password Sementara</Label>
              <Input type="text" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} minLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm((f) => ({ ...f, role: v as 'owner' | 'staff' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => createUserMut.mutate(userForm)}
              disabled={!userForm.nama || !userForm.email || userForm.password.length < 8}
            >
              Buat Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan Staff ke Toko</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Staff</Label>
              <Select value={assignForm.user_id} onValueChange={(v) => setAssignForm((f) => ({ ...f, user_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Toko</Label>
              <Select value={assignForm.akun_id} onValueChange={(v) => setAssignForm((f) => ({ ...f, akun_id: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih toko" />
                </SelectTrigger>
                <SelectContent>
                  {(akunList ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nama_toko} — {PLATFORM_LABELS[a.platform]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              Batal
            </Button>
            <Button onClick={() => assignMut.mutate(assignForm)} disabled={!assignForm.user_id || !assignForm.akun_id}>
              Tugaskan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
