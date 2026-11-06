import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { applyShops, bridgeLog, checkOrders, getBridge, previewShops, setAutomation, type ShopPlan } from '@/api/orderBridge'
import { getApiError } from '@/api/client'
import { useTokoPenjualan, kunciTokoPenjualan } from '@/api/tokoPenjualan'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QueryError from '@/components/QueryError'

export default function OrderBridgePanel() {
  const { bisa } = useAuth()
  const write = bisa('toko_penjualan', 'tulis')
  const qc = useQueryClient()
  const status = useQuery({ queryKey: ['order-bridge'], queryFn: getBridge, refetchInterval: 30_000 })
  const shops = useTokoPenjualan()
  const [plan, setPlan] = useState<ShopPlan | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<unknown>(null)
  const action = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['order-bridge'] }); void qc.invalidateQueries({ queryKey: kunciTokoPenjualan }) },
    onError: e => toast.error(getApiError(e)),
  })
  const busy = action.isPending
  const preview = () => action.mutate(async () => { setLinks({}); setPlan(await previewShops()) })
  const check = (retry: boolean) => action.mutate(async () => {
    const result = await checkOrders(retry)
    if (result.status === 'failed') toast.error(result.error || 'Sinkronisasi gagal')
    else toast.success(`Diimpor ${result.imported}, dilewati ${result.skipped}, gagal ${result.failed}`)
  })
  const d = status.data
  return <Card>
    <CardHeader><CardTitle>Order Bridge EasyBoss</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {status.error && <QueryError error={status.error} retry={status.refetch} />}
      {status.isLoading && <p role="status">Memuat status…</p>}
      {d && <>
        {!d.configured && <p role="status" className="rounded-md border p-3 text-sm">Integrasi nyata belum diverifikasi. Konfigurasi adapter EasyBoss diperlukan sebelum sinkronisasi dan otomatisasi dapat dijalankan.</p>}
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {Object.entries({ Koneksi: d.connection, Scheduler: d.scheduler, 'Sinkronisasi terakhir': d.last_sync ? new Date(d.last_sync).toLocaleString('id-ID') : 'Belum ada', Toko: d.shops, Diimpor: d.counts.imported || 0, Dilewati: d.counts.skipped || 0, Gagal: d.counts.failed || 0, 'Perlu diperiksa': d.counts.review || 0 }).map(([key, value]) => <div key={key} className="rounded-md border p-3"><dt className="text-muted-foreground">{key}</dt><dd className="break-words font-medium">{value}</dd></div>)}
        </dl>
        {write && <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !d.configured} onClick={preview}>Sinkronkan EasyBoss</Button>
          <Button variant="outline" disabled={busy || !d.configured} onClick={() => check(false)}>Periksa Pesanan Sekarang</Button>
          <Button variant="outline" disabled={busy || !d.configured} onClick={() => check(true)}>Coba Ulang Pesanan Gagal</Button>
          <Button variant="outline" disabled={busy || (!d.enabled && !d.configured)} onClick={() => action.mutate(() => setAutomation(!d.enabled))}>{d.enabled ? 'Jeda Otomatisasi' : 'Aktifkan Otomatisasi'}</Button>
        </div>}
        <h3 className="font-medium">Kesalahan / perubahan sumber</h3>
        <div className="space-y-2">{d.errors.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kesalahan.</p>}{d.errors.map(e => <article key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"><div className="min-w-0 flex-1 break-words">{e.platform} · {e.order_id}<p>{e.error} · percobaan {e.attempts}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={() => action.mutate(async () => setDetail(await bridgeLog(e.id)))}>Lihat Detail Log</Button></article>)}</div>
        <h3 className="font-medium">Riwayat sinkronisasi</h3>
        <div className="max-h-64 space-y-2 overflow-auto">{d.runs.map(r => <article key={r.id} className="rounded-md border p-3 text-sm"><p>{new Date(r.started_at).toLocaleString('id-ID')} · {r.kind} · {r.status}</p><p>Diimpor {r.imported} · Dilewati {r.skipped} · Gagal {r.failed}{r.error && ` · ${r.error}`}</p></article>)}</div>
      </>}
      <Dialog open={!!plan} onOpenChange={open => !open && setPlan(null)}><DialogContent className="max-h-[85dvh] overflow-auto"><DialogHeader><DialogTitle>Pratinjau sinkronisasi toko</DialogTitle><DialogDescription>Identitas eksternal dipakai untuk sinkronisasi berulang. Pilih toko manual lama hanya setelah memeriksa kecocokannya.</DialogDescription></DialogHeader>
        {plan?.items.map(item => { const key = `${item.shop.platform}:${item.shop.shop_id}`; return <div key={key} className="space-y-2 rounded border p-3 text-sm"><p>{item.shop.name} · {item.shop.platform} · {item.shop.shop_id}</p><p>{item.action === 'create' ? 'Buat toko internal' : item.action === 'update' ? 'Perbarui toko terhubung' : 'Perlu pemeriksaan'}</p>
          {item.action !== 'update' && <label className="block">Hubungkan toko manual (opsional)<select className="mt-1 w-full rounded border bg-background p-2" value={links[key] || ''} onChange={e => setLinks({ ...links, [key]: e.target.value })}><option value="">{item.action === 'review' ? 'Tunda — periksa toko' : 'Buat baru'}</option>{shops.data?.items.filter(t => t.jenis === 'internal' && t.platform === item.shop.platform && !t.easyboss_shop_id).map(t => <option value={t.id} key={t.id}>{t.nama} · {t.id}</option>)}</select></label>}
        </div> })}
        {!!plan?.manual_review.length && <p className="text-sm">{plan.manual_review.length} toko manual perlu diperiksa; tidak dihapus otomatis.</p>}
        <Button disabled={busy || !write} onClick={() => action.mutate(async () => { if (plan) await applyShops(plan.fingerprint, links); setPlan(null) })}>Terapkan sinkronisasi</Button>
      </DialogContent></Dialog>
      <Dialog open={detail !== null} onOpenChange={open => !open && setDetail(null)}><DialogContent className="max-h-[85dvh] overflow-auto"><DialogHeader><DialogTitle>Detail Log</DialogTitle><DialogDescription>Snapshot sumber yang diizinkan untuk audit impor.</DialogDescription></DialogHeader><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(detail, null, 2)}</pre></DialogContent></Dialog>
    </CardContent>
  </Card>
}
