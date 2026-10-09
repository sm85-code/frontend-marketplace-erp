import { describe, expect, it } from 'vitest'
import { chatVariationCard, chatClosedNotice, chatNeedsReply, chatTimestamp, chatPresentation, chatPreview, chatWebUrl } from '@/lib/chat'

describe('chat timestamp order across shops', () => {
  it('compares seconds, milliseconds and nanoseconds on the same scale', () => {
    const old = 1791378000
    const latest = '1791464400000000000'
    expect(chatTimestamp(old)).toBe(1791378000000)
    expect(chatTimestamp(1791460800000)).toBe(1791460800000)
    expect(chatTimestamp(latest)).toBe(1791464400000)
    expect([old, latest, 1791460800000].sort((a, b) => chatTimestamp(b) - chatTimestamp(a))).toEqual([latest, 1791460800000, old])
  })
  it('places unavailable timestamps last', () => {
    expect(chatTimestamp(undefined)).toBe(0)
    expect(chatTimestamp('invalid')).toBe(0)
  })
})

it('unreplied depends on sender identity rather than read status', () => {
  expect(chatNeedsReply({ to_id: 77, latest_message_from_id: '77' })).toBe(true)
  expect(chatNeedsReply({ to_id: 77, latest_message_from_id: 123 })).toBe(false)
  expect(chatNeedsReply({ to_id: 77 })).toBeNull()
  expect(chatNeedsReply({ to_id: 77, needs_reply: false, latest_message_from_id: 77 })).toBe(false)
})

describe('Shopee nontext content', () => {
  it('reads nested automatic replies and JSON-string payloads without rendering HTML', () => {
    expect(chatPresentation({ message: { text: 'Terima kasih', buttons: [{ label: 'Cek stok' }] } }, 'template').text).toEqual([
      'Terima kasih',
      'Cek stok',
    ])
    expect(chatPreview('{"text":{"content":"Balasan otomatis"}}', 'auto_reply')).toBe('Balasan otomatis')
    expect(chatPresentation('<script>alert(1)</script>', 'text').text).toEqual(['<script>alert(1)</script>'])
  })
  it('shows native product/order identifiers and safe images/video/link', () => {
    const card = chatPresentation({ item_id: '123', item_name: 'Produk A', image_url: 'https://cdn.example/a.jpg' }, 'item', '456')
    expect(card).toMatchObject({
      label: 'Produk',
      text: ['Produk A'],
      image: 'https://cdn.example/a.jpg',
      link: 'https://shopee.co.id/product/456/123',
    })
    expect(chatPresentation({ order_sn: 'ORDER1' }, 'order').text).toEqual(['Pesanan #ORDER1'])
    expect(chatPresentation({ image: { url: 'https://cdn.example/b.jpg' } }, 'image').image).toBe('https://cdn.example/b.jpg')
    expect(chatPresentation({ video_url: 'https://cdn.example/video.mp4' }, 'video').video).toBe('https://cdn.example/video.mp4')
  })
  it('rejects executable URLs and does not guess unavailable payloads', () => {
    expect(chatWebUrl('javascript:alert(1)')).toBeUndefined()
    expect(chatWebUrl('data:text/html,hello')).toBeUndefined()
    expect(chatWebUrl('https://user:secret@example.com')).toBeUndefined()
    const result = chatPresentation({ url: 'javascript:alert(1)' }, 'image')
    expect(result.image).toBeUndefined()
    expect(result.link).toBeUndefined()
    expect(result.text[0]).toContain('belum menyertakan konten')
  })
})

it('reads notification text and rich-text inserts without executing markup', () => {
  expect(chatPresentation({ notification_for_receiver: 'Percakapan ditutup' }, 'notification').text).toEqual(['Percakapan ditutup'])
  expect(chatPresentation({ ops: [{ insert: 'Produk tersedia' }, { insert: '\n' }] }, 'rich-text').text).toEqual(['Produk tersedia'])
})

 it('selects notification text for the seller perspective and keeps missing previews concise', () => {
  const notice = { notification_for_sender: 'Anda bergabung', notification_for_receiver: 'Penjual membantu Anda' }
  expect(chatPresentation(notice, 'notification', '1', true).text).toEqual(['Anda bergabung'])
  expect(chatPresentation(notice, 'notification', '1', false).text).toEqual(['Penjual membantu Anda'])
  expect(chatPreview(null, 'notification')).toBe('Notifikasi Shopee · konten tidak tersedia')
 })

it('hides conversation closure notices without hiding normal messages', () => {
 expect(chatClosedNotice({notification_for_sender:'Percakapan telah ditutup'}, 'notification')).toBe(true)
 expect(chatClosedNotice({text:'Chat telah otomatis diakhiri.'}, 'system')).toBe(true)
 expect(chatClosedNotice({text:'Percakapan ditutup'}, 'text')).toBe(false)
 expect(chatClosedNotice({notification_for_sender:'Admin telah bergabung'}, 'notification')).toBe(false)
})

it('renders the supplied native variation-card format with photo and scaled buyer price', () => {
 const value = {product_id: 11,model_id:22,item_card_v2:{item_id:11,name:{text:'Rak Partisi'},thumb_url:'sg-11134201-parent',item_model_v2:[{model_id:22,name:{text:'Polos'},image:'sg-11134201-photo',display_price:{discount_price:'40891500000',origin_price:'45435000000',price_before_discount:'45435000000',currency:'IDR',is_price_mask:false}}]}}
 expect(chatVariationCard(value,'variation_card')).toMatchObject({nama:'Rak Partisi',varian:'Polos',harga:'408915',harga_asli:'454350',foto:'https://cf.shopee.co.id/file/sg-11134201-photo',currency:'IDR'})
 expect(chatVariationCard({...value,model_id:999},'variation_card')).toBeNull()
 value.item_card_v2.item_model_v2[0].display_price.is_price_mask=true
 expect(chatVariationCard(value,'variation_card')?.harga).toBeNull()
 expect(chatVariationCard(value,'text')).toBeNull()
})
