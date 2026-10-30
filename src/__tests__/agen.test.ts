import { beforeEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/api/client', () => ({ default: http }))
import { agenApi, BATAS_AWAL, JENIS, type Hasil } from '@/api/agen'
import { AKSI_AWAL, AlurAgen, angka, susunAksi } from '@/lib/agen'
const hasil: Hasil = { kering: true, diterapkan: false, butuh_persetujuan: true, jenis: 'anggaran', campaign_id: '7', sebelum: { anggaran: 50000 }, sesudah: { anggaran: 55000 }, audit_id: 'dry' }
beforeEach(() => { vi.clearAllMocks(); http.get.mockResolvedValue({ data: {} }); http.put.mockResolvedValue({ data: {} }); http.post.mockResolvedValue({ data: hasil }) })
describe('kontrak snapshot 5f86f7ee', () => {
  it('GET/PUT STOP global/toko; full replacement batas; audit limit 100', async () => {
    await agenApi.stop(); expect(http.get).toHaveBeenLastCalledWith('/iklan/agen/stop')
    await agenApi.stop('toko/a'); expect(http.get).toHaveBeenLastCalledWith('/akun/toko%2Fa/iklan/agen/stop')
    const stop = { aktif: true, alasan: 'darurat', request_id: 's' }
    await agenApi.simpanStop(undefined, stop); expect(http.put).toHaveBeenLastCalledWith('/iklan/agen/stop', stop)
    await agenApi.simpanStop('a', stop); expect(http.put).toHaveBeenLastCalledWith('/akun/a/iklan/agen/stop', stop)
    await agenApi.batas('a'); expect(http.get).toHaveBeenLastCalledWith('/akun/a/iklan/agen/batas')
    const body = { ...BATAS_AWAL, alasan: 'reset', request_id: 'b' }
    await agenApi.simpanBatas('a', body); expect(http.put).toHaveBeenLastCalledWith('/akun/a/iklan/agen/batas', body)
    expect(body.otonomi).toBe(false); expect(Object.keys(body)).toHaveLength(7)
    await agenApi.audit(); expect(http.get).toHaveBeenLastCalledWith('/iklan/agen/audit', { params: { akun_id: undefined, limit: 100 } })
    await agenApi.audit('a'); expect(http.get).toHaveBeenLastCalledWith('/iklan/agen/audit', { params: { akun_id: 'a', limit: 100 } })
  })
  it('strips response-only keys from full replacement batas (backend extra=forbid)', async () => {
    const response = { ...BATAS_AWAL, akun_id: 'a', tersimpan: true }
    http.get.mockResolvedValueOnce({ data: response })
    const loaded = await agenApi.batas('a')
    await agenApi.simpanBatas('a', { ...loaded, alasan: 'uji', request_id: 'batas-1' })
    expect(http.put).toHaveBeenLastCalledWith('/akun/a/iklan/agen/batas', { ...BATAS_AWAL, alasan: 'uji', request_id: 'batas-1' })
    expect(http.put.mock.calls[0][1]).not.toHaveProperty('akun_id')
    expect(http.put.mock.calls[0][1]).not.toHaveProperty('tersimpan')
  })
  it('jadwal campaign_id/jam/aktif, ringkasan and tren only GET', async () => {
    await agenApi.jadwal('a'); expect(http.get).toHaveBeenLastCalledWith('/akun/a/iklan/agen/jadwal')
    const body = { campaign_id: 7, jam: [9, 10], aktif: false }
    await agenApi.simpanJadwal('a', body); expect(http.put).toHaveBeenLastCalledWith('/akun/a/iklan/agen/jadwal', body)
    await agenApi.ringkasan('a'); expect(http.get).toHaveBeenLastCalledWith('/akun/a/iklan/agen/ringkasan')
    await agenApi.tren('a', '9'); expect(http.get).toHaveBeenLastCalledWith('/akun/a/iklan/agen/produk/9/tren')
    expect(http.post).not.toHaveBeenCalled()
  })
  it.each(JENIS)('%s must dry-run, then explicit approval with separate request_id', async jenis => {
    const flow = new AlurAgen()
    const body = susunAksi({ ...AKSI_AWAL, jenis, campaign: '7', nilai: '330', kata: 'kursi', perubahan: jenis === 'kata_negatif' ? '[{"aksi":"tambah","kata":"kursi"}]' : AKSI_AWAL.perubahan })
    await expect(flow.terapkan('a', true, agenApi.kirim)).rejects.toThrow()
    await flow.kering('a', body, undefined, agenApi.kirim)
    const dry = http.post.mock.calls[0][1]
    expect(dry).toMatchObject({ ...body, kering: true }); expect(dry.persetujuan).toBeUndefined()
    await expect(flow.terapkan('a', false, agenApi.kirim)).rejects.toThrow()
    await flow.terapkan('a', true, agenApi.kirim)
    expect(http.post.mock.calls[1][0]).toBe('/akun/a/iklan/agen/aksi')
    expect(http.post.mock.calls[1][1]).toMatchObject({ ...body, kering: false, persetujuan: 'ya' })
    expect(http.post.mock.calls[1][1].request_id).not.toBe(dry.request_id)
    await expect(flow.terapkan('a', true, agenApi.kirim)).rejects.toThrow()
  })
  it('rollback follows identical two-step protocol and exact endpoint/body', async () => {
    const flow = new AlurAgen()
    await flow.kering('a', { alasan: 'salah' }, 'audit/a', agenApi.kirim)
    await flow.terapkan('a', true, agenApi.kirim)
    expect(http.post.mock.calls.map(c => c[0])).toEqual(['/akun/a/iklan/agen/audit/audit%2Fa/kembalikan', '/akun/a/iklan/agen/audit/audit%2Fa/kembalikan'])
    expect(Object.keys(http.post.mock.calls[0][1]).sort()).toEqual(['alasan', 'kering', 'request_id'])
    expect(http.post.mock.calls[1][1]).toMatchObject({ alasan: 'salah', kering: false, persetujuan: 'ya' })
  })
})
describe('preview safety', () => {
  it('invalidates preview on edit or shop change; ignores delayed responses', async () => {
    const flow = new AlurAgen(); const body = susunAksi({ ...AKSI_AWAL, campaign: '7', nilai: '55000' })
    let resolve!: (h: Hasil) => void
    const send = vi.fn(() => new Promise<Hasil>(r => { resolve = r }))
    const pending = flow.kering('a', body, undefined, send)
    flow.invalidate(); resolve(hasil)
    expect(await pending).toBeUndefined()
    await expect(flow.terapkan('a', true, send)).rejects.toThrow()
    await flow.kering('a', body, undefined, agenApi.kirim)
    await expect(flow.terapkan('b', true, agenApi.kirim)).rejects.toThrow()
    flow.invalidate(); await expect(flow.terapkan('a', true, agenApi.kirim)).rejects.toThrow()
  })
  it.each([{ ...hasil, kering: false }, { ...hasil, diterapkan: true }, { ...hasil, diulang: true }])('rejects unsafe response %#', async h => {
    const flow = new AlurAgen()
    await expect(flow.kering('a', { alasan: '' }, undefined, vi.fn().mockResolvedValue(h))).rejects.toThrow()
    await expect(flow.terapkan('a', true, agenApi.kirim)).rejects.toThrow()
  })
  it('errors never grant approval; consumed previews cannot retry real writes', async () => {
    const flow = new AlurAgen(); const send = vi.fn().mockRejectedValue(new Error('409 STOP'))
    await expect(flow.kering('a', { alasan: '' }, undefined, send)).rejects.toThrow('STOP')
    await expect(flow.terapkan('a', true, send)).rejects.toThrow()
    await flow.kering('a', { alasan: '' }, undefined, agenApi.kirim)
    await expect(flow.terapkan('a', true, send)).rejects.toThrow('STOP')
    await expect(flow.terapkan('a', true, send)).rejects.toThrow('konfirmasi')
  })
  it('validates numbers and keyword schema', () => {
    for (const s of ['', 'NaN', 'Infinity', '-1']) expect(() => angka(s, 'x', 0)).toThrow()
    expect(() => angka('1.1', 'x', 1, 100, true)).toThrow()
    for (const perubahan of ['{}', '[]', '[{"aksi":"tambah","kata":"x"}]', '[{"aksi":"add","kata":"x"}]', '[{"aksi":"add","kata":"x","bid":1,"extra":true}]']) expect(() => susunAksi({ ...AKSI_AWAL, jenis: 'kata_kunci', campaign: '7', perubahan })).toThrow()
    expect(susunAksi({ ...AKSI_AWAL, jenis: 'jeda', campaign: '7' })).toEqual({ jenis: 'jeda', campaign_id: 7, alasan: '' })
  })
})
