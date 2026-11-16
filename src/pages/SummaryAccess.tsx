import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { daftarRole, ubahRole } from '@/api/roles'
import QueryError from '@/components/QueryError'
import { useAuth } from '@/lib/auth'

/** Summary permission only; existing role editor/API remains authoritative. */
export default function SummaryAccess() {
  const qc = useQueryClient()
  const { muatUlangAkses } = useAuth()
  const q = useQuery({ queryKey: ['roles'], queryFn: daftarRole })
  const save = useMutation({ mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
    const latest = (await daftarRole()).roles.find(r => r.id === id)
    if (!latest) throw new Error('Role tidak ditemukan')
    const halaman = { ...latest.halaman }
    if (enabled) halaman.summary = 'baca'
    else delete halaman.summary
    return ubahRole(id, { nama: latest.nama, keterangan: latest.keterangan, akses_toko: latest.akses_toko, halaman })
  }, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['roles'] }); await muatUlangAkses() } })
  return <section className="rounded-lg border p-3 space-y-2" aria-label="Hak akses Summary"><h2 className="font-semibold text-sm">Akses Summary (baca saja)</h2><p className="text-xs text-muted-foreground">Administrator selalu dapat mengakses. Aktifkan untuk role lain; pembatasan toko role tetap berlaku.</p>{q.isPending && <p className="text-sm">Memuat role…</p>}{q.error && <QueryError error={q.error} retry={q.refetch} />}{save.error && <p role="alert" className="text-sm">{save.error.message}</p>}<div className="max-w-full overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Role</th><th className="text-left p-2">Akses Summary</th></tr></thead><tbody>{q.data?.roles.map(r => <tr key={r.id}><td className="p-2">{r.nama}</td><td className="p-2"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={r.id === 'admin' || r.halaman.summary === 'baca'} disabled={r.id === 'admin' || save.isPending} onChange={e => save.mutate({ id: r.id, enabled: e.target.checked })} aria-label={`Akses Summary untuk ${r.nama}`} />Baca</label></td></tr>)}</tbody></table></div></section>
}
