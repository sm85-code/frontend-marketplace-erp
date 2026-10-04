import { describe, expect, it } from 'vitest'
import { isOwnerLevel, ROLES_ADMIN_ONLY, ROLES_OWNER_ONLY, rolesYangBolehDibuat } from '@/config/roles'

describe('role levels (admin > owner > staff)', () => {
  it('admin and owner share the owner-level pages and actions, staff does not', () => {
    expect(isOwnerLevel('admin')).toBe(true)
    expect(isOwnerLevel('owner')).toBe(true)
    expect(isOwnerLevel('staff')).toBe(false)
    expect(isOwnerLevel(null)).toBe(false)
    expect(ROLES_OWNER_ONLY).toEqual(['admin', 'owner'])
  })

  it('only the admin has the admin-only powers', () => {
    expect(ROLES_ADMIN_ONLY).toEqual(['admin'])
  })

  it('an admin may create any role, an owner only staff, staff nobody (mirrors the backend)', () => {
    expect(rolesYangBolehDibuat('admin')).toEqual(['staff', 'owner', 'admin'])
    expect(rolesYangBolehDibuat('owner')).toEqual(['staff'])
    expect(rolesYangBolehDibuat('staff')).toEqual([])
  })
})
