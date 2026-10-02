import { describe, expect, it } from 'vitest'
import { getApiError } from '@/api/client'

describe('getApiError', () => {
  it('prefers the backend detail', () => {
    expect(getApiError({ response: { status: 409, data: { detail: 'Resi belum siap' } } })).toBe('Resi belum siap')
  })

  it('turns an opaque proxy 504 into a readable message', () => {
    const e = { message: 'Request failed with status code 504', response: { status: 504, data: '<html>' } }
    expect(getApiError(e)).toBe('Server sedang lambat atau tidak menjawab. Coba lagi sebentar.')
  })

  it('falls back to the axios message, then the default', () => {
    expect(getApiError({ message: 'Network Error' })).toBe('Network Error')
    expect(getApiError({})).toBe('Terjadi kesalahan. Silakan coba lagi.')
  })
})
