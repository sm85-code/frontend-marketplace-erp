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

describe('varian per model', () => {
  const induk = { berat_gram: 500, panjang_cm: '40', lebar_cm: '30', tinggi_cm: '20', is_pre_order: false, days_to_ship: undefined }
  const v = { nama: 'Merah / S', sku: 'X', harga: '100000', stok: 3 }
  it('memakai nilai varian sendiri, atau nilai produk bila varian tidak mengaturnya', async () => {
    const { nilaiVarian } = await import('@/lib/katalog')
    const sendiri = nilaiVarian({ ...v, berat_gram: 1250, panjang_cm: 50, lebar_cm: null, tinggi_cm: 10, preorder: true, hari_kirim: 7 }, induk)
    expect(sendiri.berat).toEqual({ nilai: 1250, ikutProduk: false })
    expect(sendiri.panjang).toEqual({ nilai: 50, ikutProduk: false })
    expect(sendiri.lebar).toEqual({ nilai: 30, ikutProduk: true })
    expect(sendiri.preorder).toEqual({ aktif: true, hari: 7, ikutProduk: false })
    const warisan = nilaiVarian(v, { ...induk, is_pre_order: true, days_to_ship: 5 })
    expect(warisan.berat).toEqual({ nilai: 500, ikutProduk: true })
    expect(warisan.preorder).toEqual({ aktif: true, hari: 5, ikutProduk: true })
    expect(nilaiVarian({ ...v, preorder: false }, { ...induk, is_pre_order: true }).preorder).toEqual({ aktif: false, hari: null, ikutProduk: false })
  })
  it('mengenali data lama dan membaca nama tier serta opsi', async () => {
    const { varianLengkap, namaTier, labelVarian, labelStatusVarian, teksBerat } = await import('@/lib/katalog')
    expect(varianLengkap([v])).toBe(false)
    expect(varianLengkap(undefined)).toBe(false)
    const baru = { ...v, model_id: '1', opsi: [{ tier: 'Warna', opsi: 'Merah' }, { tier: 'Ukuran', opsi: 'S' }] }
    expect(varianLengkap([baru])).toBe(true)
    expect(namaTier([v, baru])).toEqual(['Warna', 'Ukuran'])
    expect(namaTier([v])).toEqual([])
    expect(labelVarian(baru)).toBe('Merah / S')
    expect(labelVarian(v)).toBe('Merah / S')
    expect(labelStatusVarian('MODEL_UNAVAILABLE')).toBe('Tidak tersedia')
    expect(labelStatusVarian('MODEL_NORMAL')).toBeNull()
    expect(teksBerat(1250)).toBe('1.25 kg')
    expect(teksBerat(null)).toBe('—')
  })
})
