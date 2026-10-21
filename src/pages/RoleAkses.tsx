import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLabel } from '@/api/pengaturanUi'
import { idGrupAkses } from '@/config/roles'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { buatRole, daftarRole, hapusRole, ubahRole } from '@/api/roles'
import type { HalamanDef, RoleDef, RoleIsian, Tingkat } from '@/api/types'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { useConfirm } from '@/components/ConfirmProvider'
import TableShell from '@/components/TableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { samaAkses, tercentang, ubahCentang } from '@/lib/centangAkses'

const BARU = '__baru__'
const KOSONG: RoleIsian = { nama: '', keterangan: '', akses_toko: 'semua', halaman: {} }

const isianDari = (r: RoleDef): RoleIsian => ({ nama: r.nama, keterangan: r.keterangan, akses_toko: r.akses_toko, halaman: { ...r.halaman } })

/** Roles and what each may reach: the shops, the pages, and read or write per page. Admin only. */
export default function RoleAkses() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { muatUlangAkses } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['roles'], queryFn: daftarRole })
  const [pilih, setPilih] = useState<string>('admin')
  const [draft, setDraft] = useState<RoleIsian>(KOSONG)

  const role = data?.roles.find((r) => r.id === pilih)
  const baru = pilih === BARU
  const terkunci = !!role?.terkunci
  // Reload the form when another role is picked or the saved one changes (not while the user is typing).
  useEffect(() => {
    if (baru) setDraft(KOSONG)
    else if (role) setDraft(isianDari(role))
  }, [pilih, role, baru])

  const berubah = useMemo(() => {
    if (baru) return draft.nama.trim() !== '' || Object.keys(draft.halaman).length > 0
    if (!role) return false
    return draft.nama !== role.nama || draft.keterangan !== role.keterangan || draft.akses_toko !== role.akses_toko || !samaAkses(draft.halaman, role.halaman)
  }, [draft, role, baru])

  const sesudah = async () => {
    await qc.invalidateQueries({ queryKey: ['roles'] })
    await qc.invalidateQueries({ queryKey: ['users'] })
    await muatUlangAkses()
  }
  const simpan = useMutation({
    mutationFn: () => (baru ? buatRole(draft) : ubahRole(pilih, draft)),
    onSuccess: async (hasil) => {
      toast.success(baru ? 'Role dibuat' : 'Role disimpan')
      await sesudah()
      setPilih(hasil.id)
    },
    onError: (e) => toast.error(getApiError(e)),
  })
  const hapus = useMutation({
    mutationFn: () => hapusRole(pilih),
    onSuccess: async () => {
      toast.success('Role dihapus')
      setPilih('admin')
      await sesudah()
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  async function onHapus() {
    if (!role) return
    const ok = await confirm({ title: `Hapus role ${role.nama}?`, description: 'Role ini tidak bisa dipakai lagi. Tindakan ini tidak bisa dibatalkan.', destructive: true })
    if (ok) hapus.mutate()
  }

  const t = useLabel()
  const grup = useMemo(() => {
    const out: { nama: string; items: HalamanDef[] }[] = []
    for (const h of data?.halaman ?? []) {
      const g = out.find((x) => x.nama === h.grup)
      if (g) g.items.push(h)
      else out.push({ nama: h.grup, items: [h] })
    }
    return out
  }, [data])

  const set = (halaman: string, tingkat: Tingkat | undefined) =>
    setDraft((d) => {
      const next = { ...d.halaman }
      if (tingkat) next[halaman] = tingkat
      else delete next[halaman]
      return { ...d, halaman: next }
    })

  if (isLoading) return <Spinner column label="Memuat role…" />
  if (error) return <QueryError error={error} retry={refetch} />
  if (!data) return null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Daftar role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data.roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPilih(r.id)}
              aria-pressed={pilih === r.id}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left ${pilih === r.id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.nama}</span>
                <span className="teks-kecil text-muted-foreground">{r.jumlah_pengguna} pengguna</span>
              </span>
              {r.terkunci ? <Badge variant="secondary">Terkunci</Badge> : r.sistem ? <Badge variant="secondary">Bawaan</Badge> : null}
            </button>
          ))}
          <Button type="button" variant={baru ? 'default' : 'outline'} className="mt-2 w-full" onClick={() => setPilih(BARU)}>
            + Tambah role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{baru ? 'Role baru' : (role?.nama ?? 'Role')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {terkunci && <p className="text-sm text-muted-foreground">Admin selalu punya semua akses dan tidak bisa diubah, supaya tidak ada yang terkunci.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-nama">Nama role</Label>
              <Input id="role-nama" value={draft.nama} maxLength={80} disabled={terkunci || (!baru && !!role?.sistem)} onChange={(e) => setDraft((d) => ({ ...d, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-ket">Keterangan (opsional)</Label>
              <Input id="role-ket" value={draft.keterangan} maxLength={255} disabled={terkunci} onChange={(e) => setDraft((d) => ({ ...d, keterangan: e.target.value }))} />
            </div>
          </div>

          <fieldset className="space-y-2" disabled={terkunci}>
            <legend className="text-sm font-medium">Akses toko</legend>
            {(
              [
                ['semua', 'Semua toko'],
                ['ditugaskan', 'Hanya toko yang ditugaskan ke pengguna'],
              ] as const
            ).map(([nilai, label]) => (
              <label key={nilai} className="flex items-center gap-2 text-sm">
                <input type="radio" name="role-akses-toko" className="size-4 accent-[var(--primary)]" checked={draft.akses_toko === nilai} onChange={() => setDraft((d) => ({ ...d, akses_toko: nilai }))} />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <h3 className="text-sm font-medium">Akses halaman</h3>
            <p className="teks-kecil text-muted-foreground">Baca: melihat data. Tulis: juga menambah, mengubah, dan menghapus. Menulis otomatis boleh membaca.</p>
            <TableShell label="Akses halaman per role" minWidth={420}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Halaman</TableHead>
                    <TableHead className="w-20 text-center">Baca</TableHead>
                    <TableHead className="w-20 text-center">Tulis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grup.map((g) => (
                    <Fragment key={g.nama}>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={3} className="font-semibold">
                          {t(idGrupAkses(g.nama), g.nama)}
                        </TableCell>
                      </TableRow>
                      {g.items.map((h) => {
                        const sekarang = terkunci ? h.tingkat[h.tingkat.length - 1] : draft.halaman[h.id]
                        return (
                          <TableRow key={h.id}>
                            <TableCell>{h.label}</TableCell>
                            {(['baca', 'tulis'] as const).map((kolom) => (
                              <TableCell key={kolom} className="text-center">
                                {h.tingkat.includes(kolom) ? (
                                  <Checkbox
                                    aria-label={`${kolom === 'baca' ? 'Baca' : 'Tulis'} ${h.label}`}
                                    checked={tercentang(sekarang, kolom)}
                                    disabled={terkunci}
                                    onCheckedChange={(v) => set(h.id, ubahCentang(h.tingkat, draft.halaman[h.id], kolom, v === true))}
                                  />
                                ) : (
                                  <span aria-hidden className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </div>

          {!terkunci && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => simpan.mutate()} disabled={!berubah || simpan.isPending || (baru && draft.nama.trim().length < 2)}>
                {baru ? 'Buat role' : 'Simpan role'}
              </Button>
              {berubah && !baru && (
                <Button type="button" variant="outline" onClick={() => role && setDraft(isianDari(role))}>
                  Batalkan perubahan
                </Button>
              )}
              {!baru && role && !role.sistem && (
                <Button type="button" variant="destructive" className="ml-auto" onClick={onHapus} disabled={hapus.isPending || role.jumlah_pengguna > 0} title={role.jumlah_pengguna > 0 ? 'Masih dipakai pengguna' : undefined}>
                  Hapus role
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
