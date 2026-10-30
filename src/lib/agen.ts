import { JENIS, type Aksi, type Hasil, type Kiriman } from '@/api/agen'
export function requestId() { return crypto.randomUUID() }
export function angka(teks: string, nama: string, min = 0, max = Number.MAX_SAFE_INTEGER, bulat = false) {
  const n = Number(teks)
  if (!teks.trim() || !Number.isFinite(n) || n < min || n > max || (bulat && !Number.isSafeInteger(n))) throw new Error(`${nama} tidak valid`)
  return n
}
export interface FormAksi { jenis: Aksi['jenis']; campaign: string; nilai: string; kata: string; perubahan: string; alasan: string }
export const AKSI_AWAL: FormAksi = { jenis: 'anggaran', campaign: '', nilai: '', kata: '', perubahan: '[{"aksi":"add","kata":"kursi","bid":300,"tipe":"broad"}]', alasan: '' }
export function susunAksi(f: FormAksi): Aksi {
  if (!JENIS.includes(f.jenis)) throw new Error('Jenis tidak valid')
  if (f.alasan.length > 500) throw new Error('Alasan maksimal 500 karakter')
  const body: Aksi = { jenis: f.jenis, campaign_id: angka(f.campaign, 'Kampanye', 1, Number.MAX_SAFE_INTEGER, true), alasan: f.alasan }
  if (['anggaran', 'roas', 'bid'].includes(f.jenis)) body.nilai = angka(f.nilai, 'Nilai', 0)
  if (f.jenis === 'bid') { if (!f.kata.trim() || f.kata.length > 80) throw new Error('Kata wajib 1–80 karakter'); body.kata = f.kata }
  if (['kata_kunci', 'kata_negatif'].includes(f.jenis)) {
    const rows: unknown = JSON.parse(f.perubahan)
    if (!Array.isArray(rows) || !rows.length) throw new Error('Daftar kata wajib diisi')
    body.kata_kunci = rows.map(row => {
      if (!row || typeof row !== 'object' || Object.keys(row).some(k => !['aksi', 'kata', 'bid', 'tipe'].includes(k))) throw new Error('Kolom kata tidak valid')
      const r = row as Record<string, unknown>
      const allowed = f.jenis === 'kata_negatif' ? ['tambah', 'hapus'] : ['add', 'delete', 'restore', 'change_bid_price']
      if (!allowed.includes(String(r.aksi)) || typeof r.kata !== 'string' || !r.kata.trim() || r.kata.length > 80) throw new Error('Aksi/kata tidak valid')
      if (r.bid != null && (typeof r.bid !== 'number' || !Number.isFinite(r.bid) || r.bid < 0)) throw new Error('Bid tidak valid')
      if (['add', 'change_bid_price'].includes(String(r.aksi)) && r.bid == null) throw new Error('Bid wajib')
      if (r.tipe != null && !['broad', 'exact'].includes(String(r.tipe))) throw new Error('Tipe harus broad atau exact')
      return { aksi: String(r.aksi), kata: r.kata, ...(r.bid == null ? {} : { bid: Number(r.bid) }), ...(r.tipe == null ? {} : { tipe: String(r.tipe) }) }
    })
  }
  return body
}
/** A revision guards even responses that arrive after an edit, shop change or unmount. */
export class AlurAgen {
  private revision = 0
  private preview?: { id: string; body: Aksi | { alasan: string }; audit?: string; hasil: Hasil }
  invalidate() { this.revision++; this.preview = undefined }
  async kering(id: string, body: Aksi | { alasan: string }, audit: string | undefined, kirim: (id: string, body: Kiriman, audit?: string) => Promise<Hasil>) {
    this.invalidate(); const rev = this.revision
    const hasil = await kirim(id, { ...body, kering: true, request_id: requestId() }, audit)
    if (rev !== this.revision) return undefined
    if (hasil.kering !== true || hasil.diterapkan !== false || hasil.diulang) throw new Error('Respons preview tidak valid; ulangi simulasi')
    this.preview = { id, body: structuredClone(body), audit, hasil }
    return hasil
  }
  async terapkan(id: string, konfirmasi: boolean, kirim: (id: string, body: Kiriman, audit?: string) => Promise<Hasil>) {
    const p = this.preview
    if (!konfirmasi || !p || p.id !== id) throw new Error('Simulasi dan konfirmasi baru wajib')
    this.invalidate()
    return kirim(id, { ...p.body, kering: false, persetujuan: 'ya', request_id: requestId() }, p.audit)
  }
}
