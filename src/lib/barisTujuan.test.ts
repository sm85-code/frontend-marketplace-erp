import { expect, test } from 'vitest'
import { barisTujuan } from './barisTujuan'
test('splits linked rows', () => {
  expect(barisTujuan('Tagihan Produk [RIZKI]; Packing [RIZKI]')).toEqual(['Tagihan Produk [RIZKI]', 'Packing [RIZKI]'])
  expect(barisTujuan('')).toEqual([])
  expect(barisTujuan(' A ')).toEqual(['A'])
})
