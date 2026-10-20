import { describe, expect, it } from 'vitest'
import { kunciKeBytes } from './push'

describe('push key', () => {
  it('turns the base64url public key into the bytes the browser subscribes with', () => {
    const bytes = kunciKeBytes('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4')
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(4) // uncompressed P-256 point
  })
})
