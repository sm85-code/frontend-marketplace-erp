import { describe, expect, it } from 'vitest'
import { formatDurasi } from '@/lib/progres'

describe('formatDurasi', () => {
  it('shows seconds, then minutes', () => {
    expect(formatDurasi(0)).toBe('0 dtk')
    expect(formatDurasi(8.9)).toBe('8 dtk')
    expect(formatDurasi(60)).toBe('1 mnt')
    expect(formatDurasi(75)).toBe('1 mnt 15 dtk')
    expect(formatDurasi(-5)).toBe('0 dtk')
  })
})
