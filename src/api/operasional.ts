import api from '@/api/client'

export type JenisOperasional = 'umum' | 'packing' | 'supplier' | 'tukang'

export interface TransaksiOperasional {
  id: string
  kategori: string
  tanggal: string
  uraian: string
  /** Decimal as text, e.g. "1500000.00". */
  jumlah: string
}

export interface OperasionalDaftar {
  jenis: JenisOperasional
  periode: string
  kategori: { id: string; label: string; aktif?: boolean }[]
  items: TransaksiOperasional[]
  ringkasan: { per_kategori: Record<string, string>; total: string }
  /** Whether the signed-in role may add, change and delete on this page. */
  bisa_tulis: boolean
  /** Belanja Supplier / Tukang: the Supplier / Tukang Kayu list; baris_arus_kas is the linked Arus Kas row name ('' = by name). */
  pihak?: PihakOperasional[]
}

export interface PihakOperasional { id: string; nama: string; baris_arus_kas: string }

export interface IsianOperasional {
  kategori: string
  tanggal: string
  uraian: string
  jumlah: string
}

export const daftarOperasional = (jenis: JenisOperasional, periode: string) =>
  api.get<OperasionalDaftar>(`/operasional/${jenis}`, { params: { periode } }).then((r) => r.data)
export const tambahOperasional = (jenis: JenisOperasional, isian: IsianOperasional) =>
  api.post<TransaksiOperasional>(`/operasional/${jenis}`, isian).then((r) => r.data)
export const ubahOperasional = (jenis: JenisOperasional, id: string, isian: IsianOperasional) =>
  api.put<TransaksiOperasional>(`/operasional/${jenis}/${id}`, isian).then((r) => r.data)
export const hapusOperasional = (jenis: JenisOperasional, id: string) => api.delete(`/operasional/${jenis}/${id}`).then((r) => r.data)
export const simpanPihak = (jenis: JenisOperasional, id: string, baris_arus_kas: string) =>
  api.put(`/operasional/${jenis}/pihak/${encodeURIComponent(id)}`, { baris_arus_kas }).then((r) => r.data)
