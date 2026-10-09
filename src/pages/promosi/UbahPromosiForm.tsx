import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ubahPromosi } from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { PromosiDetail } from '@/api/types'
import { epochPromosi } from '@/lib/promosi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FormDialog from '@/components/FormDialog'
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ConfirmProvider'
const local = (n: number) => new Date((n + 7 * 3600) * 1000).toISOString().slice(0, 16)
export default function UbahPromosiForm({ akun, promosi, blocked, onPending }: { akun: string; promosi: PromosiDetail; blocked: boolean; onPending: (value: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [nama, setNama] = useState(promosi.nama)
  const [mulai, setMulai] = useState(local(promosi.mulai_at))
  const [selesai, setSelesai] = useState(local(promosi.selesai_at))
  const qc = useQueryClient(), confirm = useConfirm()
  const mutation = useMutation({ retry: false, mutationFn: () => {
    const data: { nama?: string; mulai_at?: number; selesai_at?: number } = {}
    if (nama.trim() !== promosi.nama) data.nama = nama.trim()
    if (promosi.status === 'upcoming' && mulai !== local(promosi.mulai_at)) data.mulai_at = epochPromosi(mulai)
    if (selesai !== local(promosi.selesai_at)) data.selesai_at = epochPromosi(selesai)
    return ubahPromosi(akun, promosi.id, data)
  }, onSuccess: () => { setOpen(false); void qc.invalidateQueries({ queryKey: ['promosi', akun] }) } })
  useEffect(() => { onPending(mutation.isPending) }, [onPending, mutation.isPending])
  async function submit() { if (await confirm({ title: 'Ubah promosi di Shopee?', description: 'Nama dan jadwal promosi akan diubah. Harga produk tidak berubah.' })) mutation.mutate() }
  return <><Button variant="outline" disabled={blocked || !['upcoming', 'ongoing'].includes(promosi.status)} onClick={() => { setNama(promosi.nama); setMulai(local(promosi.mulai_at)); setSelesai(local(promosi.selesai_at)); mutation.reset(); setOpen(true) }}>Ubah Nama / Jadwal</Button><FormDialog open={open} onOpenChange={setOpen} values={{ nama, mulai, selesai }} busy={mutation.isPending}><DialogContent><DialogHeader><DialogTitle>Ubah Promosi</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit() }}><div className="space-y-2"><Label htmlFor="edit-promo-nama">Nama</Label><Input id="edit-promo-nama" required maxLength={255} value={nama} disabled={mutation.isPending} onChange={e => setNama(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-promo-mulai">Mulai (WIB)</Label><Input id="edit-promo-mulai" type="datetime-local" required value={mulai} disabled={promosi.status !== 'upcoming' || mutation.isPending} onChange={e => setMulai(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-promo-selesai">Selesai (WIB)</Label><Input id="edit-promo-selesai" type="datetime-local" required value={selesai} disabled={mutation.isPending} onChange={e => setSelesai(e.target.value)} /></div>{mutation.error && <p role="alert" className="text-sm text-destructive">{getApiError(mutation.error)} Refresh detail sebelum mencoba ulang.</p>}<Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan…' : 'Simpan'}</Button></form></DialogContent></FormDialog></>
}
