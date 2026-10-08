import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { qk } from '@/api/keys'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { fmtDateTime, getApiError } from '@/api/client'
import * as endpoints from '@/api/endpoints'
import QueryError from '@/components/QueryError'
import { BarHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Conversation = { conversation_id: string; to_name: string; to_id: number; unread_count: number; latest_message_content: unknown; last_message_timestamp: number }
type Message = { context?: { order_id?: string | null; katalog_id?: string | null }; message_id: string; conversation_id: string; from_shop_id?: number; content: unknown; message_type: string; created_timestamp: number }
type Inbox = { conversations: Conversation[]; page_result: { more?: boolean; next_cursor?: { next_message_time_nano?: string } } }
type History = { conversation: Conversation; messages: Message[]; page_result: { next_offset?: string } }
type Delivery = { status: 'terkirim' | 'gagal' | 'belum_pasti'; error?: string; message?: Message }
function content(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'text' in value) return String(value.text ?? '')
  return 'Pesan nonteks — buka aplikasi Shopee untuk melihat konten lengkap.'
}
function time(value: number) {
  if (!Number.isFinite(value) || !value) return '—'
  const date = new Date(value > 1e15 ? value / 1e6 : value > 1e12 ? value : value * 1000)
  return Number.isFinite(date.getTime()) ? fmtDateTime(date.toISOString()) : '—'
}

