import { describe, expect, it } from 'vitest'
import { filterNavForUser, NAV } from '@/config/nav'

describe('filterNavForUser', () => {
  it('returns nothing for a logged-out user', () => {
    expect(filterNavForUser(null)).toEqual([])
  })

  it('owner sees every nav item', () => {
    const visible = filterNavForUser({ role: 'owner' })
    expect(visible.length).toBe(NAV.length)
  })

  it('staff is restricted to shared pages only (dashboard, toko, pesanan, profile)', () => {
    const visible = filterNavForUser({ role: 'staff' })
    const paths = visible.map((n) => n.to)
    expect(paths).toEqual(['/dashboard', '/toko', '/pesanan', '/profile'])
  })
})
