import InfoTip from '@/components/InfoTip'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLabel } from '@/api/pengaturanUi'
import { halamanTampil, namaGrupAkses } from '@/lib/namaAkses'
import { namaMenu } from '@/lib/namaMenu'
import { centangSimpul, klikSimpul, pohonAkses } from '@/lib/pohonAkses'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { buatRole, daftarRole, hapusRole, ubahRole } from '@/api/roles'
import type { RoleDef, RoleIsian, Tingkat } from '@/api/types'
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
import { samaAkses } from '@/lib/centangAkses'

const BARU = '__baru__'
const KOSONG: RoleIsian = { nama: '', keterangan: '', akses_toko: 'semua', halaman: {} }

/** Only the keys the server still lists: an old page key (before it was split into tabs) is dropped, its tabs carry it. */
const hanyaDikenal = (halaman: Record<string, Tingkat>, dikenal: Set<string>) =>
  Object.fromEntries(Object.entries(halaman).filter(([k]) => dikenal.has(k))) as Record<string, Tingkat>
const isianDari = (r: RoleDef, dikenal: Set<string>): RoleIsian => ({ nama: r.nama, keterangan: r.keterangan, akses_toko: r.akses_toko, halaman: hanyaDikenal(r.halaman, dikenal) })

const INDENT = ['0.5rem', '1.5rem', '2.75rem'] as const

/** Roles and what each may reach: the shops, the pages, and read or write per page. Admin only. */
export default function RoleAkses({ bolehUbah = true }: { bolehUbah?: boolean }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { muatUlangAkses } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['roles'], queryFn: daftarRole })
  const [pilih, setPilih] = useState<string>('admin')
  const [draft, setDraft] = useState<RoleIsian>(KOSONG)

  const role = data?.roles.find((r) => r.id === pilih)
  const baru = pilih === BARU
  const terkunci = !!role?.terkunci || !bolehUbah
  const dikenal = useMemo(() => new Set((data?.halaman ?? []).map((h) => h.id)), [data])
  // Reload the form when another role is picked or the saved one changes (not while the user is typing).
  useEffect(() => {
    if (baru) setDraft(KOSONG)
    else if (role) setDraft(isianDari(role, dikenal))
  }, [pilih, role, baru, dikenal])

  const berubah = useMemo(() => {
    if (baru) return draft.nama.trim() !== '' || Object.keys(draft.halaman).length > 0
    if (!role) return false
    return draft.nama !== role.nama || draft.keterangan !== role.keterangan || draft.akses_toko !== role.akses_toko || !samaAkses(draft.halaman, hanyaDikenal(role.halaman, dikenal))
  }, [draft, role, baru, dikenal])

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
  const pohon = useMemo(() => pohonAkses(halamanTampil(data?.halaman ?? [])), [data])
  const namaSimpul = (n: (typeof pohon)[number]) => (n.grup ? namaGrupAkses(t, n.grup) : n.menu ? namaMenu(t, n.menu) : n.label)
  const isiTerkunci = useMemo(
    () => Object.fromEntries((data?.halaman ?? []).map((h) => [h.id, h.tingkat[h.tingkat.length - 1]])) as Record<string, Tingkat>,
    [data],
  )

  if (isLoading) return <Spinner column label="Memuat role…" />
  if (error) return <QueryError error={error} retry={refetch} />
  if (!data) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
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
          <Button type="button" variant={baru ? 'default' : 'outline'} className={bolehUbah ? 'mt-2 w-full' : 'hidden'} onClick={() => setPilih(BARU)}>
            + Tambah role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{baru ? 'Role baru' : (role?.nama ?? 'Role')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!bolehUbah && <p role="status" className="text-sm text-muted-foreground">Hanya baca: kamu bisa melihat role, tapi tidak bisa mengubahnya.</p>}
          {role?.terkunci && <p className="text-sm text-muted-foreground">Admin selalu punya semua akses dan tidak bisa diubah, supaya tidak ada yang terkunci.</p>}
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
            <InfoTip teks={"Baca: melihat data. Tulis: juga menambah, mengubah, dan menghapus. Menulis otomatis boleh membaca."} />
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
                  {pohon.map((n) => {
                    const akses = role?.terkunci ? isiTerkunci : draft.halaman
                    const label = namaSimpul(n)
                    return (
                      <TableRow key={n.id} data-tingkatan={n.tingkatan} className={n.tingkatan === 0 ? 'bg-muted/50 hover:bg-muted/50' : undefined}>
                        {/* Inline padding: the phone table style sets a fixed cell padding that would flatten the tree. */}
                        <TableCell
                          className={n.tingkatan === 0 ? 'font-semibold' : n.tingkatan === 1 ? 'font-medium' : 'text-muted-foreground'}
                          style={{ paddingLeft: INDENT[n.tingkatan] }}
                        >
                          {n.tingkatan > 0 && <span aria-hidden className="mr-1.5 text-muted-foreground/70">{n.tingkatan === 1 ? '▸' : '·'}</span>}
                          {label}
                        </TableCell>
                        {(['baca', 'tulis'] as const).map((kolom) => {
                          const c = centangSimpul(n.kunci, akses, kolom)
                          return (
                            <TableCell key={kolom} className="text-center">
                              {c === null ? (
                                <span aria-hidden className="text-muted-foreground">
                                  —
                                </span>
                              ) : (
                                <Checkbox
                                  aria-label={`${kolom === 'baca' ? 'Baca' : 'Tulis'} ${label}`}
                                  checked={c}
                                  disabled={terkunci}
                                  onCheckedChange={() => setDraft((d) => ({ ...d, halaman: klikSimpul(n.kunci, d.halaman, kolom) }))}
                                />
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
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
                <Button type="button" variant="outline" onClick={() => role && setDraft(isianDari(role, dikenal))}>
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
