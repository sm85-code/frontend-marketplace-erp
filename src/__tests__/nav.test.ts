import { describe, expect, it } from 'vitest'
import { filterNavForUser, GRUP_NAV, itemBawah, kelompokNav, NAV } from '@/config/nav'

describe('filterNavForUser', () => {
  it('returns nothing for a logged-out user', () => {
    expect(filterNavForUser(null)).toEqual([])
  })

  it('owner and admin see every nav item', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(filterNavForUser({ role }).length).toBe(NAV.length)
    }
  })

  it('staff only gets the shared pages, in workflow order', () => {
    const paths = filterNavForUser({ role: 'staff' }).map((n) => n.to)
    expect(paths).toEqual(['/dashboard', '/pesanan', '/toko', '/profile'])
  })
})

describe('menu order follows the daily workflow', () => {
  it('lists the sections: harian, produk, keuangan, pengaturan', () => {
    expect(GRUP_NAV.map((g) => g.id)).toEqual(['harian', 'produk', 'keuangan', 'pengaturan'])
  })

  it('groups the owner menu as agreed (Toko lives under Pengaturan)', () => {
    const peta = Object.fromEntries(kelompokNav(filterNavForUser({ role: 'owner' })).map((g) => [g.grup.id, g.items.map((n) => n.to)]))
    expect(peta).toEqual({
      harian: ['/dashboard', '/pesanan'],
      produk: ['/katalog', '/produk', '/listing', '/gudang'],
      keuangan: ['/settlement', '/iklan'],
      pengaturan: ['/toko', '/staff', '/profile'],
    })
  })

  it('drops sections a role cannot see anything in', () => {
    const grup = kelompokNav(filterNavForUser({ role: 'staff' })).map((g) => g.grup.id)
    expect(grup).toEqual(['harian', 'pengaturan'])
  })

  it('every nav item belongs to a known section', () => {
    const dikenal = new Set(GRUP_NAV.map((g) => g.id))
    expect(NAV.every((n) => dikenal.has(n.grup))).toBe(true)
  })
})

describe('phone bottom bar', () => {
  it('owner: the four most important tabs, in workflow order', () => {
    expect(itemBawah(filterNavForUser({ role: 'owner' })).map((n) => n.to)).toEqual(['/dashboard', '/pesanan', '/katalog', '/produk'])
  })

  it('staff: dashboard, orders, shop and profile', () => {
    expect(itemBawah(filterNavForUser({ role: 'staff' })).map((n) => n.to)).toEqual(['/dashboard', '/pesanan', '/toko', '/profile'])
  })

  it('never shows more tabs than asked for', () => {
    expect(itemBawah(filterNavForUser({ role: 'owner' }), 2).map((n) => n.to)).toEqual(['/dashboard', '/pesanan'])
  })
})
