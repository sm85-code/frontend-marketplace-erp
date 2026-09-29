import { describe, expect, it } from 'vitest'
import { STATUS_PESANAN } from '@/api/types'
import { allowedActions, canDeletePesanan, TRANSISI_STATUS } from '@/lib/pesanan'

describe('pesanan pipeline (mirror of BE services._TRANSISI_STATUS)', () => {
  it('covers every BE status', () => {
    expect(Object.keys(TRANSISI_STATUS).sort()).toEqual([...STATUS_PESANAN].sort())
  })

  it('matches the BE transition table exactly', () => {
    expect(TRANSISI_STATUS).toEqual({
      unpaid: ['to_ship', 'cancelled'],
      to_ship: ['shipped', 'cancelled'],
      shipped: ['completed'],
      completed: [],
      cancelled: [],
    })
  })

  it('offers confirm/process + cancel on unpaid', () => {
    expect(allowedActions('unpaid').map((a) => a.target)).toEqual(['to_ship', 'cancelled'])
    expect(allowedActions('unpaid').find((a) => a.target === 'cancelled')?.destructive).toBe(true)
  })

  it('offers ship + cancel on to_ship, complete on shipped, nothing on terminal states', () => {
    expect(allowedActions('to_ship').map((a) => a.target)).toEqual(['shipped', 'cancelled'])
    expect(allowedActions('shipped').map((a) => a.target)).toEqual(['completed'])
    expect(allowedActions('completed')).toEqual([])
    expect(allowedActions('cancelled')).toEqual([])
    expect(allowedActions('weird')).toEqual([])
  })

  it('only unpaid orders are deletable', () => {
    expect(canDeletePesanan('unpaid')).toBe(true)
    for (const s of ['to_ship', 'shipped', 'completed', 'cancelled']) expect(canDeletePesanan(s)).toBe(false)
  })
})
