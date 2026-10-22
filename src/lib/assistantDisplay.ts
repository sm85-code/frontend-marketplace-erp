export function aiMoney(value: string, rate?: string): string {
  const usd = Number(value), kurs = Number(rate)
  if (!Number.isFinite(usd)) return '—'
  if (!rate || !Number.isFinite(kurs) || kurs <= 0) return 'US$'+usd.toLocaleString('id-ID',{maximumFractionDigits:4})
  return 'Rp'+Math.round(usd*kurs).toLocaleString('id-ID')
}
export function aiIncomplete(status: string, answer: string): boolean {
  return status === 'partial' || (status === 'completed' && /^(Jawaban AI terpotong|Batas (konteks\/biaya pesan|langkah AI|tindakan pesan) tercapai)/.test(answer))
}

/** Only a definite client rejection allows a new operation ID. Transport/5xx
 * outcomes retain the original request so a committed turn cannot run twice. */
export function definiteRejection(error: unknown): boolean {
  const status = (error as {response?: {status?: number}})?.response?.status
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 408
}

export interface AssistantProduct { id: string; akun_id: string; item_id: string; nama: string; nama_toko: string; foto: string|null; url: string|null; harga_min: string|null; harga_max: string|null }
export function mentionedProducts(answer: string, actions: { tool: string; status: string; result: unknown }[]): AssistantProduct[] {
  const cards = new Map<string, AssistantProduct>()
  for (const action of actions) {
    if (action.tool !== 'cari_produk' || action.status !== 'succeeded' || !action.result || typeof action.result !== 'object') continue
    const items = (action.result as {items?: unknown}).items
    if (!Array.isArray(items)) continue
    for (const value of items) {
      if (!value || typeof value !== 'object') continue
      const r = value as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.nama !== 'string' || !r.nama) continue
      const item = String(r.item_id ?? '')
      const mentionedId = /^\d+$/.test(item) && new RegExp(`(^|\\D)${item}(\\D|$)`).test(answer)
      if (!mentionedId && !answer.toLocaleLowerCase().includes(r.nama.toLocaleLowerCase())) continue
      const rawUrl = typeof r.url_produk === 'string' ? r.url_produk : ''
      const url = /^https:\/\/shopee\.co\.id\/product\/[1-9]\d*\/[1-9]\d*$/.test(rawUrl) ? rawUrl : null
      let foto: string|null = null
      try { const parsed = new URL(String(r.foto_utama ?? '')); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) foto = parsed.href } catch { /* No usable catalogue photo. */ }
      cards.set(r.id, {id:r.id,akun_id:typeof r.akun_id==='string'?r.akun_id:'',item_id:item,nama:r.nama,nama_toko:typeof r.nama_toko==='string'?r.nama_toko:'',foto,url,harga_min:r.harga_min == null?null:String(r.harga_min),harga_max:r.harga_max == null?null:String(r.harga_max)})
    }
  }
  return [...cards.values()].slice(0, 6)
}

const MODEL_NAMES: Record<string,string> = {'claude-sonnet-5-5':'Sonnet 5.5','claude-opus-5-5':'Opus 5.5','claude-sonnet-4-6':'Sonnet 4.6','gpt-6.1-sol':'GPT-6.1 Sol','gpt-6-luna':'GPT-6 Luna','gpt-6-astra':'GPT-6 Astra','internal-v1':'Internal','internal-execution':'Internal'}
export const modelName = (m: string) => MODEL_NAMES[m] ?? m
export function compactTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  return n < 1000 ? String(n) : (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k'
}
export function usd(value: string | number): string {
  const v = Number(value)
  if (!Number.isFinite(v)) return '$—'
  return '$' + (v > 0 && v < 0.01 ? v.toFixed(3) : v.toFixed(2))
}
/** "Sonnet 5.5 · 3.2k/1.1k token · $0.04 (riset $0.02 · foto $0.10)": one muted line under each AI reply. */
export function turnUsage(turn: { model: string; input_tokens: number; output_tokens: number; cost_usd: string; actions: { tool: string; result: unknown }[] }): string {
  const extra = (tool: string) => turn.actions.filter(a => a.tool === tool).reduce((s, a) => s + (Number((a.result as {biaya_usd?: string} | null)?.biaya_usd) || 0), 0)
  const riset = extra('riset_web') + extra('kompetitor_shopee'), foto = extra('buat_gambar_produk')
  const parts = [riset > 0 && `riset ${usd(riset)}`, foto > 0 && `foto ${usd(foto)}`].filter(Boolean)
  const internal = turn.model.startsWith('internal')
  return `${modelName(turn.model)} · ${internal ? 'tanpa token' : `${compactTokens(turn.input_tokens)}/${compactTokens(turn.output_tokens)} token · ${usd(turn.cost_usd)}`}${parts.length ? ` (${parts.join(' · ')})` : ''}`
}

/** One friendly line per work-log step, e.g. "3 pesaing Shopee ditemukan". Raw data stays behind "detail teknis". */
export function stepSummary(a: { tool: string; status: string; result: unknown }): string {
  const r = (a.result && typeof a.result === 'object' ? a.result : {}) as Record<string, unknown>
  if (typeof r.error === 'string' && r.error) return r.error.length > 140 ? r.error.slice(0, 140) + '…' : r.error
  if (a.status === 'draft') return 'Menunggu persetujuan Anda'
  if (a.status !== 'succeeded') return ''
  const n = (v: unknown) => (Array.isArray(v) ? v.length : null)
  switch (a.tool) {
    case 'kompetitor_shopee': return `${n(r.pesaing) ?? 0} pesaing Shopee ditemukan`
    case 'riset_web': return `${n(r.sumber) ?? 0} sumber relevan`
    case 'buat_gambar_produk': return `${n(r.gambar_ids) ?? 0} foto dibuat`
    case 'buat_draf_produk': return 'Draf produk tersimpan (belum dipublikasikan)'
    case 'daftar_toko': return `${n(a.result) ?? 0} toko`
  }
  const items = n(r.items) ?? n(a.result)
  if (items !== null) return `${items} data dibaca`
  return 'Selesai'
}
