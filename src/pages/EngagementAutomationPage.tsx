import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/engagementAutomation'
import * as endpoints from '@/api/endpoints'
import { fmtDateTime, getApiError } from '@/api/client'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Input } from '@/components/ui/input'

export default function EngagementAutomationPage() {
  const [params, setParams] = useSearchParams()
  const shopId = params.get('toko') || ''
  const tab = params.get('tab') === 'boost' ? 'boost' : 'rating'
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => endpoints.listAkun() })
  const query = useQuery({ queryKey: ['engagement-automation', shopId], queryFn: () => api.settings(shopId), enabled: !!shopId, refetchInterval: 30000, retry: false })
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Otomasi produk Shopee</h1>
    <label className="block">Toko<select aria-label="Toko otomasi" className="ml-2 max-w-full rounded-lg border bg-background p-2" value={shopId} onChange={e => setParams({ toko: e.target.value, tab })}><option value="">Pilih toko</option>{shops.data?.filter(s => s.platform === 'shopee').map(s => <option key={s.id} value={s.id}>{s.nama_toko}</option>)}</select></label>
    {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
    <div className="flex flex-wrap gap-2"><Button variant={tab === 'rating' ? 'default' : 'outline'} onClick={() => setParams({ toko: shopId, tab: 'rating' })}>Balasan rating otomatis</Button><Button variant={tab === 'boost' ? 'default' : 'outline'} onClick={() => setParams({ toko: shopId, tab: 'boost' })}>Boost otomatis</Button></div>
    {shopId && query.isPending && <Spinner column label="Memuat pengaturan toko…" />}{query.error && <QueryError error={query.error} retry={query.refetch} />}
    {query.data && <Settings key={shopId} shopId={shopId} initial={query.data} tab={tab} />}
  </div>
}

