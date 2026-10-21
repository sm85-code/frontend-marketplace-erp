import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Boxes,
  Home,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  Package,
  Receipt,
  FilePenLine,
  Store,
  UserCircle,
  Users,
  Warehouse,
  Hammer,
  ArrowLeftRight,
  Wallet,
  PackageOpen,
} from 'lucide-react'
import { bisa, type AksesSaya } from '@/lib/akses'

export interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  /** The page (halaman) whose access setting decides whether this item shows. */
  halaman: string
  grup: GrupNav
  /** Priority for the phone bottom bar (1 = first to get a slot). Items without it live under "Lainnya". */
  bawah?: number
  /** Left-to-right position on the phone bottom bar (independent of the sidebar order). */
  posisiBawah?: number
}

export type GrupNav = 'harian' | 'produk' | 'processing' | 'data-produksi' | 'keuangan' | 'iklan' | 'info-toko' | 'pengaturan'

/** Sidebar sections in the order of the daily workflow: work the orders, manage products, money, then setup. */
export const GRUP_NAV: { id: GrupNav; label: string }[] = [
  { id: 'harian', label: 'Harian' },
  { id: 'produk', label: 'Produk' },
  { id: 'processing', label: 'Processing' },
  { id: 'data-produksi', label: 'Data Produksi' },
  { id: 'keuangan', label: 'Keuangan' },
  { id: 'iklan', label: 'Iklan' },
  { id: 'info-toko', label: 'Info Toko' },
  { id: 'pengaturan', label: 'Pengaturan' },
]

/** How many tabs the phone bottom bar shows before "Lainnya". */
export const SLOT_BAWAH = 4

/** The order of this list is the order in the sidebar and the drawer; the phone bottom bar uses `posisiBawah`. */
export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, halaman: 'dashboard', grup: 'harian', bawah: 1, posisiBawah: 1 },
  { to: '/pesanan', label: 'Pesanan', icon: Receipt, halaman: 'pesanan', grup: 'harian', bawah: 4, posisiBawah: 4 },
  { to: '/chat', label: 'Chat', icon: MessageSquare, halaman: 'chat', grup: 'harian', bawah: 3, posisiBawah: 3 },
  { to: '/katalog', label: 'Katalog Shopee', shortLabel: 'Katalog', icon: LayoutGrid, halaman: 'katalog', grup: 'produk', bawah: 2, posisiBawah: 2 },
  { to: '/produk', label: 'Produk (SKU)', shortLabel: 'Produk', icon: Package, halaman: 'produk', grup: 'produk' },
  { to: '/listing', label: 'Pemetaan Produk Toko', icon: Link2, halaman: 'listing', grup: 'produk' },
  { to: '/gudang', label: 'Gudang & Stok', shortLabel: 'Stok', icon: Warehouse, halaman: 'gudang', grup: 'produk' },
  { to: '/processing/pemetaan', label: 'Pemetaan Order', icon: Hammer, halaman: 'processing', grup: 'processing' },
  { to: '/processing/tukang-kayu', label: 'Tukang Kayu', icon: Users, halaman: 'processing', grup: 'data-produksi' },
  { to: '/processing/supplier', label: 'Supplier', icon: Store, halaman: 'processing', grup: 'data-produksi' },
  { to: '/processing/produk-kayu', label: 'Katalog Produk Kayu', icon: Package, halaman: 'processing', grup: 'data-produksi' },
  { to: '/processing/produk-non-kayu', label: 'Katalog Produk Non Kayu', icon: Link2, halaman: 'processing', grup: 'data-produksi' },
  { to: '/processing/tarif-pengecatan', label: 'Tarif Pengecatan', icon: Hammer, halaman: 'processing', grup: 'data-produksi' },
  { to: '/processing/tarif-packing', label: 'Tarif Packing', icon: Boxes, halaman: 'processing', grup: 'data-produksi' },
  { to: '/processing/template', label: 'Template', icon: FilePenLine, halaman: 'processing', grup: 'data-produksi' },
  { to: '/laporan-keuangan', label: 'Laporan Keuangan', icon: Receipt, halaman: 'laporan_keuangan', grup: 'keuangan' },
  { to: '/arus-kas', label: 'Arus Kas', icon: ArrowLeftRight, halaman: 'arus_kas', grup: 'keuangan' },
  { to: '/operasional-umum', label: 'Operasional Umum', icon: Wallet, halaman: 'operasional_umum', grup: 'keuangan' },
  { to: '/operasional-packing', label: 'Operasional Packing', icon: PackageOpen, halaman: 'operasional_packing', grup: 'keuangan' },
  { to: '/settlement', label: 'Dana & Saldo Shopee', icon: Boxes, halaman: 'settlement', grup: 'keuangan' },
  { to: '/performa-toko', label: 'Performa Toko', icon: Store, halaman: 'info_toko', grup: 'info-toko' },
  { to: '/pengaturan-toko', label: 'Pengaturan Toko', icon: Store, halaman: 'info_toko', grup: 'info-toko' },
  { to: '/iklan', label: 'Iklan', icon: Megaphone, halaman: 'iklan', grup: 'iklan' },
  { to: '/toko', label: 'Kelola Toko', icon: Store, halaman: 'kelola_toko', grup: 'pengaturan', bawah: 5, posisiBawah: 5 },
  { to: '/asisten', label: 'Asisten AI', icon: Bot, halaman: 'asisten', grup: 'pengaturan' },
  { to: '/staff', label: 'Kelola Pengguna', icon: Users, halaman: 'kelola_pengguna', grup: 'pengaturan' },
  { to: '/profile', label: 'Profil Saya', shortLabel: 'Profil', icon: UserCircle, halaman: '*', grup: 'pengaturan', bawah: 6, posisiBawah: 6 },
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

export function filterNav(akses: AksesSaya | null | undefined, items: NavItem[] = NAV): NavItem[] {
  if (!akses) return []
  return items.filter((n) => bisa(akses, n.halaman))
}
