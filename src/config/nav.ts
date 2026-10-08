import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Home,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  Package,
  Receipt,
  Store,
  UserCircle,
  Users,
  Warehouse,
} from 'lucide-react'
import { ROLES_ADMIN_ONLY, ROLES_OWNER_ONLY } from '@/config/roles'
import type { Role } from '@/api/types'

export interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  roles: Role[]
  grup: GrupNav
  /** Priority for the phone bottom bar (1 = first to get a slot). Items without it live under "Lainnya". */
  bawah?: number
  /** Left-to-right position on the phone bottom bar (independent of the sidebar order). */
  posisiBawah?: number
}

export type GrupNav = 'harian' | 'produk' | 'keuangan' | 'pengaturan'

/** Sidebar sections in the order of the daily workflow: work the orders, manage products, money, then setup. */
export const GRUP_NAV: { id: GrupNav; label: string }[] = [
  { id: 'harian', label: 'Harian' },
  { id: 'produk', label: 'Produk' },
  { id: 'keuangan', label: 'Keuangan & Iklan' },
  { id: 'pengaturan', label: 'Pengaturan' },
]

/** How many tabs the phone bottom bar shows before "Lainnya". */
export const SLOT_BAWAH = 4

export const ALL_ROLES: Role[] = ['admin', 'owner', 'staff']

/** The order of this list is the order in the sidebar and the drawer; the phone bottom bar uses `posisiBawah`. */
export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, roles: ALL_ROLES, grup: 'harian', bawah: 1, posisiBawah: 1 },
  { to: '/pesanan', label: 'Pesanan', icon: Receipt, roles: ALL_ROLES, grup: 'harian', bawah: 4, posisiBawah: 4 },
  { to: '/chat', label: 'Chat', icon: MessageSquare, roles: ALL_ROLES, grup: 'harian', bawah: 3, posisiBawah: 3 },
  { to: '/katalog', label: 'Katalog Shopee', shortLabel: 'Katalog', icon: LayoutGrid, roles: ALL_ROLES, grup: 'produk', bawah: 2, posisiBawah: 2 },
  { to: '/produk', label: 'Produk (SKU)', shortLabel: 'Produk', icon: Package, roles: ROLES_OWNER_ONLY, grup: 'produk' },
  { to: '/listing', label: 'Listing', icon: Link2, roles: ROLES_OWNER_ONLY, grup: 'produk' },
  { to: '/gudang', label: 'Gudang & Stok', shortLabel: 'Stok', icon: Warehouse, roles: ROLES_OWNER_ONLY, grup: 'produk' },
  { to: '/settlement', label: 'Settlement', icon: Boxes, roles: ROLES_ADMIN_ONLY, grup: 'keuangan' },
  { to: '/iklan', label: 'Iklan', icon: Megaphone, roles: ROLES_ADMIN_ONLY, grup: 'keuangan' },
  { to: '/toko', label: 'Toko', icon: Store, roles: ALL_ROLES, grup: 'pengaturan', bawah: 5, posisiBawah: 5 },
  { to: '/staff', label: 'Staff', icon: Users, roles: ROLES_OWNER_ONLY, grup: 'pengaturan' },
  { to: '/profile', label: 'Profil Saya', shortLabel: 'Profil', icon: UserCircle, roles: ALL_ROLES, grup: 'pengaturan', bawah: 6, posisiBawah: 6 },
]

/** Visible items split into their sidebar sections (empty sections are dropped), keeping NAV order. */
export function kelompokNav(items: NavItem[]): { grup: (typeof GRUP_NAV)[number]; items: NavItem[] }[] {
  return GRUP_NAV.map((grup) => ({ grup, items: items.filter((n) => n.grup === grup.id) })).filter((g) => g.items.length > 0)
}

/** The tabs of the phone bottom bar: the highest-priority visible items, shown left to right by `posisiBawah`. */
export function itemBawah(items: NavItem[], maks = SLOT_BAWAH): NavItem[] {
  const terpilih = new Set(
    items
      .filter((n) => n.bawah !== undefined)
      .sort((a, b) => (a.bawah as number) - (b.bawah as number))
      .slice(0, maks),
  )
  return items.filter((n) => terpilih.has(n)).sort((a, b) => (a.posisiBawah ?? 99) - (b.posisiBawah ?? 99))
}

export function filterNavForUser(
  user: { role: Role } | null | undefined,
  items: NavItem[] = NAV,
): NavItem[] {
  if (!user) return []
  return items.filter((n) => n.roles.includes(user.role))
}
