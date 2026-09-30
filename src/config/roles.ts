import type { Role } from '@/api/types'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  staff: 'Staff',
}

/** Pages only `owner` may reach — akun/produk/listing/gudang/staff/settlement/iklan
 * management and user administration. `staff` is scoped (per StaffAkunMarketplace)
 * to viewing/processing pesanan for its assigned toko only — see Layout/App routing. */
export const ROLES_OWNER_ONLY: Role[] = ['owner']

export const PLATFORM_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  tiktokshop: 'TikTokShop',
  lazada: 'Lazada',
  blibli: 'Blibli',
}