export default function ChatPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [shop, setShop] = useState('')
  const [threadShop, setThreadShop] = useState('')
  const [unread, setUnread] = useState(false)
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState('')
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [older, setOlder] = useState<Message[]>([])
  const [offset, setOffset] = useState('')
  const [text, setText] = useState('')
  const [readError, setReadError] = useState('')
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const { data: shops = [] } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const available = shops.filter(a => a.platform === 'shopee' && a.id_toko_eksternal)
  const targets = shop ? available.filter(a => a.id === shop) : available
  const inbox = useQuery({ queryKey: ['chat', 'inbox', shop, unread, cursor, targets.map(a => a.id).join(',')], queryFn: async () => {
    return Promise.all(targets.map(async a => {
      try { return { shop: a, data: (await api.get<Inbox>(`/akun/${a.id}/chat`, { params: { unread, cursor: cursor || undefined } })).data, error: '' } }
      catch (e) { return { shop: a, data: null, error: getApiError(e) } }
    }))
  }, enabled: available.length > 0, refetchInterval: cursor ? false : 60_000, retry: false })
  const active = shops.find(a => a.id === threadShop)
  const path = selected ? `/akun/${threadShop}/chat/${encodeURIComponent(selected.conversation_id)}/pesan` : ''
  const history = useQuery({ queryKey: ['chat', 'messages', threadShop, selected?.conversation_id, offset], queryFn: async () => (await api.get<History>(path, { params: { offset: offset || undefined } })).data,
    enabled: !!selected && !!threadShop, refetchInterval: offset ? false : 30_000, retry: false })
  const markRead = useMutation({ mutationFn: async () => {
    const latest = [...(history.data?.messages ?? [])].sort((a, b) => b.created_timestamp - a.created_timestamp)[0]
    if (!latest) throw new Error('Segarkan percakapan terlebih dahulu.')
    await api.post(`/akun/${threadShop}/chat/${encodeURIComponent(selected!.conversation_id)}/dibaca`, { message_id: latest.message_id })
  }, onSuccess: () => { setReadError(''); qc.invalidateQueries({ queryKey: ['chat', 'inbox'] }) }, onError: e => setReadError(getApiError(e)), retry: false })
  const storageKey = `erp.chat.pending.${threadShop}.${selected?.conversation_id ?? ''}`
  const pending = localStorage.getItem(storageKey)
  const send = useMutation({ mutationFn: async () => {
    const operation_id = localStorage.getItem(storageKey) ?? crypto.randomUUID()
    localStorage.setItem(storageKey, operation_id)
    return (await api.post<Delivery>(path, { operation_id, text })).data
  }, onSuccess: result => {
    setDelivery(result)
    if (result.status !== 'belum_pasti') localStorage.removeItem(storageKey)
    if (result.status === 'terkirim') { setText(''); setOffset(''); setOlder([]); qc.invalidateQueries({ queryKey: ['chat'] }) }
  }, onError: e => {
    const status = (e as { response?: { status?: number } }).response?.status
    if (status && [400, 401, 403, 404, 422].includes(status)) {
      localStorage.removeItem(storageKey)
      setDelivery({ status: 'gagal', error: getApiError(e) })
    } else setDelivery({ status: 'belum_pasti', error: `${getApiError(e)} Segarkan riwayat sebelum melanjutkan.` })
  }, retry: false })
  const rows = (inbox.data ?? []).flatMap(result => (result.data?.conversations ?? []).map(c => ({ ...c, shop: result.shop })))
    .filter(c => !search || (c.to_name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.last_message_timestamp - a.last_message_timestamp)
  const messages = [...new Map([...older, ...(history.data?.messages ?? [])].map(m => [m.message_id, m])).values()].sort((a, b) => a.created_timestamp - b.created_timestamp)
  function open(c: Conversation, akunId: string) {
    setThreadShop(akunId); setSelected(c); setOffset(''); setOlder([]); setText(''); setDelivery(null); setReadError(''); setCursor('')
  }
  return <div className="space-y-4">
    <BarHalaman judul="Chat" deskripsi="Baca dan balas percakapan pembeli dari toko yang diizinkan."><Button variant="outline" onClick={() => { setOffset(''); setOlder([]); qc.invalidateQueries({ queryKey: ['chat'] }) }}>Segarkan</Button></BarHalaman>
    <p className="rounded-xl border p-3 text-sm text-muted-foreground">Pilih percakapan, baca pesan, lalu ketik balasan. Kirim hanya atas tindakan Anda. Pesan nonteks ditandai; gunakan aplikasi Shopee untuk media. Bila hasil kirim belum pasti, periksa riwayat terlebih dahulu.</p>
    <div className="flex flex-wrap items-center gap-3"><select aria-label="Toko Chat" className="rounded-md border p-2" value={shop} onChange={e => { setShop(e.target.value); setSelected(null); setCursor('') }}><option value="">Seluruh toko</option>{available.map(a => <option key={a.id} value={a.id}>{a.nama_toko}</option>)}</select><label className="flex items-center gap-2"><input type="checkbox" checked={unread} onChange={e => { setUnread(e.target.checked); setCursor('') }} />Belum dibaca</label><Input aria-label="Cari pembeli" placeholder="Cari pembeli pada halaman ini" className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {!available.length && <p>Belum ada toko Shopee terhubung yang dapat Anda akses.</p>}
    {(inbox.data ?? []).filter(r => r.error).map(r => <p key={r.shop.id} role="alert" className="rounded-xl border border-destructive p-3 text-destructive">{r.shop.nama_toko}: {r.error}</p>)}
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
      <section className={`min-w-0 rounded-xl border p-3 ${selected ? 'hidden md:block' : ''}`} aria-label="Daftar percakapan">
        {inbox.isFetching && <p className="text-sm">Memuat percakapan…</p>}
        {rows.map(c => <button key={`${c.shop.id}:${c.conversation_id}`} className="mb-2 w-full rounded-lg border p-3 text-left hover:bg-muted" onClick={() => open(c, c.shop.id)}><div className="font-medium">{c.to_name || 'Pembeli'} {c.unread_count > 0 && <span className="text-primary">({c.unread_count} belum dibaca)</span>}</div><div className="text-xs text-muted-foreground">{c.shop.nama_toko} · {time(c.last_message_timestamp)}</div><p className="line-clamp-2 break-words text-sm">{content(c.latest_message_content)}</p></button>)}
        {!inbox.isFetching && !rows.length && <p>Tidak ada percakapan pada cakupan ini.</p>}
        {(inbox.data ?? []).filter(r => r.data?.page_result.more).map(r => <Button key={r.shop.id} variant="outline" onClick={() => { setShop(r.shop.id); setCursor(r.data?.page_result.next_cursor?.next_message_time_nano ?? '') }}>Berikutnya · {r.shop.nama_toko}</Button>)}
        {!!cursor && <Button variant="outline" onClick={() => setCursor('')}>Kembali ke terbaru</Button>}
      </section>
      <section className={`min-w-0 rounded-xl border p-3 ${!selected ? 'hidden md:block' : ''}`} aria-label="Percakapan">
        {!selected ? <p>Pilih percakapan untuk membaca dan membalas.</p> : <>
          <div className="mb-3 flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Kembali</Button><h2 className="font-medium">{selected.to_name} · {active?.nama_toko}</h2></div>
          <Button variant="outline" disabled={markRead.isPending || !history.data?.messages.length} onClick={() => markRead.mutate()}>Tandai sudah dibaca</Button>
          {readError && <p role="alert" className="text-sm text-destructive">{readError}</p>}
          {history.error && <QueryError error={history.error} retry={history.refetch} />}
          {history.isFetching && <p>Memuat pesan…</p>}
          {!!history.data?.page_result.next_offset && <Button variant="outline" onClick={() => { setOlder(messages); setOffset(history.data!.page_result.next_offset!) }}>Pesan lebih lama</Button>}
          <div className="my-3 max-h-[55dvh] space-y-3 overflow-y-auto" aria-live="polite">{messages.map(m => <div key={m.message_id} className={`max-w-[90%] rounded-xl p-3 ${String(m.from_shop_id) === active?.id_toko_eksternal ? 'ml-auto bg-muted' : 'border'}`}><p className="whitespace-pre-wrap break-words text-sm">{content(m.content)}</p><div className="mt-1 text-xs text-muted-foreground">{time(m.created_timestamp)}</div>
            {m.context?.order_id && <Link className="text-sm underline" to={`/pesanan/${encodeURIComponent(m.context.order_id)}`}>Buka pesanan terkait</Link>}
            {m.context?.katalog_id && user?.role !== 'staff' && <Link className="text-sm underline" to={`/katalog?detail=${encodeURIComponent(m.context.katalog_id)}`}>Buka produk terkait</Link>}</div>)}</div>
          {delivery && <p role="status" className={delivery.status === 'terkirim' ? 'text-sm' : 'text-sm text-destructive'}>{delivery.status === 'terkirim' ? 'Pesan terkirim.' : delivery.error || 'Hasil kirim belum pasti; periksa riwayat.'}</p>}
          {pending && !send.isPending && <div className="space-y-2 rounded-md border p-2 text-sm"><p>Pengiriman sebelumnya belum dipastikan. Periksa riwayat sebelum membuat balasan baru.</p><Button variant="outline" onClick={() => { localStorage.removeItem(storageKey); setDelivery(null); setText('') }}>Sudah memeriksa riwayat</Button></div>}
          <Textarea aria-label="Balasan Chat" placeholder="Tulis balasan…" maxLength={1000} value={text} onChange={e => setText(e.target.value)} disabled={send.isPending || !!pending} />
          <Button className="mt-2" onClick={() => send.mutate()} disabled={!text.trim() || send.isPending || !!pending || !history.data || !!history.error}>{send.isPending ? 'Mengirim…' : 'Kirim balasan'}</Button>
        </>}
      </section>
    </div>
  </div>
}
