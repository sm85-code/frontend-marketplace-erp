import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import { useConfirm } from '@/components/ConfirmProvider'
import Spinner from '@/components/Spinner'
import { type KolomTabel, TabelLokal, BarHalaman } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORM_LABELS, ROLES_ADMIN_ONLY, ROLE_LABELS, rolesYangBolehDibuat } from '@/config/roles'
import { useAuth } from '@/lib/auth'
import type { AkunMarketplace, Role, StaffAkun, User } from '@/api/types'

const kolomPengguna: KolomTabel<User>[] = [
  { kunci: 'nama', judul: 'Nama', kelas: 'font-medium', tetap: true, kartu: 'utama', sel: (u) => u.nama, nilai: (u) => u.nama },
  { kunci: 'username', judul: 'Username', kelas: 'font-mono', sel: (u) => u.username ?? '—', nilai: (u) => u.username },
  { kunci: 'email', judul: 'Email', sel: (u) => u.email ?? <span className="text-muted-foreground">—</span>, nilai: (u) => u.email },
  {
    kunci: 'role',
    judul: 'Role',
    kartu: 'utama',
    sel: (u) => <Badge variant={u.role === 'staff' ? 'secondary' : 'default'}>{ROLE_LABELS[u.role]}</Badge>,
    nilai: (u) => u.role,
  },
]

function kolomPenugasan({
  userMap,
  akunMap,
}: {
  userMap: Map<string, User>
  akunMap: Map<string, AkunMarketplace>
}): KolomTabel<StaffAkun>[] {
  const staff = (r: StaffAkun) => userMap.get(r.user_id)?.nama ?? '—'
  const toko = (r: StaffAkun) => {
    const a = akunMap.get(r.akun_id)
    return a ? `${a.nama_toko} (${PLATFORM_LABELS[a.platform]})` : '—'
  }
  return [
    { kunci: 'staff', judul: 'Staff', kartu: 'utama', sel: staff, nilai: staff },
    { kunci: 'toko', judul: 'Toko', kartu: 'utama', sel: toko, nilai: toko },
  ]
}

export default function StaffPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [userDialog, setUserDialog] = useState(false)
  const { user: saya } = useAuth()
  const adalahAdmin = !!saya && ROLES_ADMIN_ONLY.includes(saya.role)
  const peranBoleh = rolesYangBolehDibuat(saya?.role)
  const [userForm, setUserForm] = useState({ nama: '', username: '', email: '', password: '', role: 'staff' as Role })
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ username: '', nama: '', role: 'staff' as Role })
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
      setUserForm({ nama: '', username: '', email: '', password: '', role: 'staff' })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const updateUserMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { username?: string; nama?: string; role?: Role } }) =>
      endpoints.updateUser(id, payload),
    onSuccess: () => {
      toast.success('Akun diperbarui')
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  function bukaEdit(u: User) {
    setEditUser(u)
    setEditForm({ username: u.username ?? '', nama: u.nama, role: u.role })
  }

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
      <BarHalaman judul="Staff">
        <Button variant="outline" onClick={() => setAssignDialog(true)} disabled={!staffUsers.length || !akunList?.length}>
            Tugaskan ke Toko
          </Button>
          <Button onClick={() => { setUserForm((f) => ({ ...f, role: peranBoleh[0] ?? 'staff' })); setUserDialog(true) }}>Tambah Akun</Button>
      </BarHalaman>

      <Card>
        <CardHeader>
          <CardTitle>Akun Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat pengguna…" />
          ) : (
            <TabelLokal
              label="Daftar pengguna"
              items={users}
              kolom={kolomPengguna}
              idDari={(u) => u.id}
              namaDari={(u) => u.nama}
              urutAwal={{ kunci: 'nama', arah: 'asc' }}
              aksi={
                adalahAdmin
                  ? (u) => (
                      <Button size="sm" variant="outline" onClick={() => bukaEdit(u)}>
                        Ubah
                      </Button>
                    )
                  : undefined
              }
              minWidth={600}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penugasan Staff ke Toko</CardTitle>
        </CardHeader>
        <CardContent>
          <>
            <TabelLokal
              label="Penugasan staff ke toko"
              items={staffAkun}
              kolom={kolomPenugasan({ userMap, akunMap })}
              idDari={(r) => r.id}
              namaDari={(r) => r.id}
              urutAwal={{ kunci: 'staff', arah: 'asc' }}
              aksi={(row) => (
                <Button size="sm" variant="destructive" onClick={() => onRemove(row.id)}>
                  Hapus
                </Button>
              )}
              minWidth={460}
            />
            {(staffAkun ?? []).length === 0 && <p className="py-6 text-center text-muted-foreground">Belum ada penugasan.</p>}
          </>
        </CardContent>
      </Card>

      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-nama-1">Nama</Label>
              <Input id="staff-nama-1" value={userForm.nama} onChange={(e) => setUserForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-username-2">Username</Label>
              <Input id="staff-username-2"
                value={userForm.username}
                autoCapitalize="none"
                onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">3–32 karakter: huruf, angka, titik, garis bawah, atau strip. Dipakai untuk login.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email-opsional-3">Email (opsional)</Label>
              <Input id="staff-email-opsional-3" type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password-sementara-4">Password Sementara</Label>
              <Input id="staff-password-sementara-4" type="text" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} minLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-role-5">Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm((f) => ({ ...f, role: v as Role }))}>
                <SelectTrigger id="staff-role-5" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {peranBoleh.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => createUserMut.mutate({ ...userForm, email: userForm.email.trim() || null })}
              disabled={!userForm.nama || !userForm.username.trim() || userForm.password.length < 8 || createUserMut.isPending}
            >
              Buat Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editUser !== null} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Akun</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-username-6">Username</Label>
              <Input id="staff-username-6"
                value={editForm.username}
                autoCapitalize="none"
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Hanya admin yang bisa mengubah username. Pengguna masuk dengan username ini.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-nama-7">Nama</Label>
              <Input id="staff-nama-7" value={editForm.nama} onChange={(e) => setEditForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-role-8">Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as Role }))}>
                <SelectTrigger id="staff-role-8" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['staff', 'owner', 'admin'] as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Batal
            </Button>
            <Button
              disabled={!editUser || !editForm.username.trim() || !editForm.nama.trim() || updateUserMut.isPending}
              onClick={() =>
                editUser &&
                updateUserMut.mutate({
                  id: editUser.id,
                  payload: { username: editForm.username.trim(), nama: editForm.nama.trim(), role: editForm.role },
                })
              }
            >
              Simpan
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
              <Label htmlFor="staff-staff-9">Staff</Label>
              <Select value={assignForm.user_id} onValueChange={(v) => setAssignForm((f) => ({ ...f, user_id: v }))}>
                <SelectTrigger id="staff-staff-9" className="w-full">
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
              <Label htmlFor="staff-toko-10">Toko</Label>
              <Select value={assignForm.akun_id} onValueChange={(v) => setAssignForm((f) => ({ ...f, akun_id: v }))}>
                <SelectTrigger id="staff-toko-10" className="w-full">
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
