import { describe, expect, it, vi } from 'vitest'
import type { OpsiMetodePengiriman, PengaturanPengiriman } from '@/api/types'
import { awalPengiriman, galatPengiriman, prosesBatchPengiriman } from '@/lib/pengiriman'
import { labelStatus, labelProses } from '@/lib/pesanan'
const pickup: OpsiMetodePengiriman = {
  metode: 'pickup', tersedia: true, alasan: null, wajib: ['address_id', 'pickup_time_id'], nama_pengirim: 'Toko', cabang: [],
  alamat: [
    { address_id: 1, label: 'A', rekomendasi: false, jadwal: [{ pickup_time_id: 'a', label: 'A', rekomendasi: false }] },
    { address_id: 2, label: 'B', rekomendasi: true, jadwal: [{ pickup_time_id: 'b', label: 'B', rekomendasi: true }] },
  ],
}
const dropoff: OpsiMetodePengiriman = {
  metode: 'dropoff', tersedia: true, alasan: null, wajib: [], nama_pengirim: 'Toko', alamat: [], cabang: [],
}
describe('shipping options', () => {
  it('defaults to the recommended address and its own time slot', () => {
    expect(awalPengiriman(pickup)).toEqual({ metode: 'pickup', address_id: 2, pickup_time_id: 'b' })
    expect(galatPengiriman(pickup, { metode: 'pickup', address_id: 1, pickup_time_id: 'b' })).toContain('jadwal')
  })
  it('skips a recommended address without usable time slots', () => {
    const opsi = { ...pickup, alamat: [pickup.alamat[0], { ...pickup.alamat[1], jadwal: [] }] }
    expect(awalPengiriman(opsi)).toEqual({ metode: 'pickup', address_id: 1, pickup_time_id: 'a' })
  })
  it('supports Drop Off with no required fields', () => {
    expect(awalPengiriman(dropoff)).toEqual({ metode: 'dropoff' })
    expect(galatPengiriman(dropoff, { metode: 'dropoff' })).toBeNull()
  })
  it('requires a valid branch and nonempty sender when Shopee requests them', () => {
    const o = { ...dropoff, wajib: ['branch_id', 'sender_real_name'], cabang: [{ branch_id: 77, label: 'Gerai' }] }
    expect(galatPengiriman(o, { metode: 'dropoff', branch_id: 99, sender_real_name: 'A' })).toContain('cabang')
    expect(galatPengiriman(o, { metode: 'dropoff', branch_id: 77, sender_real_name: ' ' })).toContain('pengirim')
  })
  it('cannot submit an unavailable method', () => {
    expect(galatPengiriman({ ...dropoff, tersedia: false, alasan: 'Tidak didukung' }, { metode: 'dropoff' })).toBe('Tidak didukung')
  })
  it('labels processed orders according to the actual method', () => {
    const p = { status: 'to_ship' as const, status_marketplace: 'PROCESSED' }
    expect(labelStatus({ ...p, metode_pengiriman: 'dropoff' })).toBe('Drop Off · Menunggu Penyerahan ke Gerai')
    expect(labelStatus({ ...p, metode_pengiriman: 'pickup' })).toBe('Pickup · Menunggu Penjemputan Kurir')
    expect(labelStatus(p)).toBe('Menunggu Penyerahan · Metode belum diketahui')
  })
  it('offers a dedicated retry pickup action and status', () => {
    const p = { status: 'to_ship' as const, status_marketplace: 'RETRY_SHIP' }
    expect(labelStatus(p)).toBe('Perlu Jadwal Ulang Pickup')
    expect(labelProses(p)).toBe('Jadwalkan Ulang Pickup')
    expect(labelProses({ status_marketplace: 'READY_TO_SHIP' })).toBe('Proses Pesanan')
  })
})
describe('bulk shipping', () => {
  const ids = Array.from({ length: 25 }, (_, i) => String(i))
  const settings: Record<string, PengaturanPengiriman> = Object.fromEntries(ids.map((id) => [id, { metode: 'dropoff' }]))
  it('sends only settings belonging to each chunk and reports partial results', async () => {
    const submit = vi.fn(async (batch: string[], selected: Record<string, PengaturanPengiriman>) => {
      expect(Object.keys(selected)).toEqual(batch)
      const hasil = batch.map((id) => ({ id, id_eksternal: id, ok: id !== '1', pesan: null }))
      return { berhasil: hasil.filter((h) => h.ok).length, gagal: hasil.filter((h) => !h.ok).length, hasil }
    })
    const res = await prosesBatchPengiriman(ids, settings, submit)
    expect(submit.mock.calls.map(([batch]) => batch.length)).toEqual([10, 10, 5])
    expect(res.berhasil).toBe(24)
    expect(res.gagal).toBe(1)
  })
  it('preserves earlier successes, stops on timeout, and never retries uncertain orders', async () => {
    const submit = vi.fn(async (batch: string[]) => {
      if (batch[0] === '10') throw new Error('timeout')
      return { berhasil: batch.length, gagal: 0, hasil: batch.map((id) => ({ id, id_eksternal: id, ok: true, pesan: null })) }
    })
    const res = await prosesBatchPengiriman(ids, settings, submit)
    expect(submit).toHaveBeenCalledTimes(2)
    expect(res.berhasil).toBe(10)
    expect(res.gagal).toBe(15)
    expect(res.hasil.find((h) => h.id === '10')?.pesan).toContain('belum pasti')
    expect(res.hasil.find((h) => h.id === '20')?.pesan).toContain('Belum diproses')
  })
  it.each([403, 409, 422, 424])('preserves a known HTTP %s rejection instead of calling it a timeout', async (status) => {
    const submit = vi.fn().mockRejectedValue({ response: { status, data: { detail: 'Pengaturan ditolak: alamat tidak tersedia' } } })
    const res = await prosesBatchPengiriman(ids, settings, submit)
    expect(submit).toHaveBeenCalledOnce()
    expect(res.hasil[0].pesan).toBe('Pengaturan ditolak: alamat tidak tersedia')
    expect(res.hasil[10].pesan).toContain('Belum diproses')
  })
})
