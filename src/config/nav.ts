import { Boxes, Link2, type LucideIcon, Package, ShoppingCart, Store } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

/** No analytics dashboard in T2 (deferred to T5). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/pesanan', label: 'Pesanan', icon: ShoppingCart, description: 'Inbox pesanan semua toko' },
  { to: '/toko', label: 'Toko', icon: Store, description: 'Akun marketplace & koneksi Shopee' },
  { to: '/produk', label: 'Produk', icon: Package, description: 'Master SKU induk' },
  { to: '/listing', label: 'Listing', icon: Link2, description: 'Mapping SKU ke listing toko' },
  { to: '/stok', label: 'Stok', icon: Boxes, description: 'Stok tersedia, penyesuaian, ledger' },
]
