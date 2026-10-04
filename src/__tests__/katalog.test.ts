import { describe, expect, it } from 'vitest'
import { bagiBatch, labelStatusShopee, rentangHarga, ringkasKirim, STATUS_AWAL_KATALOG, STATUS_SHOPEE, ukuranPaket } from '@/lib/katalog'

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

  it('formats package size', () => {
    expect(ukuranPaket('20.0', '10.0', '5.0')).toBe('20×10×5 cm')
    expect(ukuranPaket('0', '0', '0')).toBe('—')
  })
})

describe('Shopee product status', () => {
  it('uses the values the API knows, worded as Seller Centre does', () => {
    expect(STATUS_SHOPEE.map((s) => s.value)).toEqual(['NORMAL', 'UNLIST', 'BANNED', 'REVIEWING'])
    expect(labelStatusShopee('NORMAL')).toBe('Aktif')
    expect(labelStatusShopee('UNLIST')).toBe('Tidak aktif')
    expect(labelStatusShopee('BANNED')).toBe('Diblokir')
    expect(labelStatusShopee('REVIEWING')).toBe('Sedang ditinjau')
    expect(labelStatusShopee('SOMETHING_NEW')).toBe('SOMETHING_NEW') // an unknown status is shown as Shopee sent it
  })

  it('the catalogue opens on active products', () => {
    expect(STATUS_AWAL_KATALOG).toBe('NORMAL')
  })
})
