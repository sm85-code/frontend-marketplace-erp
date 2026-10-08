import { describe, expect, it } from 'vitest'
import { chatNeedsReply, chatTimestamp } from '@/lib/chat'

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
