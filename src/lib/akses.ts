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

/** Pemetaan Order is accessible through any of its four role-editor tabs. */
export const PEMETAAN_ORDER = 'processing_tukang|processing_supplier|processing_pengecatan|processing_packing'

/**
 * Pages that became tabs. The old key (info_toko, settlement) still opens them until the role is saved again from the
 * role editor, so the order in which the app and the server are deployed cannot lock anybody out.
 */
export const TAB_PENGATURAN_TOKO = {
  profil: 'pengaturan_toko_profil|info_toko',
  'jasa-kirim': 'pengaturan_toko_pengiriman|info_toko',
  alamat: 'pengaturan_toko_alamat|info_toko',
  libur: 'pengaturan_toko_libur|info_toko',
} as const
export const PENGATURAN_TOKO = Object.values(TAB_PENGATURAN_TOKO).join('|')
export const PERFORMA_TOKO = 'performa_toko|info_toko'
export const TAB_SETTLEMENT = {
  saldo: 'settlement_saldo|settlement',
  pendapatan: 'settlement_pendapatan|settlement',
  dana: 'settlement_dana|settlement',
  mutasi: 'settlement_mutasi|settlement',
} as const
export const SETTLEMENT = Object.values(TAB_SETTLEMENT).join('|')
export const TAB_IKLAN = {
  performa: 'iklan_performa|iklan',
  kampanye: 'iklan_kampanye|iklan',
  gmv: 'iklan_gmv|iklan',
  agen: 'iklan_agen|iklan',
  catatan: 'iklan_catatan|iklan',
} as const
export const IKLAN = Object.values(TAB_IKLAN).join('|')
export const TAB_TEMPLATE = { INV: 'data_template_inv|data_template', PO: 'data_template_po|data_template' } as const
export const TEMPLATE = Object.values(TAB_TEMPLATE).join('|')
