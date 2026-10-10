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
  const [tab, setTab] = useState('profil')
  return <Dialog open onOpenChange={v => { if (!v) close() }}><DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Pengaturan Shopee · {name}</DialogTitle></DialogHeader><Tabs value={tab} onValueChange={setTab}><TabsList className="section-tabs"><TabsTrigger value="profil">Profil</TabsTrigger><TabsTrigger value="libur">Libur</TabsTrigger><TabsTrigger value="jasa-kirim">Jasa Kirim</TabsTrigger><TabsTrigger value="alamat">Alamat</TabsTrigger></TabsList><TabsContent value="profil"><Profile id={id} /></TabsContent><TabsContent value="libur"><Holiday id={id} /></TabsContent><TabsContent value="jasa-kirim"><Channels id={id} /></TabsContent><TabsContent value="alamat"><Addresses id={id} /></TabsContent></Tabs></DialogContent></Dialog>
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
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: enabled ? 'Aktifkan libur toko?' : 'Nonaktifkan libur toko?', description: enabled && type === 0 ? 'Pembeli tidak dapat membuat pesanan baru selama toko libur.' : enabled ? 'Pembeli tetap dapat memesan; Shopee menyesuaikan batas waktu pengiriman.' : 'Toko kembali menerima pesanan sesuai pengaturan Shopee.' })) m.mutate() }}><label className="flex items-center gap-2"><input type="checkbox" checked={enabled} disabled={m.isPending} onChange={e => setEnabled(e.target.checked)} />Mode libur</label>{enabled && <><select aria-label="Jenis libur" className={field} value={type} disabled={m.isPending} onChange={e => setType(Number(e.target.value) as 0 | 1)}><option value={0}>Libur penuh · tidak menerima pesanan</option><option value={1}>Libur sebagian · tetap menerima pesanan</option></select>{type === 0 && <label className="flex items-center gap-2"><input type="checkbox" checked={scheduled} disabled={m.isPending} onChange={e => setScheduled(e.target.checked)} />Jadwalkan libur</label>}{(scheduled || type === 1) && <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="holiday-start">Mulai (WIB)</Label><Input id="holiday-start" required type="datetime-local" step={3600} disabled={m.isPending} value={start} onChange={e => setStart(e.target.value)} /></div><div><Label htmlFor="holiday-end">Berakhir pada (WIB)</Label><Input id="holiday-end" required type="datetime-local" step={3600} disabled={m.isPending} value={end} onChange={e => setEnd(e.target.value)} /></div></div>}<Label htmlFor="holiday-description">Keterangan libur</Label><Input id="holiday-description" maxLength={500} disabled={m.isPending} value={description} onChange={e => setDescription(e.target.value)} /></>}{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}<Button type="submit" disabled={m.isPending}>Simpan ke Shopee</Button></form>
}

