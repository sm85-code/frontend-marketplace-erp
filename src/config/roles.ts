import type { Role } from '@/api/types'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  owner: 'Owner',
  staff: 'Staff',
}

/** Pages only `owner` may reach — produk/listing/gudang
 * management and user administration (Iklan and Settlement are admin-only, see ROLES_ADMIN_ONLY). `staff` is scoped (per StaffAkunMarketplace)
 * to dashboard, pesanan, chat and catalogue reads for its assigned toko only — see Layout/App routing. */
export const ROLES_OWNER_ONLY: Role[] = ['admin', 'owner']

/** What only an admin may do: change other users' usernames, names and roles, and everything under Kelola Toko, Kelola Pengguna, Iklan and Settlement. */
export const ROLES_ADMIN_ONLY: Role[] = ['admin']

/** Admin and owner share every page and action except the admin-only ones above. */
export function isOwnerLevel(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'owner'
}

/** Roles an account of this role may give to a new account (mirrors the backend). */
export function rolesYangBolehDibuat(role: Role | null | undefined): Role[] {
  if (role === 'admin') return ['staff', 'owner', 'admin']
  if (role === 'owner') return ['staff']
  return []
}

export const PLATFORM_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  tiktokshop: 'TikTokShop',
  lazada: 'Lazada',
  blibli: 'Blibli',
}
