import { useTokoAktif } from '@/lib/tokoAktif'
import Bantuan from '@/components/Bantuan'
import { Link, useSearchParams } from 'react-router-dom'
import { qk } from '@/api/keys'
import { useRef, useState } from 'react'
import { ArrowLeft, RefreshCw, Send, UserRound, Camera, ImagePlus, X } from 'lucide-react'
import { chatWebUrl } from '@/lib/chat'
import { chatClosedNotice, chatNeedsReply, chatTimestamp, chatPreview, type ChatCard, type ChatContext, type ChatAttachment } from '@/lib/chat'
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
  to_avatar?: string
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
function Avatar({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false)
  const safe = chatWebUrl(url)
  return <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
    {safe && !failed ? <img src={safe} alt="" className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <UserRound className="size-5"/>}
  </span>
}
function shortTime(value: number | string) {
  const timestamp = chatTimestamp(value)
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  const today = new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'})
  return date.toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'}) === today
    ? date.toLocaleTimeString('id-ID', {timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'})
    : date.toLocaleDateString('id-ID', {timeZone:'Asia/Jakarta',day:'2-digit',month:'short'})
}
function time(value: number | string) {
  if (!chatTimestamp(value)) return '—'
  const date = new Date(chatTimestamp(value))
  return Number.isFinite(date.getTime()) ? fmtDateTime(date.toISOString()) : '—'
}

export default function ChatPage() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const orderId = params.get('pesanan') ?? ''
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState('')
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [productOffset, setProductOffset] = useState(0)
  const [shopOverride, setShop] = useTokoAktif()
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
  const [historySearch,setHistorySearch]=useState<{scope:string;rows:(Conversation&{shop:typeof available[number]})[];more:boolean;errors:string[]}|null>(null)
  const searchScope=`${shop}:${unread}`
  const searchHistory=useMutation({
    retry:false,
    mutationFn:async()=>{
      const collected:(Conversation&{shop:typeof available[number]})[]=[];const errors:string[]=[];let more=false
      for(const target of targets) {
        let next=''
        try {
          for(let page=0;page<10;page++) {
            const result=(await api.get<Inbox>(`/akun/${target.id}/chat`,{params:{unread,cursor:next||undefined}})).data
            collected.push(...result.conversations.map(c=>({...c,shop:target})))
            const cursorNext=result.page_result.next_cursor?.next_message_time_nano??''
            if(!result.page_result.more) break
            if(!cursorNext||cursorNext===next) {more=true;break}
            next=cursorNext;if(page===9)more=true
          }
        } catch(e) {errors.push(`${target.nama_toko}: ${getApiError(e)}`)}
      }
      return {scope:searchScope,rows:collected,more,errors}
    },
    onSuccess:setHistorySearch,
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
  const upload = useMutation({
    retry: false,
    mutationFn: async ({ file, akunId }: {file: File; akunId: string}) => {
      if (!['image/jpeg','image/png'].includes(file.type)) throw new Error('Gunakan foto JPG/JPEG/PNG. Ubah format HEIC terlebih dahulu.')
      if (file.size > 10 * 1024 * 1024) throw new Error('Foto maksimal 10 MB.')
      const body = new FormData(); body.append('file',file)
      return (await api.post<{id:string;url:string}>(`/akun/${akunId}/chat/foto`, body, {timeout:45000})).data
    },
    onSuccess: result => {setPhotoError('');setAttachment({type:'image',card:{id:result.id,nama:'Foto yang akan dikirim',foto:result.url}})},
    onError: e => setPhotoError(e instanceof Error && !('response' in e) ? e.message : getApiError(e)),
  })
  function selectPhoto(file?: File) {
    if (!file || !threadShop || upload.isPending || send.isPending || pending || attachment) return
    setPhotoError('');upload.mutate({file,akunId:threadShop})
  }
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
  const currentRows=(inbox.data??[]).flatMap(result=>(result.data?.conversations??[]).map(c=>({...c,shop:result.shop})))
  const rows = [...new Map([...(historySearch?.scope===searchScope?historySearch.rows:[]),...currentRows].map(c=>[`${c.shop.id}:${c.conversation_id}`,c])).values()]
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
    setPhotoError('')
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
    <div className="space-y-3">
      <div className={selected ? "hidden md:block" : ""}><BarHalaman judul="Chat">
        {shop && (
          <Button variant="secondary" disabled={syncChat.isPending || upload.isPending} onClick={() => syncChat.mutate({ shopId: '' })}>
            {syncChat.isPending ? 'Menyinkronkan Chat…' : 'Sinkronisasi seluruh toko'}
          </Button>
        )}
      </BarHalaman></div>
      {syncedAt && (
        <p role="status" className="text-xs text-muted-foreground">
          Pemeriksaan data terbaru selesai {syncedAt} WIB. Kendala tiap toko ditampilkan di bawah.
        </p>
      )}
      <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 ${selected ? "hidden md:grid" : ""}`}>
        <select
          aria-label="Toko Chat"
          disabled={upload.isPending}
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
        <Button variant="secondary" className="gap-2" disabled={syncChat.isPending || upload.isPending} onClick={() => {setHistorySearch(null);syncChat.mutate({ shopId: shop })}}>
          <RefreshCw className={`size-4 ${syncChat.isPending ? 'animate-spin' : ''}`}/><span className="hidden sm:inline">{shop ? 'Sinkronisasi toko' : 'Sinkronisasi semua'}</span><span className="sr-only sm:hidden">{shop ? 'Sinkronisasi toko ini' : 'Sinkronisasi seluruh toko'}</span>
        </Button>

        <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-2 text-sm"><label className="flex items-center gap-2">
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
        </div><Input
          aria-label="Cari pembeli"
          placeholder="Cari pembeli dalam data termuat"
          className="col-span-2 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {(search||unreplied)&&<div className="flex flex-wrap items-center gap-2"><Button variant="outline" disabled={searchHistory.isPending} onClick={()=>searchHistory.mutate()}>{searchHistory.isPending?'Menelusuri…':'Cari dalam riwayat toko'}</Button><small className="text-muted-foreground">Maks. 10 halaman per toko setiap penelusuran.</small></div>}
      {historySearch?.scope===searchScope&&historySearch.more&&<p role="status" className="text-xs">Hasil belum mencakup semua riwayat. Pilih toko dan buka percakapan lebih lama untuk melanjutkan.</p>}
      {historySearch?.scope===searchScope&&historySearch.errors.map(error=><p key={error} role="alert" className="text-sm text-destructive">{error}</p>)}
      <div className={selected ? 'hidden md:block' : ''}><Bantuan judul="Bantuan chat"><p>Pilih percakapan untuk membalas atau melampirkan produk/pesanan dari toko tersebut. Daftar diurutkan dari pesan terbaru. Kota pembeli berasal dari pesanan tersinkron; konten yang tidak disertakan Shopee tetap ditandai.</p></Bantuan></div>
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
        <section className={`min-w-0 overflow-hidden rounded-xl border bg-card ${selected ? 'hidden md:block' : ''}`} aria-label="Daftar percakapan">
          {inbox.isFetching && <p className="text-sm">Memuat percakapan…</p>}
          {rows.map((c) => (
            <button
              key={`${c.shop.id}:${c.conversation_id}`}
              aria-current={selected?.conversation_id === c.conversation_id && threadShop === c.shop.id ? 'true' : undefined}
              className="flex w-full items-start gap-3 border-b p-3 text-left last:border-b-0 hover:bg-muted/60 aria-[current=true]:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              disabled={upload.isPending}
              onClick={() => open(c, c.shop.id)}
            >
              <Avatar key={c.to_avatar} url={c.to_avatar}/>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><span className="truncate font-semibold">{c.to_name || 'Pembeli'}</span><time className="shrink-0 text-[11px] text-muted-foreground" title={time(c.last_message_timestamp)}>{shortTime(c.last_message_timestamp)}</time></div>
                <div className="truncate text-xs text-muted-foreground">{c.shop.nama_toko}{c.kota ? ` · ${c.kota}` : ''}</div>
                <div className="mt-1 flex items-center justify-between gap-2"><p className="line-clamp-1 min-w-0 break-words text-sm text-muted-foreground">{chatPreview(c.latest_message_content, c.latest_message_type)}</p>
                  {c.unread_count > 0 && <span aria-label={`${c.unread_count} belum dibaca`} className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{c.unread_count}</span>}
                </div>
              </div>
            </button>
          ))}
          {!inbox.isFetching && !rows.length && <p>Tidak ada percakapan pada cakupan ini.</p>}
          <div className="grid gap-2 p-3" aria-label="Riwayat per toko">
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
        <section className={`min-w-0 overflow-hidden rounded-xl border bg-card p-3 ${!selected ? 'hidden md:block' : ''}`} aria-label="Percakapan">
          {!selected ? (
            <p>Pilih percakapan untuk membaca dan membalas.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  disabled={upload.isPending}
                  onClick={() => {
                    setSelected(null)
                    setParams({})
                    setAttachment(null)
                  }}
                >
                  <ArrowLeft className="size-4"/><span className="sr-only">Kembali</span>
                </Button>
                <Avatar key={selected.to_avatar} url={selected.to_avatar}/><h2 className="min-w-0 flex-1 font-medium">
                  {selected.to_name}
                  <span className="ml-2 text-sm text-muted-foreground" title="Alamat tujuan pesanan tersinkron">
                    {city ? `· ${city}` : ''}
                  </span>
                  <span className="block text-xs text-muted-foreground">{active?.nama_toko}</span>
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
              <div className="my-3 min-h-[32dvh] max-h-[55dvh] space-y-3 overflow-y-auto rounded-xl bg-muted/40 p-3" aria-live="polite">
                {messages.filter(m => !chatClosedNotice(m.content, m.message_type)).map((m) => (
                  <div
                    key={m.message_id}
                    className={['notification', 'system'].includes(m.message_type) ? 'mx-auto max-w-[90%] rounded-lg bg-background/80 px-3 py-2 text-center text-muted-foreground' : `w-fit max-w-[90%] rounded-2xl p-3 shadow-sm ${String(m.from_shop_id) === active?.id_toko_eksternal ? 'ml-auto rounded-tr-sm bg-primary/15' : 'rounded-tl-sm border bg-card'}`}
                  >
                    <>
                      {m.message_type === 'text' && (m.context?.order || m.context?.product) && <div className="mb-2"><MessageContent content={m.content} type="text"/></div>}
                      {m.context?.order ? (
                        <ChatCardView card={m.context.order} />
                      ) : m.context?.product ? (
                        <ChatCardView card={m.context.product} />
                      ) : (
                        <MessageContent
                          outgoing={String(m.from_shop_id) === active?.id_toko_eksternal}
                          content={m.content}
                          sourceContent={m.source_content}
                          type={m.message_type}
                          shopId={active?.id_toko_eksternal ?? undefined}
                        />
                      )}
                    </>
                    <div className="mt-1 text-right text-[11px] text-muted-foreground">{shortTime(m.created_timestamp)}</div>
                    {m.context?.order_id && (
                      <Link className="text-sm underline" to={`/pesanan/${encodeURIComponent(m.context.order_id)}`}>
                        Buka pesanan terkait
                      </Link>
                    )}
                    {m.context?.katalog_id && (
                      <Link className="text-sm underline" to={`/katalog/${encodeURIComponent(m.context.katalog_id)}`}>
                        Buka produk terkait
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              {context.error && <QueryError error={context.error} retry={context.refetch} />}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
              <input ref={galleryInput} className="hidden" type="file" accept="image/jpeg,image/png" aria-label="Pilih gambar dari galeri" onChange={e=>{selectPhoto(e.target.files?.[0]);e.target.value=''}}/>
              <input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" aria-label="Ambil gambar dengan kamera" onChange={e=>{selectPhoto(e.target.files?.[0]);e.target.value=''}}/>
              <Button type="button" variant="secondary" className="h-auto min-h-16 flex-col gap-1 rounded-xl px-2 py-2 text-xs" disabled={send.isPending || upload.isPending || !!pending || !!attachment} onClick={()=>galleryInput.current?.click()}><ImagePlus className="size-5"/>Galeri</Button>
              <Button type="button" variant="secondary" className="h-auto min-h-16 flex-col gap-1 rounded-xl px-2 py-2 text-xs" disabled={send.isPending || upload.isPending || !!pending || !!attachment} onClick={()=>cameraInput.current?.click()}><Camera className="size-5"/>Kamera</Button>
              <AttachmentPicker
                data={context.data}
                search={productSearch}
                setSearch={setProductSearch}
                offset={productOffset}
                setOffset={setProductOffset}
                choose={setAttachment}
                disabled={send.isPending || upload.isPending || !!pending || !!attachment}
              />
              </div>
              {upload.isPending && <p role="status" className="mt-2 text-sm">Mengunggah foto… Pesan belum dikirim.</p>}
              {photoError && <p role="alert" className="mt-2 text-sm text-destructive">{photoError}</p>}
              {attachment && (
                <div className="my-3 rounded-lg border p-3">
                  <p className="mb-2 text-xs font-medium">Lampiran yang akan dikirim</p>
                  {attachment.type === 'image' ? <img src={attachment.card.foto ?? ''} alt="Pratinjau foto yang akan dikirim" className="max-h-64 max-w-full rounded-xl object-contain" referrerPolicy="no-referrer"/> : <ChatCardView card={attachment.card}/> }
                  <Button variant="outline" className="mt-2" disabled={send.isPending || !!pending} onClick={() => setAttachment(null)}>
                    <X className="mr-2 size-4"/>Hapus lampiran
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
              <div className="mt-3 flex items-end gap-2 border-t bg-card pt-3"><Textarea
                className="min-h-11 flex-1 resize-none"
                rows={2}
                aria-label="Balasan Chat"
                placeholder="Tulis balasan…"
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={send.isPending || !!pending || !!attachment}
              />
              <Button
                className="shrink-0"
                aria-label={attachment ? "Kirim lampiran" : "Kirim balasan"}
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
                  upload.isPending ||
                  !!pending ||
                  (!newConversation && (!history.data || !!history.error)) ||
                  (newConversation && !orderStart.data)
                }
              >
                {send.isPending ? 'Mengirim…' : <><Send className="size-4"/><span className="hidden sm:inline">Kirim</span></>}
              </Button></div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
