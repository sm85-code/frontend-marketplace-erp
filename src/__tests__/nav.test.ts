import { describe, expect, it } from 'vitest'
import { filterNavForUser, GRUP_NAV, itemBawah, kelompokNav, NAV } from '@/config/nav'

describe('filterNavForUser', () => {
  it('returns nothing for a logged-out user', () => {
    expect(filterNavForUser(null)).toEqual([])
  })

  it('admin sees every nav item; owner sees all but Iklan', () => {
    expect(filterNavForUser({ role: 'admin' }).length).toBe(NAV.length)
    expect(filterNavForUser({ role: 'owner' }).map((n) => n.to)).toEqual(NAV.map((n) => n.to).filter((to) => to !== '/iklan'))
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

  it('groups the admin menu as agreed (Toko lives under Pengaturan, Iklan is admin-only)', () => {
    const peta = Object.fromEntries(kelompokNav(filterNavForUser({ role: 'admin' })).map((g) => [g.grup.id, g.items.map((n) => n.to)]))
    expect(peta).toEqual({
      harian: ['/dashboard', '/pesanan'],
      produk: ['/katalog', '/produk', '/listing', '/gudang'],
      keuangan: ['/settlement', '/iklan'],
      pengaturan: ['/toko', '/staff', '/profile'],
    })
  })

  it('hides Iklan from owner and staff (ads move real money: admin only)', () => {
    for (const role of ['owner', 'staff'] as const) {
      const semua = kelompokNav(filterNavForUser({ role })).flatMap((g) => g.items.map((n) => n.to))
      expect(semua).not.toContain('/iklan')
    }
    expect(kelompokNav(filterNavForUser({ role: 'owner' })).find((g) => g.grup.id === 'keuangan')?.items.map((n) => n.to)).toEqual(['/settlement'])
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
  it('owner: the four most important tabs, left to right as agreed', () => {
    expect(itemBawah(filterNavForUser({ role: 'owner' })).map((n) => n.to)).toEqual(['/dashboard', '/produk', '/katalog', '/pesanan'])
  })

  it('staff: dashboard, orders, shop and profile', () => {
    expect(itemBawah(filterNavForUser({ role: 'staff' })).map((n) => n.to)).toEqual(['/dashboard', '/pesanan', '/toko', '/profile'])
  })

  it('never shows more tabs than asked for', () => {
    expect(itemBawah(filterNavForUser({ role: 'owner' }), 2).map((n) => n.to)).toEqual(['/dashboard', '/pesanan'])
  })
})
