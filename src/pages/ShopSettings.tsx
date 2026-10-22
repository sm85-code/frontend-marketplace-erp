import PilihNative from '@/components/PilihNative'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import { getApiError } from '@/api/client'
import { useConfirm } from '@/components/ConfirmProvider'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
const field = 'w-full rounded-lg border bg-background p-2'

export default function ShopSettings({ id, name, close }: { id: string; name: string; close: () => void }) {
  return <Dialog open onOpenChange={v => { if (!v) close() }}><DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Pengaturan Toko · {name}</DialogTitle></DialogHeader><ShopSettingsContent id={id}/></DialogContent></Dialog>
}

export function ShopSettingsContent({id}: {id:string}) {
  const [tab, setTab] = useState('profil')
  return <Tabs value={tab} onValueChange={setTab}><TabsList className="section-tabs w-full"><TabsTrigger value="profil">Profil</TabsTrigger><TabsTrigger value="jasa-kirim">Pengiriman</TabsTrigger><TabsTrigger value="alamat">Alamat</TabsTrigger><TabsTrigger value="libur">Mode Libur</TabsTrigger></TabsList><TabsContent value="profil"><Profile id={id}/></TabsContent><TabsContent value="jasa-kirim"><Channels id={id}/></TabsContent><TabsContent value="alamat"><Addresses id={id}/></TabsContent><TabsContent value="libur"><Holiday id={id}/></TabsContent></Tabs>
}

function useSave(id: string, section: string) {
  const qc = useQueryClient()
  return (result: { warnings: string[] }) => {
    toast.success('Pengaturan dikonfirmasi Shopee')
    result.warnings.forEach(w => toast.warning(w))
    void qc.invalidateQueries({ queryKey: ['shop-settings', id, section] })
    void qc.invalidateQueries({ queryKey: ['akun'] })
  }
}

function Profile({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['shop-settings', id, 'profil'], queryFn: () => api.shopProfile(id), retry: false })
  return <>{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data && <ProfileForm key={JSON.stringify(q.data)} id={id} initial={q.data} />}</>
}
function ProfileForm({ id, initial }: { id: string; initial: api.ShopProfile }) {
  const [name, setName] = useState(initial.shop_name)
  const [description, setDescription] = useState(initial.description ?? '')
  const [logo, setLogo] = useState(initial.shop_logo ?? '')
  const confirm = useConfirm()
  const m = useMutation({ retry: false, mutationFn: () => {
    const body: Partial<api.ShopProfile> = {}
    if (name !== initial.shop_name) body.shop_name = name
    if (description !== (initial.description ?? '')) body.description = description
    if (logo !== (initial.shop_logo ?? '')) body.shop_logo = logo
    if (!Object.keys(body).length) throw Error('Belum ada perubahan')
    return api.editShopProfile(id, body)
  }, onSuccess: useSave(id, 'profil') })
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: 'Ubah profil toko di Shopee?', description: name })) m.mutate() }}><div className="space-y-1"><Label htmlFor="shop-profile-name">Nama toko</Label><Input id="shop-profile-name" required maxLength={100} value={name} disabled={m.isPending} onChange={e => setName(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="shop-profile-description">Deskripsi</Label><Textarea id="shop-profile-description" maxLength={5000} value={description} disabled={m.isPending} onChange={e => setDescription(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="shop-profile-logo">URL logo</Label><Input id="shop-profile-logo" type="url" value={logo} disabled={m.isPending} onChange={e => setLogo(e.target.value)} /></div>{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}<Button disabled={m.isPending} type="submit">Simpan ke Shopee</Button></form>
}

const localHour = (epoch?: number) => epoch ? new Date((epoch + 7 * 3600) * 1000).toISOString().slice(0, 16) : ''
const epochHour = (value: string) => Math.floor(new Date(`${value}:00+07:00`).getTime() / 1000)
function Holiday({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['shop-settings', id, 'libur'], queryFn: () => api.holiday(id), retry: false })
  return <>{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data && <HolidayForm key={JSON.stringify(q.data)} id={id} initial={q.data} />}</>
}
function HolidayForm({ id, initial }: { id: string; initial: api.Holiday }) {
  const [enabled, setEnabled] = useState(initial.holiday_mode_on)
  const [type, setType] = useState<0 | 1>(initial.holiday_mode_type ?? 0)
  const [scheduled, setScheduled] = useState(!!initial.holiday_mode_start_time)
  const [start, setStart] = useState(localHour(initial.holiday_mode_start_time))
  const [end, setEnd] = useState(localHour(initial.holiday_mode_end_time ? initial.holiday_mode_end_time + 1 : undefined))
  const [description, setDescription] = useState(initial.holiday_mode_description ?? '')
  const confirm = useConfirm()
  const m = useMutation({ retry: false, mutationFn: () => api.setHoliday(id, { holiday_mode_on: enabled, holiday_mode_type: type, ...(enabled && (scheduled || type === 1) ? { holiday_mode_start_time: epochHour(start), holiday_mode_end_time: epochHour(end) - 1 } : {}), ...(enabled && description ? { holiday_mode_description: description } : {}) }), onSuccess: useSave(id, 'libur') })
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: enabled ? 'Aktifkan libur toko?' : 'Nonaktifkan libur toko?', description: enabled && type === 0 ? 'Pembeli tidak dapat membuat pesanan baru selama toko libur.' : enabled ? 'Pembeli tetap dapat memesan; Shopee menyesuaikan batas waktu pengiriman.' : 'Toko kembali menerima pesanan sesuai pengaturan Shopee.' })) m.mutate() }}><label className="flex items-center gap-2"><input type="checkbox" checked={enabled} disabled={m.isPending} onChange={e => setEnabled(e.target.checked)} />Mode libur</label>{enabled && <><PilihNative aria-label="Jenis libur" className={field} value={type} disabled={m.isPending} onChange={e => setType(Number(e.target.value) as 0 | 1)}><option value={0}>Libur penuh · tidak menerima pesanan</option><option value={1}>Libur sebagian · tetap menerima pesanan</option></PilihNative>{type === 0 && <label className="flex items-center gap-2"><input type="checkbox" checked={scheduled} disabled={m.isPending} onChange={e => setScheduled(e.target.checked)} />Jadwalkan libur</label>}{(scheduled || type === 1) && <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="holiday-start">Mulai (WIB)</Label><Input id="holiday-start" required type="datetime-local" step={3600} disabled={m.isPending} value={start} onChange={e => setStart(e.target.value)} /></div><div><Label htmlFor="holiday-end">Berakhir pada (WIB)</Label><Input id="holiday-end" required type="datetime-local" step={3600} disabled={m.isPending} value={end} onChange={e => setEnd(e.target.value)} /></div></div>}<Label htmlFor="holiday-description">Keterangan libur</Label><Input id="holiday-description" maxLength={500} disabled={m.isPending} value={description} onChange={e => setDescription(e.target.value)} /></>}{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}<Button type="submit" disabled={m.isPending}>Simpan ke Shopee</Button></form>
}

