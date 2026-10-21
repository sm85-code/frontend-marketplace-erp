import { describe, expect, it } from 'vitest'
import { filterNav, GRUP_NAV, itemBawah, kelompokNav, NAV } from '@/config/nav'
import { aksesBawaan } from './aksesBawaan'

describe('filterNav', () => {
  it('returns nothing for a logged-out user', () => {
    expect(filterNav(null)).toEqual([])
  })

  it('admin sees every nav item; owner cannot see Iklan or Settlement', () => {
    expect(filterNav(aksesBawaan('admin')).length).toBe(NAV.length)
    expect(filterNav(aksesBawaan('owner')).map((n) => n.to)).toEqual(NAV.map((n) => n.to).filter((to) => !to.startsWith('/processing/') && ![ '/laporan-keuangan', '/arus-kas', '/kategori-transaksi', '/iklan', '/settlement', '/toko', '/staff', '/performa-toko', '/asisten', '/kelola-aplikasi', '/pengaturan-toko'].includes(to)))
  })

  it('staff gets the shared pages and Arus Kas, in workflow order', () => {
    const paths = filterNav(aksesBawaan('staff')).map((n) => n.to)
    expect(paths).toEqual(['/dashboard', '/pesanan', '/chat', '/katalog', '/arus-kas', '/profile'])
  })
})

describe('menu order follows the daily workflow', () => {
  it('lists the sections: harian, produk, keuangan, pengaturan', () => {
    expect(GRUP_NAV.map((g) => g.id)).toEqual(['harian', 'produk', 'processing', 'data-produksi', 'keuangan', 'info-toko', 'pengaturan'])
  })

  it('groups the admin menu as agreed (Toko lives under Pengaturan; Iklan and Dana & Saldo Shopee sit in Info Toko)', () => {
    const peta = Object.fromEntries(kelompokNav(filterNav(aksesBawaan('admin'))).map((g) => [g.grup.id, g.items.map((n) => n.to)]))
    expect(peta).toEqual({
      harian: ['/dashboard', '/pesanan', '/chat'],
      produk: ['/katalog', '/produk', '/listing', '/gudang'],
      processing: ['/processing/pemetaan'],
      'data-produksi': ['/processing/tukang-kayu', '/processing/supplier', '/processing/produk-kayu', '/processing/produk-non-kayu', '/processing/tarif-pengecatan', '/processing/tarif-packing', '/processing/template'],
      keuangan: ['/operasional-umum', '/operasional-packing', '/arus-kas', '/laporan-keuangan', '/kategori-transaksi'],
      'info-toko': ['/pengaturan-toko', '/performa-toko', '/iklan', '/settlement'],
      pengaturan: ['/toko', '/asisten', '/staff', '/kelola-aplikasi', '/profile'],
    })
  })

  it('hides Iklan from owner and staff (ads move real money: admin only)', () => {
    for (const role of ['owner', 'staff'] as const) {
      const semua = kelompokNav(filterNav(aksesBawaan(role))).flatMap((g) => g.items.map((n) => n.to))
      expect(semua.some(path => path.startsWith('/processing'))).toBe(false)
      expect(semua).not.toContain('/laporan-keuangan')
      expect(semua).not.toContain('/iklan')
      expect(semua).not.toContain('/settlement')
    }
    // owner may only look at the two Operasional pages by default; the rest of Keuangan stays admin-only
    expect(kelompokNav(filterNav(aksesBawaan('owner'))).find((g) => g.grup.id === 'keuangan')?.items.map((n) => n.to)).toEqual(['/operasional-umum', '/operasional-packing'])
  })

  it('drops sections a role cannot see anything in (staff sees Keuangan for Arus Kas only)', () => {
    const grup = kelompokNav(filterNav(aksesBawaan('staff'))).map((g) => g.grup.id)
    expect(grup).toEqual(['harian', 'produk', 'keuangan', 'pengaturan'])
  })

  it('every nav item belongs to a known section', () => {
    const dikenal = new Set(GRUP_NAV.map((g) => g.id))
    expect(NAV.every((n) => dikenal.has(n.grup))).toBe(true)
  })
})

describe('phone bottom bar', () => {
  it('every role has Dashboard, Katalog, Chat, Pesanan before Lainnya', () => {
    for (const role of ['admin', 'owner', 'staff'] as const) {
      expect(itemBawah(filterNav(aksesBawaan(role))).map((n) => n.to)).toEqual(['/dashboard', '/katalog', '/chat', '/pesanan'])
    }
  })

  it('staff: dashboard, orders, shop and profile', () => {
    expect(itemBawah(filterNav(aksesBawaan('staff'))).map((n) => n.to)).toEqual(['/dashboard', '/katalog', '/chat', '/pesanan'])
  })

  it('never shows more tabs than asked for', () => {
    expect(itemBawah(filterNav(aksesBawaan('owner')), 2).map((n) => n.to)).toEqual(['/dashboard', '/katalog'])
  })
})