function Settings({ shopId, initial, tab }: { shopId: string; initial: api.AutomationSettings; tab: 'rating' | 'boost' }) {
  const [form, setForm] = useState<api.AutomationForm>(() => ({ replies_enabled: initial.replies_enabled, high_template: initial.high_template, low_template: initial.low_template, boost_enabled: initial.boost_enabled, boost_catalog_ids: initial.boost_catalog_ids, boost_interval_minutes: initial.boost_interval_minutes }))
  const [q, setQ] = useState(''), [page, setPage] = useState(1)
  const products = useQuery({ queryKey: ['automation-products', shopId, q, page], queryFn: () => endpoints.listKatalog({ akun_id: shopId, status: 'NORMAL', q, halaman: page, per_halaman: 50 }), enabled: tab === 'boost', retry: false })
  const selected = useQueries({ queries: form.boost_catalog_ids.map(id => ({ queryKey: ['automation-selected-product', id], queryFn: () => endpoints.getKatalog(id), enabled: tab === 'boost', retry: false })) })
  const qc = useQueryClient(), confirm = useConfirm()
  const save = useMutation({ retry: false, mutationFn: () => api.save(shopId, form), onSuccess: () => { toast.success('Pengaturan otomatis disimpan'); void qc.invalidateQueries({ queryKey: ['engagement-automation', shopId] }) } })
  const review = useMutation({ retry: false, mutationFn: (key: string) => api.reviewed(shopId, key), onSuccess: () => void qc.invalidateQueries({ queryKey: ['engagement-automation', shopId] }) })
  async function submit() {
    if (form.replies_enabled || form.boost_enabled) {
      if (!await confirm({ title: 'Izinkan tindakan otomatis untuk toko ini?', description: `${initial.nama_toko}: ${form.replies_enabled ? 'rating baru akan dibalas dengan template tersimpan. ' : ''}${form.boost_enabled ? `${form.boost_catalog_ids.length} produk pilihan akan diminta boost berulang, minimal setiap ${form.boost_interval_minutes / 60} jam dan sesuai cooldown Shopee. ` : ''}Tindakan berjalan tanpa token AI dan tanpa konfirmasi per rating/boost. Anda dapat mematikannya di halaman ini.` })) return
    }
    save.mutate()
  }
  return <div className="space-y-4">
    {!initial.worker_enabled && <p role="status" className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Shopee live sync belum aktif. Pengaturan bisa disimpan dalam keadaan nonaktif.</p>}
    <section className="space-y-4 rounded-xl border p-4">
      {tab === 'rating' ? <><h2 className="font-semibold">Template balasan rating · {initial.nama_toko}</h2><label className="flex gap-2"><input type="checkbox" checked={form.replies_enabled} onChange={e => setForm(f => ({ ...f, replies_enabled: e.target.checked }))} />Aktifkan balasan otomatis</label>
        <label className="block">Balasan rating 4–5<textarea className="mt-1 min-h-28 w-full rounded-lg border bg-background p-2" maxLength={5000} value={form.high_template} onChange={e => setForm(f => ({ ...f, high_template: e.target.value }))} placeholder="Terima kasih atas penilaiannya. Semoga produknya bermanfaat!" /></label>
        <label className="block">Balasan rating 1–3<textarea className="mt-1 min-h-28 w-full rounded-lg border bg-background p-2" maxLength={5000} value={form.low_template} onChange={e => setForm(f => ({ ...f, low_template: e.target.value }))} placeholder="Terima kasih atas masukannya. Mohon hubungi kami melalui chat agar kendalanya bisa kami bantu." /></label>
        <p className="text-sm text-muted-foreground">Template dikirim persis seperti yang disimpan, tanpa token AI. Berlaku untuk rating baru sejak diaktifkan; ulasan lama dan yang sudah dibalas dilewati. Pemeriksaan berjalan sekitar setiap 5 menit saat layanan ERP aktif. Shopee membatasi pembacaan hingga 500 ulasan terbaru.</p>
        {initial.replies_enabled_at && <p className="text-xs text-muted-foreground">Aktif sejak {fmtDateTime(initial.replies_enabled_at)}</p>}
      </> : <><h2 className="font-semibold">Produk untuk boost otomatis · {initial.nama_toko}</h2><label className="flex gap-2"><input type="checkbox" checked={form.boost_enabled} onChange={e => setForm(f => ({ ...f, boost_enabled: e.target.checked }))} />Aktifkan boost otomatis</label>
        <label className="block">Jarak antarpermintaan (jam)<Input type="number" min={4} max={168} step={1} value={form.boost_interval_minutes / 60} onChange={e => setForm(f => ({ ...f, boost_interval_minutes: Math.round(Number(e.target.value) * 60) }))} /></label>
        <p className="text-sm text-muted-foreground">Pilih maksimal 5 produk aktif dari toko ini. Produk yang masih cooldown dilewati. Hasil yang belum pasti akan menghentikan boost sampai diperiksa; tidak dikirim ulang otomatis.</p>
        <Input aria-label="Cari produk boost" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Cari nama atau SKU produk…" />
        {products.isPending && <Spinner column label="Memuat produk…" />}{products.error && <QueryError error={products.error} retry={products.refetch} />}
        <p className="text-sm font-medium">Dipilih: {form.boost_catalog_ids.length}/5</p>
        <ul className="space-y-2">{form.boost_catalog_ids.map((id, index) => <li key={id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm"><span>{selected[index]?.data?.akun_id === shopId ? selected[index].data?.nama : id}</span><Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, boost_catalog_ids: f.boost_catalog_ids.filter(value => value !== id) }))}>Hapus pilihan</Button></li>)}</ul>
        <div className="max-h-96 space-y-2 overflow-auto">{products.data?.items.map(p => <label key={p.id} className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" className="mt-1" checked={form.boost_catalog_ids.includes(p.id)} disabled={!form.boost_catalog_ids.includes(p.id) && form.boost_catalog_ids.length >= 5} onChange={e => setForm(f => ({ ...f, boost_catalog_ids: e.target.checked ? [...f.boost_catalog_ids, p.id] : f.boost_catalog_ids.filter(id => id !== p.id) }))} /><span>{p.nama}<small className="block text-muted-foreground">{p.sku || 'Tanpa SKU'} · ID Shopee {p.item_id}</small></span></label>)}</div>
        {products.data && !products.data.items.length && <p className="text-sm">Tidak ada produk yang cocok. Sinkronkan produk dari halaman Kelola Toko bila katalog belum tersedia.</p>}
        <div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || products.isFetching} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button><Button variant="outline" disabled={!products.data || page * products.data.per_halaman >= products.data.total || products.isFetching} onClick={() => setPage(p => p + 1)}>Berikutnya</Button><Button variant="ghost" onClick={() => setForm(f => ({ ...f, boost_catalog_ids: [] }))}>Kosongkan pilihan</Button></div>
        {initial.next_boost_at && <p className="text-xs text-muted-foreground">Jadwal berikutnya: {fmtDateTime(initial.next_boost_at)}</p>}
      </>}
      {save.error && <p role="alert" className="text-sm text-destructive">{getApiError(save.error)}</p>}
      <Button disabled={save.isPending || form.replies_enabled && (!form.high_template.trim() || !form.low_template.trim()) || form.boost_enabled && !form.boost_catalog_ids.length} onClick={() => void submit()}>{save.isPending ? 'Menyimpan…' : 'Simpan pengaturan toko'}</Button>
    </section>
    <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Hasil otomatis</h2><p className="text-xs text-muted-foreground">Pemeriksaan terakhir: {initial.last_scan_at ? fmtDateTime(initial.last_scan_at) : 'Belum berjalan'}</p><p className="break-words text-sm">{initial.last_message}</p>
      {review.error && <p role="alert" className="text-destructive">{getApiError(review.error)}</p>}
      {initial.attempts.filter(a => a.kind === (tab === 'rating' ? 'reply' : 'boost')).map(a => <details key={a.key} className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">{a.status === 'succeeded' ? 'Berhasil' : a.status === 'unknown' ? 'Belum pasti — perlu diperiksa' : a.status === 'reviewed' ? 'Sudah diperiksa' : a.status === 'running' ? 'Sedang diproses' : 'Tidak berhasil'} · {a.kind === 'reply' ? `Ulasan ${a.target}` : 'Boost produk'} · {fmtDateTime(a.created_at)}</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(a.result, null, 2)}</pre><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(JSON.stringify(a, null, 2)).then(() => toast.success('Catatan disalin'), () => toast.error('Salin rincian di atas secara manual')) }}>Salin catatan</Button>{a.status === 'unknown' && <Button variant="outline" size="sm" className="ml-2" disabled={review.isPending} onClick={async () => { if (await confirm({ title: 'Sudah memeriksa Seller Centre?', description: 'Tandai hanya setelah memastikan hasilnya. Percobaan ini tidak dikirim ulang; boost dapat dilanjutkan pada jadwal berikutnya.' })) review.mutate(a.key) }}>Sudah diperiksa</Button>}</details>)}
    </section>
  </div>
}
