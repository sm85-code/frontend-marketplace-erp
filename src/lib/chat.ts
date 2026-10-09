export type ChatCard = {
  id: string
  nama: string
  foto: string | null
  varian?: string
  model_id?: string | null
  order_sn?: string
  status?: string
  total?: string
  harga?: string | null
  items?: { nama: string; varian: string; qty: number; foto: string | null }[]
}
export type ChatContext = {
  kota: string | null
  kota_sumber: string | null
  pesanan: ChatCard[]
  produk: ChatCard[]
  produk_ada_lagi: boolean
  produk_offset: number
}
export type ChatAttachment = { type: 'item' | 'order' | 'image'; card: ChatCard }
/** Normalize the seconds/ms/ns timestamps returned by Chat before comparing shops. */
export function chatTimestamp(value: number | string | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n > 1e15 ? n / 1e6 : n > 1e12 ? n : n * 1000
}

/** Read status does not determine whether a buyer still needs a reply. */
export function chatNeedsReply(conversation: {
  needs_reply?: boolean | null
  latest_message_from_id?: string | number
  to_id: string | number
}): boolean | null {
  if (typeof conversation.needs_reply === 'boolean') return conversation.needs_reply
  if (!conversation.latest_message_from_id || !conversation.to_id) return null
  return String(conversation.latest_message_from_id) === String(conversation.to_id)
}

export type ChatPresentation = {
  text: string[]
  label: string
  image?: string
  video?: string
  link?: string
}

/** Provider content is data, never HTML. Only web URLs are rendered as links/media. */
export function chatWebUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  try {
    const url = new URL(value)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href
  } catch {
    /* Not a URL. */
  }
}

export function chatPresentation(value: unknown, type = '', shopId?: string, outgoing?: boolean): ChatPresentation {
  const labels: Record<string, string> = {
    item: 'Produk',
    product: 'Produk',
    order: 'Pesanan',
    image: 'Gambar',
    sticker: 'Stiker',
    video: 'Video',
    system: 'Pesan sistem',
    notification: 'Notifikasi Shopee',
    'rich-text': 'Pesan terstruktur',
    rich_text: 'Pesan terstruktur',
    auto_reply: 'Balasan otomatis',
    template: 'Pesan otomatis',
    file: 'Lampiran',
    offer: 'Penawaran',
  }
  const result: ChatPresentation = { text: [], label: labels[type] || 'Pesan' }
  const records: Record<string, unknown>[] = []
  const textKeys = new Set([
    'text',
    'message',
    'title',
    'description',
    'name',
    'item_name',
    'product_name',
    'model_name',
    'variation_name',
    'variant_name',
    'label',
    'caption',
    'body',
    'notification_for_sender',
    'notification_for_receiver',
    'fallback_text',
    'plain_text',
    'insert',
  ])
  function read(data: unknown, depth = 0, key = '') {
    if (depth > 6 || records.length > 100) return
    if (typeof data === 'string') {
      if (!depth || textKeys.has(key) || key === 'content') {
        const text = data.trim()
        if (text && !result.text.includes(text)) result.text.push(text)
      }
    } else if (Array.isArray(data)) {
      data.slice(0, 30).forEach((v) => read(v, depth + 1, key))
    } else if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      records.push(record)
      Object.entries(record).forEach(([k, v]) => {
        if (k === 'notification_for_sender' && outgoing === false) return
        if (k === 'notification_for_receiver' && outgoing === true) return
        read(v, depth + 1, k)
      })
    }
  }
  // Some Chat payloads carry JSON inside a string.
  if (typeof value === 'string' && /^[{[]/.test(value.trim())) {
    try {
      value = JSON.parse(value)
    } catch {
      /* Keep a normal text message. */
    }
  }
  read(value)
  function field(...keys: string[]) {
    for (const record of records)
      for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null) return record[key]
      }
  }
  function url(...keys: string[]) {
    for (const record of records)
      for (const key of keys) {
        const valid = chatWebUrl(record[key])
        if (valid) return valid
      }
  }
  const itemId = field('item_id')
  const orderSn = field('order_sn')
  if (itemId !== undefined) {
    result.label = 'Produk'
    if (!result.text.length) result.text.push('Produk #' + String(itemId))
    const owner = field('shop_id') ?? shopId
    if (/^\d+$/.test(String(owner)) && /^\d+$/.test(String(itemId))) {
      result.link = 'https://shopee.co.id/product/' + String(owner) + '/' + String(itemId)
    }
  }
  if (orderSn) {
    result.label = 'Pesanan'
    result.text.push('Pesanan #' + String(orderSn))
  }
  result.image = url('image_url', 'thumbnail', 'thumbnail_url', 'thumb_url', 'model_image_url', 'product_image_url', 'item_image_url')
  if (['image', 'sticker'].includes(type)) result.image ??= url('url', 'image')
  if (type === 'video') result.video = url('video_url', 'url')
  result.link ??= url('item_url', 'product_url', 'link', 'url')
  if (!result.text.length && !result.image && !result.video && !result.link) {
    result.text.push('Shopee belum menyertakan konten yang dapat ditampilkan' + (type ? ' (' + type + ').' : '.'))
  }
  return result
}

export function chatPreview(value: unknown, type = ''): string {
  const view = chatPresentation(value, type)
  if (view.text[0]?.startsWith('Shopee belum menyertakan konten')) return `${view.label} · konten tidak tersedia`
  return view.text.join(' · ') || view.label
}

/** Suppress only explicit lifecycle notices, never buyer/seller message text. */
export function chatClosedNotice(content: unknown, type: string): boolean {
  if (!['notification', 'system'].includes(type)) return false
  const text = chatPresentation(content, type).text.join(' ').toLowerCase()
  return /(?:percakapan|chat)\s+(?:(?:telah|sudah|otomatis|secara otomatis)\s+)*(?:ditutup|diakhiri)|conversation\s+(?:(?:has been|is|was)\s+)?closed/.test(text)
}
