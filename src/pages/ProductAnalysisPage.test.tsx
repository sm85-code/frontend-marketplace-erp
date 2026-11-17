import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import ProductAnalysisPage from './ProductAnalysisPage'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const mock = vi.hoisted(() => ({ data: undefined as unknown }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mock.data, isPending: false, error: null }) }))
vi.mock('@/components/daftar', () => ({ BarHalaman: () => <h1>Analisis Produk</h1> }))
const shop = { key: 's', name: 'Toko A', units: 3, sales: '300', item_id: '2', model_id: '3', url: 'https://shopee.co.id/product/1/2' }
const variant = { key: 'v', name: '60 cm', units: 3, sales: '300', variants: [], shops: [shop] }
describe('Analisis Produk', () => {
  it('starts collapsed, expands product and variant inside one table', async () => {
    mock.data = { rows: [{ key: 'p', name: 'Rak', units: 3, sales: '300', shops: [], variants: [variant] }], total: 1, totals: { units: 3, sales: '300' }, shops: [], notes: [] }
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<ProductAnalysisPage />) })
    expect(tree.root.findAllByType('table')).toHaveLength(1)
    expect(JSON.stringify(tree.toJSON())).not.toContain('60 cm')
    await act(async () => { tree.root.findByProps({ 'aria-label': 'Buka Rak' }).props.onClick() })
    expect(JSON.stringify(tree.toJSON())).toContain('60 cm')
    await act(async () => { tree.root.findByProps({ 'aria-label': 'Buka 60 cm' }).props.onClick() })
    expect(JSON.stringify(tree.toJSON())).toContain('Toko A')
    expect(tree.root.findAllByType('table')).toHaveLength(1)
    await act(async () => tree.unmount())
  })
  it('copies product URL and message including variant, without invented deep link', async () => {
    mock.data = { rows: [], total: 0, shops: [], notes: [] }
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<ProductAnalysisPage />) })
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mock.data = { rows: [{ key: 'l', name: 'Rak', variant: '60 cm', shop: 'A', stock: 2, status: 'NORMAL', as_of: '2026-11-17', url: shop.url, message: 'Pilih varian 60 cm: ' + shop.url }], total: 1, shops: [], notes: [] }
    await act(async () => { tree.root.findAllByProps({ role: 'tab' })[1].props.onClick() })
    const buttons = tree.root.findAllByType('button')
    await act(async () => { buttons.find(b => b.children.join('') === 'Salin Pesan + Link')!.props.onClick() })
    expect(writeText).toHaveBeenCalledWith('Pilih varian 60 cm: https://shopee.co.id/product/1/2')
    await act(async () => tree.unmount())
    vi.unstubAllGlobals()
  })
})
