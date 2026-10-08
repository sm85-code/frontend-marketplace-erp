import { describe, expect, it } from 'vitest'
import { chatNeedsReply, chatTimestamp, chatPresentation, chatPreview, chatWebUrl } from '@/lib/chat'

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
