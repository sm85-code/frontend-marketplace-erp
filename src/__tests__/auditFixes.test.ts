import { describe, expect, it } from 'vitest'
import { hariLalu, laporanKosong } from '@/pages/iklan/GmvMax'
import { alasanTanpaEstimasi } from '@/pages/settlement/PendapatanShopee'

describe('GMV Max report defaults', () => {
  it('defaults to a 7-day window ending yesterday (Shopee rejects start = end)', () => {
    expect(hariLalu(7) < hariLalu(1)).toBe(true)
    expect(hariLalu(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('treats an answer without figures as empty', () => {
    expect(laporanKosong({ campaign_id: '1', report: {} })).toBe(true)
    expect(laporanKosong({ campaign_id: '1', report: { expense: 0, broad_gmv: null } })).toBe(true)
    expect(laporanKosong({ campaign_id: '1', report: { expense: 1000 } })).toBe(false)
    expect(laporanKosong({ campaign_id: '1', result_list: [] })).toBe(true)
  })
})

describe('Menunggu Pencairan', () => {
  it('explains a missing estimated payout date', () => {
    expect(alasanTanpaEstimasi(true)).toBe('Shopee tidak mengirim estimasi')
    expect(alasanTanpaEstimasi(false)).toBe('Belum ada di daftar Shopee')
  })
})
