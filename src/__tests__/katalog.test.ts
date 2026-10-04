import { describe, expect, it } from 'vitest'
import { bagiBatch, rentangHarga, ringkasKirim } from '@/lib/katalog'

describe('katalog helpers', () => {
  it('shows one price or a range', () => {
    expect(rentangHarga('100000', '100000')).toBe('Rp 100.000')
    expect(rentangHarga('100000', '120000')).toBe('Rp 100.000 – Rp 120.000')
    expect(rentangHarga(null, null)).toBe('—')
  })

  it('splits into batches of 20', () => {
    const batches = bagiBatch(Array.from({ length: 45 }, (_, i) => i))
    expect(batches.map((b) => b.length)).toEqual([20, 20, 5])
  })

  it('summarises a send', () => {
    const h = (hasil: 'dibuat' | 'diperbarui' | 'dilewati') => ({ id: 'x', nama: 'n', nama_toko: 't', hasil })
    expect(ringkasKirim([h('dibuat'), h('dibuat'), h('dilewati')])).toBe(
      'Terkirim ke toko web: 2 produk baru, 1 dilewati (sudah ada di toko web)',
    )
    expect(ringkasKirim([])).toBe('Tidak ada produk yang dikirim')
  })
})
