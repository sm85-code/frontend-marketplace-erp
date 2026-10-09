export function aiMoney(value: string, rate?: string): string {
  const usd = Number(value), kurs = Number(rate)
  if (!Number.isFinite(usd)) return '—'
  if (!rate || !Number.isFinite(kurs) || kurs <= 0) return 'US$'+usd.toLocaleString('id-ID',{maximumFractionDigits:4})
  return 'Rp'+Math.round(usd*kurs).toLocaleString('id-ID')
}
export function aiIncomplete(status: string, answer: string): boolean {
  return status === 'partial' || (status === 'completed' && /^(Jawaban AI terpotong|Batas (konteks\/biaya pesan|langkah AI|tindakan pesan) tercapai)/.test(answer))
}