function Channels({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['shop-settings', id, 'jasa-kirim'], queryFn: () => api.channels(id), retry: false })
  return <div className="space-y-3">{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data?.logistics_channel_list.map(c => <ChannelForm key={JSON.stringify(c)} id={id} initial={c} />)}</div>
}
function ChannelForm({ id, initial: c }: { id: string; initial: api.Channel }) {
  const [enabled, setEnabled] = useState(c.enabled)
  const [cod, setCod] = useState(c.cod_enabled)
  const [driver, setDriver] = useState(c.auto_call_driver_setting?.auto_call_driver_enabled ?? false)
  const [minutes, setMinutes] = useState(c.auto_call_driver_setting?.preparation_time ?? 0)
  const confirm = useConfirm()
  const m = useMutation({ retry: false, mutationFn: () => {
    const body: api.ChannelEdit = {}
    if (enabled !== c.enabled) body.enabled = enabled
    if (cod !== c.cod_enabled) body.cod_enabled = cod
    if (driver !== !!c.auto_call_driver_setting?.auto_call_driver_enabled || (driver && minutes !== c.auto_call_driver_setting?.preparation_time)) body.auto_call_driver_setting = { auto_call_driver_enabled: driver, ...(driver ? { preparation_time: minutes } : {}) }
    return api.editChannel(id, c.logistics_channel_id, body)
  }, onSuccess: useSave(id, 'jasa-kirim') })
  const changed = enabled !== c.enabled || cod !== c.cod_enabled || driver !== !!c.auto_call_driver_setting?.auto_call_driver_enabled || (driver && minutes !== c.auto_call_driver_setting?.preparation_time)
  return <form className="space-y-3 rounded-xl border p-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: 'Ubah jasa kirim di Shopee?', description: c.logistics_channel_name })) m.mutate() }}><h3 className="font-medium">{c.logistics_channel_name}</h3><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={enabled} disabled={m.isPending || c.force_enable} onChange={e => setEnabled(e.target.checked)} />Aktif{c.force_enable ? ' · wajib Shopee' : ''}</label><label className="flex items-center gap-2"><input type="checkbox" checked={cod} disabled={m.isPending} onChange={e => setCod(e.target.checked)} />COD</label>{c.auto_call_driver_setting?.auto_call_driver_eligible && <label className="flex items-center gap-2"><input type="checkbox" checked={driver} disabled={m.isPending} onChange={e => setDriver(e.target.checked)} />Penjemputan otomatis</label>}</div>{driver && c.auto_call_driver_setting?.auto_call_driver_eligible && <div><Label htmlFor={`driver-${c.logistics_channel_id}`}>Persiapan (menit)</Label><Input id={`driver-${c.logistics_channel_id}`} type="number" required min={c.auto_call_driver_setting.preparation_time_limit?.min_preparation_time} max={c.auto_call_driver_setting.preparation_time_limit?.max_preparation_time} value={minutes} disabled={m.isPending} onChange={e => setMinutes(Number(e.target.value))} /></div>}{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}<Button type="submit" size="sm" disabled={!changed || m.isPending}>Simpan</Button></form>
}

function Addresses({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['shop-settings', id, 'alamat'], queryFn: () => api.addresses(id), retry: false })
  return <div className="space-y-3">{q.isPending && <Spinner column />}{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.data?.address_list.map(a => <AddressForm key={JSON.stringify(a)} id={id} address={a} />)}{q.data && !q.data.address_list.length && <p className="text-sm text-muted-foreground">Belum ada alamat di Shopee.</p>}</div>
}

const addressLabels: Record<api.AddressRole, string> = { DEFAULT_ADDRESS: 'Alamat utama', PICKUP_ADDRESS: 'Penjemputan', RETURN_ADDRESS: 'Pengembalian', INBOUND_PICKUP_ADDRESS: 'Penjemputan inbound' }
function AddressForm({ id, address: a }: { id: string; address: api.PickupAddress }) {
  const initial = (a.address_type ?? []).map(v => v === 'PICK_UP_ADDRESS' ? 'PICKUP_ADDRESS' : v).filter((v): v is api.AddressRole => v in addressLabels)
  const [roles, setRoles] = useState<api.AddressRole[]>(initial)
  const confirm = useConfirm()
  const m = useMutation({ retry: false, mutationFn: () => api.setAddress(id, a.address_id, roles), onSuccess: useSave(id, 'alamat') })
  const changed = [...roles].sort().join(',') !== [...initial].sort().join(',')
  return <form className="space-y-3 rounded-xl border p-3" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: 'Ubah penggunaan alamat di Shopee?', description: [a.address, a.city].filter(Boolean).join(', ') })) m.mutate() }}><p className="break-words">{[a.address, a.district, a.city, a.state, a.zipcode].filter(Boolean).join(', ')}</p><div className="grid gap-2 sm:grid-cols-2">{(Object.keys(addressLabels) as api.AddressRole[]).map(role => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roles.includes(role)} disabled={m.isPending} onChange={e => setRoles(v => e.target.checked ? [...v, role] : v.filter(r => r !== role))} />{addressLabels[role]}</label>)}</div>{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}<Button type="submit" size="sm" disabled={m.isPending || !changed || !roles.length}>Simpan penggunaan alamat</Button></form>
}
