import { describe, expect, it } from 'vitest'
import type { KampanyeIklan } from '@/api/types'
import { aksiTersedia, anggaranTeks, saranKampanye, statusKampanye, totalKampanye } from '@/lib/iklanKampanye'

const dasar: KampanyeIklan = {
  campaign_id: '1', nama: 'A', jenis: 'manual', status: 'ongoing', bidding: 'manual', penempatan: 'search', anggaran: 50000,
  mulai: null, selesai: null, item_id: [], roas_target: null, kata_kunci: [], kinerja: null,
}
const kinerja = (o: Partial<NonNullable<KampanyeIklan['kinerja']>>) => ({
  impression: 5000, clicks: 100, expense: 50000, direct_order: 5, direct_gmv: 400000, roas: 8, ctr: 0.02, ...o,
})

describe('status dan aksi', () => {
  it('memberi label Indonesia dan menolak aksi yang tidak masuk akal', () => {
    expect(statusKampanye('ongoing').label).toBe('Berjalan')
    expect(statusKampanye('paused').label).toBe('Dijeda')
    expect(statusKampanye(null).label).toBe('—')
    expect(aksiTersedia('ongoing')).toMatchObject({ jeda: true, lanjut: false, hentikan: true, hapus: true })
    expect(aksiTersedia('paused')).toMatchObject({ jeda: false, lanjut: true })
    expect(aksiTersedia('ended')).toMatchObject({ jeda: false, lanjut: false, hentikan: false, hapus: true, ubahAnggaran: false })
    expect(aksiTersedia('deleted').hapus).toBe(false)
  })
  it('anggaran 0 berarti tanpa batas', () => {
    const fmt = (n: number) => `Rp ${n}`
    expect(anggaranTeks(0, fmt)).toBe('Tanpa batas')
    expect(anggaranTeks('25000', fmt)).toBe('Rp 25000')
    expect(anggaranTeks(null, fmt)).toBe('—')
  })
})

describe('saran otomatis', () => {
  it('tidak menilai kampanye tanpa data', () => {
    expect(saranKampanye(dasar)).toEqual([{ tingkat: 'info', teks: 'Belum ada data performa untuk periode ini.' }])
    expect(saranKampanye({ ...dasar, status: 'ended' })).toEqual([])
  })
  it('menandai klik banyak tanpa pesanan, ROAS di bawah 1, dan ROAS tipis', () => {
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ clicks: 40, direct_order: 0, roas: 0, direct_gmv: 0 }) })[0].tingkat).toBe('bahaya')
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ roas: 0.5, clicks: 10 }) })[0].teks).toContain('0.50×')
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ roas: 2, direct_order: 3 }) })[0].tingkat).toBe('peringatan')
  })
  it('tidak menghukum biaya kecil dan memuji ROAS tinggi yang punya cukup pesanan', () => {
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ expense: 5000, roas: 0.2, clicks: 5 }) })).toEqual([])
    expect(saranKampanye({ ...dasar, kinerja: kinerja({}) })[0].tingkat).toBe('baik')
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ direct_order: 1, roas: 9 }) })).toEqual([])
  })
  it('mengabarkan kampanye berjalan yang tidak tayang dan CTR rendah', () => {
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ impression: 0, clicks: 0, expense: 0, roas: null, ctr: null }) })[0].teks).toContain('tidak tayang')
    expect(saranKampanye({ ...dasar, kinerja: kinerja({ ctr: 0.004, roas: 4, direct_order: 2 }) }).map((s) => s.teks).join()).toContain('CTR')
  })
})

describe('total', () => {
  it('menjumlah biaya, GMV, pesanan dan menghitung ROAS', () => {
    const t = totalKampanye({ saldo: 1, hari: 7, catatan: [], kampanye: [
      { ...dasar, kinerja: kinerja({ expense: 10000, direct_gmv: 30000 }) },
      { ...dasar, campaign_id: '2', status: 'paused', kinerja: kinerja({ expense: 10000, direct_gmv: 10000, direct_order: 1 }) },
    ] })
    expect(t).toMatchObject({ jumlah: 2, berjalan: 1, biaya: 20000, gmv: 40000, pesanan: 6, roas: 2 })
    expect(totalKampanye(undefined)).toMatchObject({ jumlah: 0, roas: null })
  })
})

describe('menerapkan saran AI', () => {
  const dasarSaran = { campaign_id: '1', nama: 'A', nilai: null, kata: null, prioritas: 'sedang' as const, alasan: 'x' }
  const fmt = (n: number) => `Rp ${n}`
  it('memetakan setiap tindakan ke endpoint yang benar dan menolak yang datanya kurang', async () => {
    const { cara, labelTindakan } = await import('@/lib/iklanKampanye')
    expect(cara({ ...dasarSaran, tindakan: 'pause' })).toEqual({ jenis: 'aksi', payload: { aksi: 'pause' } })
    expect(cara({ ...dasarSaran, tindakan: 'change_budget', nilai: 70000 })).toEqual({ jenis: 'aksi', payload: { aksi: 'change_budget', budget: 70000 } })
    expect(cara({ ...dasarSaran, tindakan: 'change_roas_target', nilai: 5 })).toEqual({ jenis: 'aksi', payload: { aksi: 'change_roas_target', roas_target: 5 } })
    expect(cara({ ...dasarSaran, tindakan: 'hapus_kata_kunci', kata: 'kursi' })).toEqual({ jenis: 'kata', perubahan: [{ aksi: 'delete', kata: 'kursi' }] })
    expect(cara({ ...dasarSaran, tindakan: 'ubah_bid', kata: 'kursi', nilai: 300 })).toEqual({ jenis: 'kata', perubahan: [{ aksi: 'change_bid_price', kata: 'kursi', bid: 300 }] })
    expect(cara({ ...dasarSaran, tindakan: 'perhatikan' })).toBeNull()
    expect(cara({ ...dasarSaran, tindakan: 'change_budget' })).toBeNull()
    expect(cara({ ...dasarSaran, tindakan: 'ubah_bid', kata: 'kursi' })).toBeNull()
    expect(labelTindakan({ ...dasarSaran, tindakan: 'change_budget', nilai: 70000 }, fmt)).toBe('Ubah anggaran harian menjadi Rp 70000')
    expect(labelTindakan({ ...dasarSaran, tindakan: 'hapus_kata_kunci', kata: 'kursi' }, fmt)).toBe('Hapus kata kunci "kursi"')
  })
})
