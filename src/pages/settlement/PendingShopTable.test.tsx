import { describe, it, expect } from 'vitest'
import { act, create } from 'react-test-renderer'
import PendingShopTable, { groupPending, type PendingRow } from './PendingShopTable'
const row = (shopId: string, number: string, amount: number | null): PendingRow => ({ key: `${shopId}:${number}`, shopId, shop: 'Nama sama', number, amount, products: ['Produk'], variants: ['Biru'], shipping: 'Dikirim' })
describe('pending shop table', () => {
 it('groups by shop identity and deduplicates orders within each shop without losing same-number orders in other shops', () => {
  const groups = groupPending([row('a','1',100), row('a','2',200), row('a','1',100), row('b','1',400), row('b','2',null)])
  expect(groups.map(g => [g.id,g.rows.length,g.totals.get('IDR'),g.unknown])).toEqual([['a',2,300,0],['b',2,400,1]])
 })
 it('starts collapsed, toggles shops independently, searches before totals and paginates complete shops', async () => {
  let tree: ReturnType<typeof create>
  const rows = Array.from({length:11},(_,i)=>[row(String(i),'one',100),row(String(i),'two',200)]).flat()
  await act(async()=> { tree = create(<PendingShopTable rows={rows} dates={()=>'Tanggal Dikirim'} />) })
  const orders = () => tree!.root.findAll(n => n.type === 'tr' && !!n.props['data-order'])
  const toggles = () => tree!.root.findAll(n => n.type === 'button' && n.props['aria-expanded'] !== undefined)
  expect(toggles()).toHaveLength(10); expect(orders()).toHaveLength(0)
  await act(async()=>toggles()[0].props.onClick()); expect(orders()).toHaveLength(2)
  await act(async()=>toggles()[1].props.onClick()); expect(orders()).toHaveLength(4)
  await act(async()=>toggles()[0].props.onClick()); expect(orders()).toHaveLength(2)
  const footer = tree!.root.findByType('tfoot')
  expect(footer.findAllByType('td')[0].children).toContain('11')
  expect(footer.findAllByType('td')[1].children).toContain('22')
  await act(async()=>tree!.root.findByType('input').props.onChange({target:{value:'two'}}))
  expect(toggles()).toHaveLength(10); expect(orders()).toHaveLength(1)
  expect(tree!.root.findAllByType('table')).toHaveLength(1)
  await act(async()=>tree!.unmount())
 })
})
