import { describe, expect, it } from 'vitest'
import { nomorHalaman } from '@/lib/paginasi'

describe('nomorHalaman', () => {
  it('shows every page when there are few', () => {
    expect(nomorHalaman(1, 1)).toEqual([1])
    expect(nomorHalaman(2, 3)).toEqual([1, 2, 3])
  })

  it('skips the middle of a long list with an ellipsis', () => {
    expect(nomorHalaman(1, 24)).toEqual([1, 2, null, 24])
    expect(nomorHalaman(12, 24)).toEqual([1, null, 11, 12, 13, null, 24])
    expect(nomorHalaman(24, 24)).toEqual([1, null, 23, 24])
  })

  it('does not hide a single skipped page behind an ellipsis', () => {
    expect(nomorHalaman(1, 4)).toEqual([1, 2, 3, 4])
    expect(nomorHalaman(5, 8)).toEqual([1, null, 4, 5, 6, 7, 8])
  })
})
