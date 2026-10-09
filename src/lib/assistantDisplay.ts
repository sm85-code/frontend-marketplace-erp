export function aiMoney(value: string, rate?: string): string {
  const usd = Number(value), kurs = Number(rate)
  if (!Number.isFinite(usd)) return '—'
  if (!rate || !Number.isFinite(kurs) || kurs <= 0) return 'US$'+usd.toLocaleString('id-ID',{maximumFractionDigits:4})
  return 'Rp'+Math.round(usd*kurs).toLocaleString('id-ID')
}
export function aiIncomplete(status: string, answer: string): boolean {
  return status === 'partial' || (status === 'completed' && /^(Jawaban AI terpotong|Batas (konteks\/biaya pesan|langkah AI|tindakan pesan) tercapai)/.test(answer))
}

export interface AssistantProduct { id: string; item_id: string; nama: string; nama_toko: string; foto: string|null; url: string|null; harga_min: string|null; harga_max: string|null }
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
      cards.set(r.id, {id:r.id,item_id:item,nama:r.nama,nama_toko:typeof r.nama_toko==='string'?r.nama_toko:'',foto,url,harga_min:r.harga_min == null?null:String(r.harga_min),harga_max:r.harga_max == null?null:String(r.harga_max)})
    }
  }
  return [...cards.values()].slice(0, 6)
}
