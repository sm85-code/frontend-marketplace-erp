import { describe, expect, it } from 'vitest'
import { publishDefaults, publishMessage } from '@/lib/publishToko'

const produk = { id: '1', nama: 'Kopi', harga: '50000', stok: 3, aktif: true }

describe('publishMessage', () => {
  it('says created vs updated and mentions the photo only when copied', () => {
    expect(publishMessage({ dibuat: true, foto_disalin: true, produk })).toBe('Ditambahkan ke toko, foto disalin')
    expect(publishMessage({ dibuat: false, foto_disalin: false, produk })).toBe('Diperbarui di toko')
  })
})

describe('publishDefaults', () => {
  it('starts from the ERP price and stock, active, copying the photo', () => {
    expect(publishDefaults({ harga_dasar: '50000.00', stok: 7 })).toEqual({
      harga: '50000.00',
      stok: '7',
      aktif: true,
      salinFoto: true,
    })
  })
})
