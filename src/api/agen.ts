import api from './client'
export const JENIS = ['anggaran', 'roas', 'jeda', 'lanjut', 'bid', 'kata_kunci', 'kata_negatif'] as const
export type Jenis = typeof JENIS[number]
export type Json = Record<string, unknown>
export interface Batas { anggaran_harian_maks: number | null; maks_persen_perubahan: number; maks_cpc: number | null; min_hari_antar_perubahan: number; otonomi: boolean }
export const BATAS_AWAL: Batas = { anggaran_harian_maks: null, maks_persen_perubahan: 20, maks_cpc: null, min_hari_antar_perubahan: 0, otonomi: false }
export interface Stop { lingkup: string; aktif: boolean; alasan: string; oleh: string | null }
export interface Kata { aksi: string; kata: string; bid?: number | null; tipe?: string | null }
export interface Aksi { jenis: Jenis; campaign_id: number; nilai?: number; kata?: string; kata_kunci?: Kata[]; alasan: string }
export interface Hasil { kering: boolean; diterapkan: boolean; butuh_persetujuan: boolean; jenis: string; campaign_id: string; sebelum: Json; sesudah: Json; audit_id: string; diulang?: boolean }
export interface Audit { id: string; akun_id: string | null; kampanye_id: string | null; aksi: string; pelaku_id: string | null; pelaku_nama: string; sebelum: Json; sesudah: Json; alasan: string; request_id: string | null; persetujuan: string | null; kering: boolean; hasil: string; dibuat_at: string }
export interface Jadwal { campaign_id: string; jam: number[]; aktif: boolean; dijeda_jadwal: boolean }
export interface JadwalIn { campaign_id: number; jam: number[]; aktif: boolean }
export interface Ringkasan extends Json { akun_id: string; nama_toko: string; saldo: number | null; kampanye: Json[]; produk: { item_id: string; nama: string | null; harga: number | null }[]; catatan: string[] }
export type Kiriman = (Aksi | { alasan: string }) & { kering: boolean; persetujuan?: 'ya'; request_id: string }
const toko = (id: string) => `/akun/${encodeURIComponent(id)}/iklan/agen`
const lingkup = (id?: string) => id ? toko(id) : '/iklan/agen'
export const agenApi = {
  stop: (id?: string) => api.get<Stop>(`${lingkup(id)}/stop`).then(r => r.data),
  simpanStop: (id: string | undefined, body: { aktif: boolean; alasan: string; request_id: string }) => api.put<Stop>(`${lingkup(id)}/stop`, body).then(r => r.data),
  batas: (id: string) => api.get<Batas>(`${toko(id)}/batas`).then(r => r.data),
  simpanBatas: (id: string, body: Batas & { alasan: string; request_id: string }) => api.put<Batas>(`${toko(id)}/batas`, {
    anggaran_harian_maks: body.anggaran_harian_maks,
    maks_persen_perubahan: body.maks_persen_perubahan,
    maks_cpc: body.maks_cpc,
    min_hari_antar_perubahan: body.min_hari_antar_perubahan,
    otonomi: body.otonomi,
    alasan: body.alasan,
    request_id: body.request_id,
  }).then(r => r.data),
  audit: (id?: string) => api.get<{ items: Audit[] }>('/iklan/agen/audit', { params: { akun_id: id || undefined, limit: 100 } }).then(r => r.data),
  jadwal: (id: string) => api.get<{ items: Jadwal[]; loop_detik: number }>(`${toko(id)}/jadwal`).then(r => r.data),
  simpanJadwal: (id: string, body: JadwalIn) => api.put<Jadwal>(`${toko(id)}/jadwal`, body).then(r => r.data),
  ringkasan: (id: string) => api.get<Ringkasan>(`${toko(id)}/ringkasan`).then(r => r.data),
  tren: (id: string, item: string) => api.get<Json>(`${toko(id)}/produk/${encodeURIComponent(item)}/tren`).then(r => r.data),
  kirim: (id: string, body: Kiriman, audit?: string) => api.post<Hasil>(audit ? `${toko(id)}/audit/${encodeURIComponent(audit)}/kembalikan` : `${toko(id)}/aksi`, body).then(r => r.data),
}
export type AgenApi = typeof agenApi
