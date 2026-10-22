import { describe, expect, it } from 'vitest'
import { fotoAsli } from '@/pages/pesanan/ItemRingkas'

describe('fotoAsli', () => {
  it('drops the thumbnail suffix', () => {
    expect(fotoAsli('https://down-id.img.susercontent.com/file/abc_tn')).toBe('https://down-id.img.susercontent.com/file/abc')
  })
  it('leaves other urls alone', () => {
    expect(fotoAsli('https://x.id/file/abc')).toBe('https://x.id/file/abc')
    expect(fotoAsli('https://x.id/a_tnx.png')).toBe('https://x.id/a_tnx.png')
  })
})