type DraftKirim = { enabled: boolean; cod: boolean; driver: boolean; minutes: number }
const draftDari = (c: api.Channel): DraftKirim => ({ enabled: c.enabled, cod: c.cod_enabled, driver: c.auto_call_driver_setting?.auto_call_driver_enabled ?? false, minutes: c.auto_call_driver_setting?.preparation_time ?? 0 })
function bodyKirim(c: api.Channel, d: DraftKirim): api.ChannelEdit | null {
  const body: api.ChannelEdit = {}
  if (d.enabled !== c.enabled) body.enabled = d.enabled
  if (d.cod !== c.cod_enabled) body.cod_enabled = d.cod
  if (d.driver !== !!c.auto_call_driver_setting?.auto_call_driver_enabled || (d.driver && d.minutes !== c.auto_call_driver_setting?.preparation_time)) body.auto_call_driver_setting = { auto_call_driver_enabled: d.driver, ...(d.driver ? { preparation_time: d.minutes } : {}) }
  return Object.keys(body).length ? body : null
}

/** All couriers in one list with ONE save button; only changed couriers are sent to Shopee. */
function Channels({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['shop-settings', id, 'jasa-kirim'], queryFn: () => api.channels(id), retry: false })
  const [draft, setDraft] = useState<Record<number, DraftKirim>>({})
  const confirm = useConfirm()
  const selesai = useSave(id, 'jasa-kirim')
  const list = q.data?.logistics_channel_list ?? []
  const ubah = list.map(c => ({ c, body: draft[c.logistics_channel_id] ? bodyKirim(c, draft[c.logistics_channel_id]) : null })).filter((x): x is { c: api.Channel; body: api.ChannelEdit } => !!x.body)
  const m = useMutation({ retry: false, mutationFn: async () => {
    const warnings: string[] = []
    for (const { c, body } of ubah) { const r = await api.editChannel(id, c.logistics_channel_id, body); warnings.push(...(r?.warnings ?? [])) }
    return { warnings }
  }, onSuccess: r => { setDraft({}); selesai(r) } })
  const set = (c: api.Channel, patch: Partial<DraftKirim>) => setDraft(v => ({ ...v, [c.logistics_channel_id]: { ...(v[c.logistics_channel_id] ?? draftDari(c)), ...patch } }))
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: 'Ubah jasa kirim di Shopee?', description: ubah.map(x => x.c.logistics_channel_name).join(', ') })) m.mutate() }}>
    {q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}
    {!!list.length && <ul className="divide-y rounded-xl border">{list.map(c => { const d = draft[c.logistics_channel_id] ?? draftDari(c); const eligible = c.auto_call_driver_setting?.auto_call_driver_eligible; return <li key={c.logistics_channel_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
      <span className="min-w-0 basis-full font-medium sm:basis-40">{c.logistics_channel_name}</span>
      <label className="flex items-center gap-2"><input type="checkbox" checked={d.enabled} disabled={m.isPending || c.force_enable} onChange={e => set(c, { enabled: e.target.checked })} />Aktif{c.force_enable ? ' · wajib Shopee' : ''}</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={d.cod} disabled={m.isPending} onChange={e => set(c, { cod: e.target.checked })} />COD</label>
      {eligible && <label className="flex items-center gap-2"><input type="checkbox" checked={d.driver} disabled={m.isPending} onChange={e => set(c, { driver: e.target.checked })} />Penjemputan otomatis</label>}
      {eligible && d.driver && <label className="flex items-center gap-2"><span>Persiapan (menit)</span><Input id={`driver-${c.logistics_channel_id}`} className="h-8 w-20" type="number" required min={c.auto_call_driver_setting?.preparation_time_limit?.min_preparation_time} max={c.auto_call_driver_setting?.preparation_time_limit?.max_preparation_time} value={d.minutes} disabled={m.isPending} onChange={e => set(c, { minutes: Number(e.target.value) })} /></label>}
    </li> })}</ul>}
    {m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}
    {!!list.length && <Button type="submit" disabled={!ubah.length || m.isPending}>{m.isPending ? 'Menyimpan…' : 'Simpan'}</Button>}
  </form>
}

