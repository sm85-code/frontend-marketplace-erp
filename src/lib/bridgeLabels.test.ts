import { describe, it, expect } from 'vitest'
import { bisaDicetak } from './pesanan'
describe('official EasyBoss labels', () => {
  it('offers labels when server verified bridge source readiness', () => {
    expect(bisaDicetak({status:'to_ship',status_marketplace:null,resi_bridge_tersedia:true})).toBe(true)
    expect(bisaDicetak({status:'to_ship',status_marketplace:null,resi_bridge_tersedia:false})).toBe(false)
  })
  it('preserves Shopee and manual eligibility', () => {
    expect(bisaDicetak({status:'to_ship',status_marketplace:'PROCESSED'})).toBe(true)
    expect(bisaDicetak({status:'to_ship',status_marketplace:'READY_TO_SHIP'})).toBe(false)
    expect(bisaDicetak({status:'to_ship',status_marketplace:null})).toBe(false)
  })
})
