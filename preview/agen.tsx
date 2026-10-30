import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AgenView } from '../src/pages/iklan/Agen'
import { BATAS_AWAL, type AgenApi, type Audit, type Batas, type Jadwal, type Stop } from '../src/api/agen'
import '../src/index.css'
// No Axios/fetch adapters. Every method is in-memory; CSP also forbids all connections.
const stops = new Map<string, Stop>()
let batas: Batas = { ...BATAS_AWAL }
const schedules: Jadwal[] = [{ campaign_id: '7', jam: [9, 10, 11, 15], aktif: true, dijeda_jadwal: true }, { campaign_id: '8', jam: [8, 16], aktif: false, dijeda_jadwal: false }]
const audit: Audit[] = [{ id: 'contoh-audit', akun_id: 'demo', kampanye_id: '7', aksi: 'anggaran', pelaku_id: 'demo-owner', pelaku_nama: 'Pemilik Demo', sebelum: { anggaran: 50000 }, sesudah: { anggaran: 55000 }, alasan: 'Contoh data sintetis', request_id: 'contoh-request', persetujuan: 'ya', kering: false, hasil: 'diterapkan', dibuat_at: '2026-10-30T10:00:00Z' }]
const api: AgenApi = {
  stop: async id => stops.get(id ?? 'global') ?? { lingkup: id ? 'toko' : 'global', aktif: false, alasan: '', oleh: null },
  simpanStop: async (id, body) => { const s = { lingkup: id ? 'toko' : 'global', aktif: body.aktif, alasan: body.alasan, oleh: 'Pemilik Demo' }; stops.set(id ?? 'global', s); return s },
  batas: async () => batas, simpanBatas: async (_, b) => { batas = b; return b },
  jadwal: async () => ({ items: schedules, loop_detik: 0 }),
  simpanJadwal: async (_, b) => { const row = { ...b, campaign_id: String(b.campaign_id), dijeda_jadwal: false }; const i = schedules.findIndex(s => s.campaign_id === row.campaign_id); if (i >= 0) schedules[i] = row; else schedules.push(row); return row },
  audit: async id => ({ items: audit.filter(a => !id || a.akun_id === id) }),
  ringkasan: async id => ({ akun_id: id, nama_toko: 'Toko Demo', saldo: 250000, hari: 7, pengaturan_toko: { campaign_surge: false, auto_top_up: false, saklar: {} }, tarif: {}, kampanye: [{ campaign_id: '7', nama: 'Kursi Rotan', jenis: 'manual', status: 'ongoing', anggaran: 50000, roas_target: 4, item_id: ['9'], kata_kunci: [{ kata: 'kursi', bid: 300, tipe: 'broad', status: 'normal' }], kata_negatif: ['gratis'], kinerja: { clicks: 100, expense: 50000, direct_order: 5, direct_gmv: 200000, roas: 4 } }], produk: [{ item_id: '9', nama: 'Kursi Rotan', harga: 250000 }], performa_jam: [{ hour: 9, clicks: 10, expense: 5000 }], dipotong: { kampanye: false, kata_kunci: 0, produk: false }, catatan: ['Seluruh data sintetis. Tidak terhubung ke toko mana pun.'], api_usang: ['buat_otomatis', 'ubah_otomatis'] }),
  tren: async (id, item) => ({ akun_id: id, item_id: item, tanggal: '2026-10-30', terjual_7: 4, terjual_28: 14, kecepatan_7: 0.57, kecepatan_28: 0.5, views: 100, views_delta_7: 60, views_delta_28: null, likes: 3, sold_kumulatif: 80, rating: 4.5, diagnosis: { tingkat: 2, masalah: 1 } }),
  kirim: async (id, b, source) => {
    const before = { campaign_id: '7', anggaran: 50000, roas_target: 4, status: 'ongoing', kata: [{ kata: 'kursi', bid: 300 }] }
    const after = source ? { ...before, anggaran: 50000 } : { ...before, ...('nilai' in b ? b.jenis === 'anggaran' ? { anggaran: b.nilai } : b.jenis === 'roas' ? { roas_target: b.nilai } : { bid: b.nilai } : {}), ...('jenis' in b && b.jenis === 'jeda' ? { status: 'paused' } : {}), ...('kata_kunci' in b ? { perubahan: b.kata_kunci } : {}) }
    const h = { kering: b.kering, diterapkan: !b.kering, butuh_persetujuan: b.kering, jenis: source ? 'kembalikan' : 'jenis' in b ? b.jenis : '', campaign_id: '7', sebelum: before, sesudah: after, audit_id: `mock-${audit.length}` }
    audit.unshift({ id: h.audit_id, akun_id: id, kampanye_id: '7', aksi: h.jenis, pelaku_id: 'demo-owner', pelaku_nama: 'Pemilik Demo', sebelum: before, sesudah: h, alasan: b.alasan, request_id: b.request_id, persetujuan: b.persetujuan ?? null, kering: b.kering, hasil: b.kering ? 'kering' : 'diterapkan', dibuat_at: '2026-10-30T10:00:00Z' })
    return h
  },
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-8"><h1 className="text-2xl font-bold">Agen Iklan</h1><p className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-black">MOCK OFFLINE — semua data sintetis; perubahan hanya di memori. Tidak ada jadwal atau otonomi nyata.</p><AgenView api={api} toko={[{ id: 'demo', nama: 'Toko Demo' }, { id: 'kedua', nama: 'Toko Kedua' }]} baca tulis /></main></QueryClientProvider>)
