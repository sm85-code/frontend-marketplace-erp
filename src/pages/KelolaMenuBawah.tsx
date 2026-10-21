import { Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { useLabel, useUbahTeks } from '@/api/pengaturanUi'
import { daftarRole } from '@/api/roles'
import type { AksesSaya, RoleDef } from '@/api/types'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { denganLabel, filterNav, idNavBawah, itemBawahDipilih, NAV, SLOT_BAWAH } from '@/config/nav'

const akses = (r: RoleDef): AksesSaya => ({ role: r.id, nama: r.nama, akses_toko: r.akses_toko, halaman: r.halaman })

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60'

/** The bottom bar of one role: which of its menus take the slots of the phone bar, in what order. */
function KartuRole({ role, pilihan, bisaUbah }: { role: RoleDef; pilihan: string | undefined; bisaUbah: boolean }) {
  const t = useLabel()
  const ubah = useUbahTeks()
  const menu = denganLabel(filterNav(akses(role), NAV), t)
  const sekarang = itemBawahDipilih(menu, pilihan)
  const simpan = (paths: string[]) =>
    ubah.mutate({ id: idNavBawah(role.id), teks: paths.length ? paths.join(',') : null }, { onError: (e) => toast.error(getApiError(e)) })
  const ganti = (slot: number, to: string) => {
    const paths = sekarang.map((n) => n.to)
    if (to) paths[slot] = to
    else paths.splice(slot, 1)
    simpan([...new Set(paths.filter(Boolean))])
  }
  const nama = t(`role:${role.id}`, role.nama)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{nama}</CardTitle>
        {bisaUbah && pilihan !== undefined && (
          <Button type="button" size="sm" variant="outline" onClick={() => simpan([])}>
            Kembalikan ke bawaan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: SLOT_BAWAH }, (_, i) => {
            const dipakai = new Set(sekarang.map((n) => n.to))
            const isi = sekarang[i]?.to ?? ''
            return (
              <div key={i} className="space-y-1">
                <label htmlFor={`bawah-${role.id}-${i}`} className="text-sm font-medium">Posisi {i + 1}</label>
                <select id={`bawah-${role.id}-${i}`} className={selectCls} value={isi} disabled={!bisaUbah || ubah.isPending} onChange={(e) => ganti(i, e.target.value)}>
                  <option value="">— kosong —</option>
                  {menu.map((n) => (
                    <option key={n.to} value={n.to} disabled={dipakai.has(n.to) && n.to !== isi}>{n.label}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
        <div className="flex items-stretch overflow-hidden rounded-lg border bg-muted/30" aria-label={`Pratinjau menu bawah ${nama}`}>
          {sekarang.map((n) => {
            const Icon = n.icon
            return (
              <div key={n.to} className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium text-muted-foreground">
                <span className="flex size-8 items-center justify-center rounded-xl bg-muted"><Icon className="size-4" aria-hidden="true" /></span>
                <span className="truncate">{n.shortLabel ?? n.label}</span>
              </div>
            )
          })}
          <div className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-xl bg-muted"><Menu className="size-4" aria-hidden="true" /></span>
            <span>Lainnya</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Kelola Aplikasi, tab Menu bawah: the phone bottom bar of every role. */
export default function KelolaMenuBawah({ data, bisaUbah }: { data: Record<string, string> | undefined; bisaUbah: boolean }) {
  const roles = useQuery({ queryKey: ['roles'], queryFn: daftarRole, retry: false })
  if (roles.isLoading) return <Spinner label="Memuat role…" />
  if (roles.error) return <QueryError error={roles.error} retry={roles.refetch} />
  return (
    <div className="space-y-4">
      <p className="teks-kecil text-muted-foreground">Pilih sampai {SLOT_BAWAH} menu yang tampil di bilah bawah layar HP untuk tiap role. Menu lain ada di tombol Lainnya. Hanya menu yang boleh dibuka role itu yang bisa dipilih.</p>
      {roles.data?.roles.map((r) => <KartuRole key={r.id} role={r} pilihan={data?.[idNavBawah(r.id)]} bisaUbah={bisaUbah} />)}
    </div>
  )
}
