import { describe, expect, it } from 'vitest'
import { nomorPesanan, platformPesanan } from './identitasPesanan'

describe('Identitas pesanan EasyBoss', () => {
  it('menampilkan nomor sumber tanpa mengganti ID internal', () => {
    const p = { id_eksternal: 'EB-internal-hash', nomor_pesanan_asli: '586921368363304202' }
    expect(nomorPesanan(p)).toBe('586921368363304202')
    expect(p.id_eksternal).toBe('EB-internal-hash')
  })
  it('menampilkan platform sumber dan mempertahankan fallback pesanan biasa', () => {
    expect(platformPesanan({ platform: 'shopee', platform_sumber: 'tiktokshop' })).toBe('TikTok Shop')
    expect(nomorPesanan({ id_eksternal: 'MANUAL-001' })).toBe('MANUAL-001')
    expect(platformPesanan({ platform: 'shopee' })).toBe('Shopee')
  })
})

import { labelStatus } from './pesanan'

it('menampilkan status sumber tanpa mengubah status operasional', () => {
  const p = { status: 'to_ship' as const, status_marketplace: null, label_status_sumber: 'Menunggu Penyerahan ke Kurir' }
  expect(labelStatus(p)).toBe('Menunggu Penyerahan ke Kurir')
  expect(p.status).toBe('to_ship')
})
