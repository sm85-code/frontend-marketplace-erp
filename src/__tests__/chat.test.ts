import { describe, expect, it } from 'vitest'
import { chatTimestamp } from '@/lib/chat'

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
