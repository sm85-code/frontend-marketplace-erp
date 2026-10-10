import { Minimize2, Maximize2 } from 'lucide-react'
import Spinner from '@/components/Spinner'
import { useAuth } from '@/lib/auth'
import { qk } from '@/api/keys'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api, { getApiError } from '@/api/client'
import * as endpoints from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Job = { id: string; status: string; selesai: number; tersisa: number; cakupan?: { jenis: string; ids: string[]; akun_id: string | null }; gagal: { unit: { akun_id: string; external?: string }; pesan: string }[] }
type Kind = 'pesanan' | 'katalog' | 'produk' | 'listing'

type Request = { jenis: Kind; ids?: string[]; akunId?: string; satu?: boolean }
const SyncContext = createContext<((request: Request) => void) | null>(null)
export function useSinkronisasi() {
  const value = useContext(SyncContext)
  if (!value) throw new Error('SinkronisasiProvider belum tersedia')
  return value
}
export function SinkronisasiSession({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <SinkronisasiProvider key={user.id}>{children}</SinkronisasiProvider> : children
}
function SinkronisasiProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null)
  const { jenis = 'pesanan', ids = [], akunId, satu = false } = request ?? {}
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState(ids.length ? 'pilihan' : akunId ? 'toko' : 'semua')
  const [shop, setShop] = useState(akunId ?? '')
  const [busy, setBusy] = useState(false)
  const cancelled = useRef(false)
  const [paused, setPaused] = useState(false)
  const mounted = useRef(true)
  const running = useRef(false)
  const recovery = useRef(false)
  const attempts = useRef(0)
  const resume = useRef<() => void>(() => {})
  const [recovering, setRecovering] = useState(false)
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && recovery.current && !cancelled.current) {
        attempts.current = 0
        resume.current()
      }
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine && recovery.current && !cancelled.current && attempts.current < 5) resume.current()
    }, 5000)
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
    window.addEventListener('focus', wake)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
      window.removeEventListener('focus', wake)
    }
  }, [])
  useEffect(() => { mounted.current = true; return () => { cancelled.current = true; mounted.current = false } }, [])
  const [error, setError] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const key = `erp.sync.${jenis}`
  const { data: shops = [] } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  async function run(retry = false, automatic = false) {
    if (running.current) return
    if (automatic && (!recovery.current || cancelled.current)) return
    if (automatic) attempts.current += 1
    else attempts.current = 0
    running.current = true
    cancelled.current = false
    setPaused(false)
    setBusy(true); setError('')
    try {
      let current = job
      const saved = localStorage.getItem(key)
      const existingId = current?.id ?? saved
      if (existingId) {
        try { current = (await api.get<Job>(`/sinkronisasi/${encodeURIComponent(existingId)}`)).data }
        catch (e) {
          if (!automatic && (e as { response?: { status?: number } }).response?.status === 404) { localStorage.removeItem(key); current = null }
          else throw e
        }
      }
      if (!automatic && (retry || current?.status === 'sebagian') && current) current = (await api.post<Job>(`/sinkronisasi/${current.id}/ulangi-gagal`)).data
      if (!current && !automatic) {
        current = (await api.post<Job>('/sinkronisasi', { jenis, ids: scope === 'pilihan' ? ids : [], akun_id: scope === 'toko' ? shop : undefined })).data
      }
      if (!current) return
      if (!mounted.current) return
      localStorage.setItem(key, current.id)
      setJob(current)
      while (current.tersisa > 0 && !cancelled.current) {
        current = (await api.post<Job>(`/sinkronisasi/${current.id}/lanjut`, undefined, { timeout: 60_000 })).data
        if (!mounted.current) return
        setJob(current)
        attempts.current = 0
      }
      recovery.current = false; setRecovering(false)
      if (current.tersisa === 0 && !current.gagal.length) localStorage.removeItem(key)
      for (const queryKey of [['pesanan'], ['katalog'], ['produk'], ['listing']]) await qc.invalidateQueries({ queryKey })
    } catch (e) {
      if (!mounted.current) return
      const failure = e as { code?: string; response?: { status?: number } }
      recovery.current = !cancelled.current && !!localStorage.getItem(key) && (failure.code === 'ERR_NETWORK' || failure.code === 'ECONNABORTED' || failure.code === 'ETIMEDOUT' || [502, 503, 504].includes(failure.response?.status ?? 0))
      setRecovering(recovery.current)
      setError(getApiError(e))
    }
    finally { running.current = false; if (mounted.current) setBusy(false) }
  }
  resume.current = () => { void run(false, true) }
  function show(next: Request) {
    if (!busy && !job?.tersisa) {
      setRequest(next)
      setScope(next.ids?.length ? 'pilihan' : next.akunId ? 'toko' : 'semua')
      setShop(next.akunId ?? '')
      setJob(null); setError(''); setPaused(false)
    }
    setOpen(true)
  }
  const total = (job?.selesai ?? 0) + (job?.tersisa ?? 0)
  const percent = total ? Math.round((job!.selesai / total) * 100) : 0
  return <SyncContext.Provider value={show}>
    {children}
    {request && !open && (job || busy || error) && <div className="fixed right-3 bottom-24 z-40 w-[min(320px,calc(100vw-1.5rem))] rounded-xl border bg-card p-3 shadow-lg lg:right-6 lg:bottom-6" aria-label="Progres sinkronisasi">
      <button className="flex w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setOpen(true)} aria-label="Buka progres sinkronisasi">
        {busy && <Spinner size={22} label={null} />}
        <span className="min-w-0 flex-1 text-sm"><span className="block font-semibold">Sinkronisasi {jenis}</span><span role="status" className="text-xs text-muted-foreground">{recovering && error ? 'Menunggu koneksi · lanjut otomatis' : error ? 'Perlu dilanjutkan' : busy ? `${job?.selesai ?? 0} selesai · ${job?.tersisa ?? 0} tersisa` : paused ? 'Dijeda' : job?.gagal.length ? 'Selesai dengan kegagalan' : 'Selesai'}</span></span>
        <Maximize2 className="size-4 shrink-0" />
      </button>
      {total > 0 && <progress aria-label="Kemajuan sinkronisasi" className="mt-2 h-2 w-full accent-primary" value={percent} max={100} />}
      {!busy && <div className="mt-1 flex gap-2"><Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Lihat hasil</Button>{!job?.tersisa && <Button size="sm" variant="ghost" onClick={() => setRequest(null)}>Sembunyikan</Button>}</div>}
    </div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Sinkronisasi {jenis === 'pesanan' ? 'Pesanan' : 'Produk'}</DialogTitle></DialogHeader><Button size="sm" variant="outline" className="justify-self-start" onClick={() => setOpen(false)}><Minimize2 className="size-4" />Minimize</Button>
      <p className="text-sm text-muted-foreground">Membaca data terbaru dari marketplace. Harga dan stok master ERP tidak ditimpa. Pesanan seluruh toko membaca perubahan 15 hari terakhir.</p>
      <label className="space-y-1">Cakupan<select aria-label="Cakupan sinkronisasi" className="w-full rounded-md border p-2" value={scope} onChange={e => setScope(e.target.value)} disabled={busy || !!job?.tersisa}>
        {!!ids.length && <option value="pilihan">{satu ? 'Item ini' : `${ids.length} item terpilih`}</option>}
        {!satu && <><option value="toko">Satu toko</option><option value="semua">Seluruh toko yang diizinkan</option></>}
      </select></label>
      {scope === 'toko' && <select aria-label="Toko sinkronisasi" className="w-full rounded-md border p-2" value={shop} onChange={e => setShop(e.target.value)} disabled={busy}><option value="">Pilih toko</option>{shops.filter(a => a.platform === 'shopee' && a.id_toko_eksternal).map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select>}
      {job?.cakupan && <p className="text-sm">Antrean: {job.cakupan.ids.length ? `${job.cakupan.ids.length} item pilihan` : job.cakupan.akun_id ? shops.find(a => a.id === job.cakupan!.akun_id)?.nama_toko : 'Seluruh toko'}</p>}
      {paused && <p role="status">Dijeda setelah langkah saat ini. Klik Lanjutkan untuk meneruskan antrean tersimpan.</p>}
      {job && total > 0 && <progress aria-label="Kemajuan sinkronisasi" className="h-2 w-full accent-primary" value={percent} max={100} />}
      {job && <div role="status">{job.selesai} langkah selesai · {job.tersisa} tersisa · {job.gagal.length} gagal{job.status === 'sebagian' && <p>Selesai sebagian; periksa item yang gagal.</p>}{job.status === 'selesai' && <p>Sinkronisasi selesai.</p>}</div>}
      {!!job?.gagal.length && <ul className="max-h-40 overflow-auto text-sm text-destructive">{job.gagal.map((g, i) => <li key={i}>{shops.find(a => a.id === g.unit.akun_id)?.nama_toko ?? 'Toko'} {g.unit.external ?? ''}: {g.pesan}</li>)}</ul>}
      {error && <p role="alert" className="text-sm text-destructive">{recovering ? 'Koneksi terputus. Antrean tersimpan; sinkronisasi akan dilanjutkan otomatis saat kembali ke ERP atau koneksi pulih.' : `${error} Antrean tersimpan; lanjutkan tanpa mengulang yang selesai.`}</p>}
      <Button disabled={busy || (scope === 'toko' && !shop)} onClick={() => run()}>{busy ? 'Menyinkronkan…' : job?.status === 'sebagian' ? 'Ulangi yang gagal' : job?.tersisa || localStorage.getItem(key) ? 'Lanjutkan sinkronisasi' : 'Mulai sinkronisasi'}</Button>
      {busy && <Button variant="outline" onClick={() => { cancelled.current = true; setPaused(true) }}>Jeda sinkronisasi</Button>}
    </DialogContent></Dialog>
  </SyncContext.Provider>
}
