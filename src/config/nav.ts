import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Home,
  Link2,
  Megaphone,
  Package,
  Receipt,
  Store,
  UserCircle,
  Users,
  Warehouse,
} from 'lucide-react'
import { ROLES_OWNER_ONLY } from '@/config/roles'
import type { Role } from '@/api/types'

export interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  roles: Role[]
}

/** Fixed mobile bottom-nav slot order (left→right). Lainnya is appended in BottomNav. */
export const BOTTOM_NAV_PATHS = ['/dashboard', '/pesanan', '/produk', '/toko'] as const

export const ALL_ROLES: Role[] = ['owner', 'staff']

export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, roles: ALL_ROLES },
  { to: '/toko', label: 'Toko', icon: Store, roles: ALL_ROLES },
  { to: '/produk', label: 'Produk (SKU)', icon: Package, roles: ROLES_OWNER_ONLY },
  { to: '/listing', label: 'Listing', icon: Link2, roles: ROLES_OWNER_ONLY },
  { to: '/gudang', label: 'Gudang & Stok', shortLabel: 'Stok', icon: Warehouse, roles: ROLES_OWNER_ONLY },
  { to: '/pesanan', label: 'Pesanan', icon: Receipt, roles: ALL_ROLES },
  { to: '/settlement', label: 'Settlement', icon: Boxes, roles: ROLES_OWNER_ONLY },
  { to: '/iklan', label: 'Iklan', icon: Megaphone, roles: ROLES_OWNER_ONLY },
  { to: '/staff', label: 'Staff', icon: Users, roles: ROLES_OWNER_ONLY },
  { to: '/profile', label: 'Profil Saya', shortLabel: 'Profil', icon: UserCircle, roles: ALL_ROLES },
]

export function filterNavForUser(
  user: { role: Role } | null | undefined,
  items: NavItem[] = NAV,
): NavItem[] {
  if (!user) return []
  return items.filter((n) => n.roles.includes(user.role))
}
