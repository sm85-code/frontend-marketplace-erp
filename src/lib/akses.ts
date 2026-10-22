import type { AksesSaya, Tingkat } from '@/api/types'

export type { AksesSaya, Tingkat }

/** Whether a role reaches a page at the level asked ("baca" is also true for "tulis"). Page "*" is open to everybody signed in. */
export function bisa(akses: AksesSaya | null | undefined, halaman: string, perlu: Tingkat = 'baca'): boolean {
  if (!akses) return false
  if (halaman === '*' || akses.role === 'admin') return true // admin always has everything
  if (halaman.includes('|')) return halaman.split('|').some((h) => bisa(akses, h, perlu)) // a screen that either page opens
  const punya = akses.halaman[halaman]
  return perlu === 'baca' ? punya !== undefined : punya === 'tulis'
}

/** Stand-in when the settings cannot be read: an admin still has everything, anybody else nothing. */
export const AKSES_ADMIN_CADANGAN = (role: string): AksesSaya => ({ role, nama: role, akses_toko: 'semua', halaman: {} })
