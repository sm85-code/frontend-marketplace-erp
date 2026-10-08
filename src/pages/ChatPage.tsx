import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { qk } from '@/api/keys'
import { useState } from 'react'
import { chatNeedsReply, chatTimestamp, chatPreview, type ChatCard, type ChatContext, type ChatAttachment } from '@/lib/chat'
import MessageContent from './chat/MessageContent'
import AttachmentPicker, { ChatCardView } from './chat/AttachmentPicker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { fmtDateTime, getApiError } from '@/api/client'
import * as endpoints from '@/api/endpoints'
import QueryError from '@/components/QueryError'
import { BarHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Conversation = {
  conversation_id: string
  latest_message_id?: string
  kota?: string | null
  to_name: string
  to_id: number
  unread_count: number
  needs_reply?: boolean | null
  latest_message_from_id?: number | string
  latest_message_type?: string
  latest_message_content: unknown
  last_message_timestamp: number
}
type Message = {
  context?: { order_id?: string | null; katalog_id?: string | null; order?: ChatCard | null; product?: ChatCard | null }
  message_id: string
  conversation_id: string
  from_shop_id?: number
  content: unknown
  source_content?: unknown
  message_type: string
  created_timestamp: number
}
type Inbox = {
  conversations: Conversation[]
  page_result: { more?: boolean; next_cursor?: { next_message_time_nano?: string } }
}
type History = { conversation: Conversation; messages: Message[]; page_result: { next_offset?: string } }
type Delivery = { status: 'terkirim' | 'gagal' | 'belum_pasti'; error?: string; message?: Message }
function time(value: number | string) {
  if (!chatTimestamp(value)) return '—'
  const date = new Date(chatTimestamp(value))
  return Number.isFinite(date.getTime()) ? fmtDateTime(date.toISOString()) : '—'
}

export default function ChatPage() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const orderId = params.get('pesanan') ?? ''
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [productOffset, setProductOffset] = useState(0)
  const { user } = useAuth()
  const [shopOverride, setShop] = useState('')
  const [threadShopOverride, setThreadShop] = useState('')
  const [unread, setUnread] = useState(false)
  const [unreplied, setUnreplied] = useState(false)
  const [syncedAt, setSyncedAt] = useState('')
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState('')
  const [selectedOverride, setSelected] = useState<Conversation | null>(null)
  const [older, setOlder] = useState<Message[]>([])
  const [offset, setOffset] = useState('')
  const [text, setText] = useState('')
  const [readError, setReadError] = useState('')
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const { data: shops = [] } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const orderStart = useQuery({
    queryKey: ['chat', 'order-start', orderId],
    queryFn: async () =>
      (
        await api.get<{ akun_id: string; conversation: Conversation; context: ChatContext; order: ChatCard }>(
          `/pesanan/${encodeURIComponent(orderId)}/chat`,
        )
      ).data,
    enabled: !!orderId,
    refetchOnWindowFocus: false,
    retry: false,
  })
  // The order route supplies the initial selection without resetting a user's draft on query refresh.
  const shop = shopOverride || (orderId ? (orderStart.data?.akun_id ?? '') : '')
  const threadShop = threadShopOverride || (orderId ? (orderStart.data?.akun_id ?? '') : '')
  const selected = selectedOverride ?? (orderId ? (orderStart.data?.conversation ?? null) : null)
  const available = shops.filter((a) => a.platform === 'shopee' && a.id_toko_eksternal)
  const targets = shop ? available.filter((a) => a.id === shop) : available
  const inbox = useQuery({
    queryKey: ['chat', 'inbox', shop, unread, cursor, targets.map((a) => a.id).join(',')],
    queryFn: async () => {
      return Promise.all(
        targets.map(async (a) => {
          try {
            return {
              shop: a,
              data: (await api.get<Inbox>(`/akun/${a.id}/chat`, { params: { unread, cursor: cursor || undefined } })).data,
              error: '',
            }
          } catch (e) {
            return { shop: a, data: null, error: getApiError(e) }
          }
        }),
      )
    },
    enabled: available.length > 0,
    refetchInterval: cursor ? false : 60_000,
    retry: false,
  })
  const newConversation = !!orderId && selected?.conversation_id === ''
  const active = shops.find((a) => a.id === threadShop)
  const path = selected ? `/akun/${threadShop}/chat/${encodeURIComponent(selected.conversation_id)}/pesan` : ''
  const history = useQuery({
    queryKey: ['chat', 'messages', threadShop, selected?.conversation_id, offset],
    queryFn: async () => (await api.get<History>(path, { params: { offset: offset || undefined } })).data,
    enabled: !!selected?.conversation_id && !!threadShop,
    refetchInterval: offset ? false : 30_000,
    retry: false,
  })
  const contextPath = newConversation
    ? `/pesanan/${encodeURIComponent(orderId)}/chat`
    : selected
      ? `/akun/${threadShop}/chat/${encodeURIComponent(selected.conversation_id)}/konteks`
      : ''
  const context = useQuery({
    queryKey: ['chat', 'context', contextPath, productSearch, productOffset],
    queryFn: async () => {
      const data = (
        await api.get<ChatContext | { context: ChatContext }>(contextPath, { params: { q: productSearch, offset: productOffset } })
      ).data
      return 'context' in data ? data.context : data
    },
    enabled: !!selected && !!contextPath,
    retry: false,
  })
  const city = context.data?.kota ?? selected?.kota
  const markRead = useMutation({
    mutationFn: async () => {
      const latestId = history.data?.conversation.latest_message_id ?? selected?.latest_message_id
      await api.post(
        `/akun/${threadShop}/chat/${encodeURIComponent(selected!.conversation_id)}/dibaca`,
        latestId ? { message_id: String(latestId) } : {},
      )
    },
    onSuccess: () => {
      setReadError('')
      setSelected((current) => (current ? { ...current, unread_count: 0 } : current))
      qc.invalidateQueries({ queryKey: ['chat', 'inbox'] })
    },
    onError: (e) => setReadError(getApiError(e)),
    retry: false,
  })
  const storageKey = `erp.chat.pending.${threadShop}.${newConversation ? 'order:' + orderId : (selected?.conversation_id ?? '')}`
  const pending = localStorage.getItem(storageKey)
  const send = useMutation({
    mutationFn: async (request: {
      key: string
      path: string
      newConversation: boolean
      text: string
      attachment: ChatAttachment | null
    }) => {
      const operation_id = localStorage.getItem(request.key) ?? crypto.randomUUID()
      localStorage.setItem(request.key, operation_id)
      return (
        await api.post<Delivery>(request.path, {
          operation_id,
          text: request.attachment ? '' : request.text,
          message_type: request.attachment?.type ?? 'text',
          attachment_id: request.attachment?.card.id,
        })
      ).data
    },
    onSuccess: (result, request) => {
      if (result.status !== 'belum_pasti') localStorage.removeItem(request.key)
      qc.invalidateQueries({ queryKey: ['chat', 'inbox'] })
      if (request.key !== storageKey) return
      setDelivery(result)
      if (result.status === 'terkirim') {
        if (request.newConversation && result.message?.conversation_id) {
          setThreadShop(threadShop)
          setShop(threadShop)
          setSelected({ ...selected!, conversation_id: String(result.message.conversation_id) })
          setParams({})
        }
        if (!request.attachment) setText('')
        setAttachment(null)
        setOffset('')
        setOlder([])
        qc.invalidateQueries({ queryKey: ['chat', 'messages'] })
      }
    },
    onError: (e, request) => {
      const status = (e as { response?: { status?: number } }).response?.status
      const rejected = status && [400, 401, 403, 404, 409, 422, 424].includes(status)
      if (rejected) localStorage.removeItem(request.key)
      if (request.key !== storageKey) return
      setDelivery(
        rejected
          ? { status: 'gagal', error: getApiError(e) }
          : { status: 'belum_pasti', error: `${getApiError(e)} Segarkan riwayat sebelum melanjutkan.` },
      )
    },
    retry: false,
  })
  const syncChat = useMutation({
    mutationFn: async ({ shopId }: { shopId: string }) => {
      setShop(shopId)
      if (shopId && threadShop !== shopId) setSelected(null)
      setCursor('')
      setOffset('')
      setOlder([])
      await qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'chat' && (!shopId || query.queryKey[2] === shopId),
      })
    },
    onSuccess: () => setSyncedAt(new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })),
  })
  const rows = (inbox.data ?? [])
    .flatMap((result) => (result.data?.conversations ?? []).map((c) => ({ ...c, shop: result.shop })))
    .filter((c) => !unreplied || chatNeedsReply(c) === true)
    .filter((c) => !search || (c.to_name || '').toLowerCase().includes(search.toLowerCase()))
    .sort(
      (a, b) =>
        chatTimestamp(b.last_message_timestamp) - chatTimestamp(a.last_message_timestamp) ||
        String(a.conversation_id).localeCompare(String(b.conversation_id)),
    )
  const messages = [...new Map([...older, ...(history.data?.messages ?? [])].map((m) => [m.message_id, m])).values()].sort(
    (a, b) => chatTimestamp(a.created_timestamp) - chatTimestamp(b.created_timestamp),
  )
  function open(c: Conversation, akunId: string) {
    setThreadShop(akunId)
    setSelected(c)
    setOffset('')
    setOlder([])
    setText('')
    setDelivery(null)
    setReadError('')
    setCursor('')
    setAttachment(null)
    setProductSearch('')
    setProductOffset(0)
    setParams({})
  }
  return (
    <div className="space-y-4">
      <BarHalaman judul="Chat" deskripsi="Baca dan balas percakapan pembeli dari toko yang diizinkan.">
        {shop && (
          <Button variant="secondary" disabled={syncChat.isPending} onClick={() => syncChat.mutate({ shopId: '' })}>
            {syncChat.isPending ? 'Menyinkronkan Chat…' : 'Sinkronisasi seluruh toko'}
          </Button>
        )}
      </BarHalaman>
      {syncedAt && (
        <p role="status" className="text-xs text-muted-foreground">
          Pemeriksaan data terbaru selesai {syncedAt} WIB. Kendala tiap toko ditampilkan di bawah.
        </p>
      )}
      <p className="rounded-xl border p-3 text-sm text-muted-foreground">
        Pilih percakapan, baca pesan, lalu ketik balasan. Kirim hanya atas tindakan Anda. Gunakan Lampirkan produk / pesanan untuk mengirim
        kartu dari toko percakapan. Gambar berasal dari katalog dan pesanan yang tersinkron. Bila hasil kirim belum pasti, periksa riwayat
        terlebih dahulu.
      </p>
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
        <select
          aria-label="Toko Chat"
          className="w-full min-w-0 rounded-md border p-2"
          value={shop}
          onChange={(e) => {
            setShop(e.target.value)
            setSelected(null)
            setCursor('')
            setAttachment(null)
            setParams({})
          }}
        >
          <option value="">Seluruh toko</option>
          {available.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama_toko}
            </option>
          ))}
        </select>
        <Button variant="outline" className="w-full" disabled={syncChat.isPending} onClick={() => syncChat.mutate({ shopId: shop })}>
          {shop ? 'Sinkronisasi toko ini' : 'Sinkronisasi seluruh toko'}
        </Button>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => {
              setUnread(e.target.checked)
              setCursor('')
            }}
          />
          Belum dibaca
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={unreplied}
            onChange={(e) => {
              setUnreplied(e.target.checked)
              setCursor('')
            }}
          />
          Belum dibalas
        </label>
        <Input
          aria-label="Cari pembeli"
          placeholder="Cari pembeli pada halaman ini"
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Percakapan diurutkan dari pesan terbaru. Kota/kabupaten memakai alamat tujuan pesanan yang tersinkron. Jika tidak tersedia, ditandai
        di samping username.
      </p>
      {unreplied && (
        <p className="text-xs text-muted-foreground">
          Belum dibalas: pesan terakhir berasal dari pembeli pada halaman yang dimuat. Gunakan Berikutnya untuk menelusuri riwayat.
        </p>
      )}
      {orderStart.isFetching && <p role="status">Menyiapkan percakapan pembeli…</p>}
      {orderStart.error && <QueryError error={orderStart.error} retry={orderStart.refetch} />}
      {!available.length && <p>Belum ada toko Shopee terhubung yang dapat Anda akses.</p>}
      {(inbox.data ?? [])
        .filter((r) => r.error)
        .map((r) => (
          <p key={r.shop.id} role="alert" className="rounded-xl border border-destructive p-3 text-destructive">
            {r.shop.nama_toko}: {r.error}
          </p>
        ))}
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
        <section className={`min-w-0 rounded-xl border p-3 ${selected ? 'hidden md:block' : ''}`} aria-label="Daftar percakapan">
          {inbox.isFetching && <p className="text-sm">Memuat percakapan…</p>}
          {rows.map((c) => (
            <button
              key={`${c.shop.id}:${c.conversation_id}`}
              className="mb-2 w-full rounded-lg border border-primary/30 bg-card p-3 text-left shadow-sm hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => open(c, c.shop.id)}
            >
              <div className="font-medium">
                {c.to_name || 'Pembeli'}
                <span className="ml-2 text-xs text-muted-foreground" title="Alamat tujuan pesanan tersinkron">
                  · {c.kota || 'Kota belum tersedia'}
                </span>
                {c.unread_count > 0 && (
                  <span className="ml-2 inline-block rounded bg-primary/20 px-1.5 text-xs text-foreground">
                    {' '}
                    {c.unread_count} belum dibaca
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.shop.nama_toko} · {time(c.last_message_timestamp)}
              </div>
              <p className="line-clamp-2 break-words text-sm">{chatPreview(c.latest_message_content, c.latest_message_type)}</p>
            </button>
          ))}
          {!inbox.isFetching && !rows.length && <p>Tidak ada percakapan pada cakupan ini.</p>}
          <div className="mt-3 grid gap-2" aria-label="Riwayat per toko">
            {(inbox.data ?? [])
              .filter((r) => r.data?.page_result.more)
              .map((r) => (
                <Button
                  key={r.shop.id}
                  variant="secondary"
                  className="w-full justify-between whitespace-normal text-left h-auto min-h-10 py-2"
                  onClick={() => {
                    setShop(r.shop.id)
                    setCursor(r.data?.page_result.next_cursor?.next_message_time_nano ?? '')
                  }}
                >
                  <span className="min-w-0 break-words">{r.shop.nama_toko}</span>
                  <span className="shrink-0">Lebih lama →</span>
                </Button>
              ))}
          </div>
          {!!cursor && (
            <Button variant="outline" onClick={() => setCursor('')}>
              Kembali ke terbaru
            </Button>
          )}
        </section>
        <section className={`min-w-0 rounded-xl border p-3 ${!selected ? 'hidden md:block' : ''}`} aria-label="Percakapan">
          {!selected ? (
            <p>Pilih percakapan untuk membaca dan membalas.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(null)
                    setParams({})
                    setAttachment(null)
                  }}
                >
                  Kembali
                </Button>
                <h2 className="font-medium">
                  {selected.to_name}
                  <span className="ml-2 text-sm text-muted-foreground" title="Alamat tujuan pesanan tersinkron">
                    · {city || 'Kota belum tersedia'}
                  </span>
                  · {active?.nama_toko}
                </h2>
              </div>
              {newConversation && (
                <p className="my-2 text-sm text-muted-foreground">
                  Tulis pesan untuk pembeli pesanan ini. Riwayat dimuat setelah Shopee mengembalikan identitas percakapan. Tidak ada pesan
                  yang dikirim otomatis.
                </p>
              )}
              {orderStart.data && orderId && (
                <div className="my-3 rounded-lg border p-3">
                  <ChatCardView card={orderStart.data.order} />
                </div>
              )}
              <Button variant="outline" disabled={markRead.isPending || !selected?.conversation_id} onClick={() => markRead.mutate()}>
                Tandai sudah dibaca
              </Button>
              {readError && (
                <p role="alert" className="text-sm text-destructive">
                  {readError}
                </p>
              )}
              {history.error && <QueryError error={history.error} retry={history.refetch} />}
              {history.isFetching && <p>Memuat pesan…</p>}
              {!!history.data?.page_result.next_offset && history.data.page_result.next_offset !== '0' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setOlder(messages)
                    setOffset(history.data!.page_result.next_offset!)
                  }}
                >
                  Pesan lebih lama
                </Button>
              )}
              <div className="my-3 max-h-[55dvh] space-y-3 overflow-y-auto" aria-live="polite">
                {messages.map((m) => (
                  <div
                    key={m.message_id}
                    className={`max-w-[90%] rounded-xl p-3 ${String(m.from_shop_id) === active?.id_toko_eksternal ? 'ml-auto bg-muted' : 'border'}`}
                  >
                    <>
                      {m.context?.order ? (
                        <ChatCardView card={m.context.order} />
                      ) : m.context?.product ? (
                        <ChatCardView card={m.context.product} />
                      ) : (
                        <MessageContent
                          content={m.content}
                          sourceContent={m.source_content}
                          type={m.message_type}
                          shopId={active?.id_toko_eksternal ?? undefined}
                        />
                      )}
                    </>
                    <div className="mt-1 text-xs text-muted-foreground">{time(m.created_timestamp)}</div>
                    {m.context?.order_id && (
                      <Link className="text-sm underline" to={`/pesanan/${encodeURIComponent(m.context.order_id)}`}>
                        Buka pesanan terkait
                      </Link>
                    )}
                    {m.context?.katalog_id && user?.role !== 'staff' && (
                      <Link className="text-sm underline" to={`/katalog?detail=${encodeURIComponent(m.context.katalog_id)}`}>
                        Buka produk terkait
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              {context.error && <QueryError error={context.error} retry={context.refetch} />}
              <AttachmentPicker
                data={context.data}
                search={productSearch}
                setSearch={setProductSearch}
                offset={productOffset}
                setOffset={setProductOffset}
                choose={setAttachment}
                disabled={send.isPending || !!pending || !!attachment}
              />
              {attachment && (
                <div className="my-3 rounded-lg border p-3">
                  <p className="mb-2 text-xs font-medium">Lampiran yang akan dikirim</p>
                  <ChatCardView card={attachment.card} />
                  <Button variant="outline" className="mt-2" disabled={send.isPending || !!pending} onClick={() => setAttachment(null)}>
                    Hapus lampiran
                  </Button>
                </div>
              )}
              {delivery && (
                <p role="status" className={delivery.status === 'terkirim' ? 'text-sm' : 'text-sm text-destructive'}>
                  {delivery.status === 'terkirim' ? 'Pesan terkirim.' : delivery.error || 'Hasil kirim belum pasti; periksa riwayat.'}
                </p>
              )}
              {pending && !send.isPending && (
                <div className="space-y-2 rounded-md border p-2 text-sm">
                  <p>Pengiriman sebelumnya belum dipastikan. Periksa riwayat sebelum membuat balasan baru.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem(storageKey)
                      setDelivery(null)
                      setText('')
                    }}
                  >
                    Sudah memeriksa riwayat
                  </Button>
                </div>
              )}
              <Textarea
                aria-label="Balasan Chat"
                placeholder="Tulis balasan…"
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={send.isPending || !!pending || !!attachment}
              />
              <Button
                className="mt-2"
                onClick={() =>
                  send.mutate({
                    key: storageKey,
                    path: newConversation ? `/pesanan/${encodeURIComponent(orderId)}/chat/pesan` : path,
                    newConversation,
                    text,
                    attachment,
                  })
                }
                disabled={
                  (!attachment && !text.trim()) ||
                  send.isPending ||
                  !!pending ||
                  (!newConversation && (!history.data || !!history.error)) ||
                  (newConversation && !orderStart.data)
                }
              >
                {send.isPending ? 'Mengirim…' : attachment ? 'Kirim lampiran' : 'Kirim balasan'}
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
