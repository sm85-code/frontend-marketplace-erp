import { expect, it } from 'vitest'
import { shopeeDiagnostic } from './shopeeDiagnostic'

it('retains backend diagnostic codes and request IDs', () => {
  const diagnostic = { endpoint: '/api/v2/product/boost_item', request_id: 'trace', error: 'partial_rejection' }
  expect(shopeeDiagnostic({ response: { data: { detail: { diagnostic } } } })).toBe(diagnostic)
})
it('fallback never copies signed query, headers or submitted review text', () => {
  const error = { config: { url: '/ulasan?access_token=secret', headers: { Authorization: 'secret' }, data: 'private reply' }, response: { status: 504 } }
  const output = shopeeDiagnostic(error)
  expect(output?.error).toBe('http_504')
  expect(output?.endpoint).toBe('/ulasan')
  expect(JSON.stringify(output)).not.toMatch(/secret|private reply|Authorization/)
})