const addressLabels: Record<api.AddressRole, string> = { DEFAULT_ADDRESS: 'Alamat utama', PICKUP_ADDRESS: 'Penjemputan', RETURN_ADDRESS: 'Pengembalian', INBOUND_PICKUP_ADDRESS: 'Penjemputan inbound' }
const peranAwal = (a: api.PickupAddress) => (a.address_type ?? []).map(v => v === 'PICK_UP_ADDRESS' ? 'PICKUP_ADDRESS' : v).filter((v): v is api.AddressRole => v in addressLabels)
const sama = (x: api.AddressRole[], y: api.AddressRole[]) => [...x].sort().join(',') === [...y].sort().join(',')

/** All pickup/return addresses with ONE save button; only changed addresses are sent. */
function Addresses({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['shop-settings', id, 'alamat'], queryFn: () => api.addresses(id), retry: false })
  const [draft, setDraft] = useState<Record<number, api.AddressRole[]>>({})
  const confirm = useConfirm()
  const selesai = useSave(id, 'alamat')
  const list = q.data?.address_list ?? []
  const ubah = list.filter(a => draft[a.address_id] && !sama(draft[a.address_id], peranAwal(a)))
  const m = useMutation({ retry: false, mutationFn: async () => {
    const warnings: string[] = []
    for (const a of ubah) { const r = await api.setAddress(id, a.address_id, draft[a.address_id]); warnings.push(...(r?.warnings ?? [])) }
    return { warnings }
  }, onSuccess: r => { setDraft({}); selesai(r) } })
  const kosong = ubah.some(a => !draft[a.address_id].length)
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: 'Ubah penggunaan alamat di Shopee?', description: ubah.map(a => [a.address, a.city].filter(Boolean).join(', ')).join(' · ') })) m.mutate() }}>
    {q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}
    {q.data && !list.length && <p className="text-sm text-muted-foreground">Belum ada alamat di Shopee.</p>}
    {!!list.length && <ul className="divide-y rounded-xl border">{list.map(a => { const roles = draft[a.address_id] ?? peranAwal(a); return <li key={a.address_id} className="space-y-1 px-3 py-2">
      <p className="break-words text-sm">{[a.address, a.district, a.city, a.state, a.zipcode].filter(Boolean).join(', ')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">{(Object.keys(addressLabels) as api.AddressRole[]).map(role => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roles.includes(role)} disabled={m.isPending} onChange={e => setDraft(v => ({ ...v, [a.address_id]: e.target.checked ? [...roles, role] : roles.filter(r => r !== role) }))} />{addressLabels[role]}</label>)}</div>
    </li> })}</ul>}
    {m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}
    {!!list.length && <Button type="submit" disabled={!ubah.length || kosong || m.isPending}>{m.isPending ? 'Menyimpan…' : 'Simpan'}</Button>}
  </form>
}
