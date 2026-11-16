import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import SummaryPage from './SummaryPage'
import { filterNav } from '@/config/nav'
import type { AksesSaya } from '@/api/types'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const mock = vi.hoisted(() => ({ query: {} as Record<string, unknown>, data: undefined as unknown, error: null as unknown }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: Record<string, unknown>) => { mock.query = options; return { data: mock.data, error: mock.error, isPending: !mock.data && !mock.error, refetch: vi.fn() } } }))
vi.mock('@/components/PilihNative', () => ({ default: (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} /> }))
vi.mock('@/components/daftar', () => ({ BarHalaman: () => <h1>Summary</h1> }))
vi.mock('recharts', () => Object.fromEntries(['Area', 'AreaChart', 'CartesianGrid', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map(key => [key, ({ children }: { children?: React.ReactNode }) => <div>{children}</div>])))
const metrics = { orders: 2, units: '3', completed: 1, processing: 1, shipping: 0, cancelled: 0, returns: null, average_units: '1.5', gross: '250000', net: null, pending: null, average_value: '125000', completed_sales: '100000', shipping_sales: '0', cancellation_value: '0', return_value: null, waiting_courier: 0, unknown: 0, missing_sales: 0, known_sales: '250000' }
const fixture = { totals: metrics, marketplaces: [{ ...metrics, platform: 'shopee', shops: [{ ...metrics, id: 's1', name: 'Toko Utama' }] }], trend: [], shops: [{ id: 's1', platform: 'shopee', name: 'Toko Utama' }], orders: [], total_orders: 2, page: 1, page_size: 25, start: '2026-11-01', end: '2026-11-17', as_of: '2026-11-17T00:00:00Z', limitations: ['Histori ERP', 'Snapshot status', 'Subtotal barang', 'Refund belum lengkap', 'Unit aktual'], quality: { deduplicated: 0, fallback_dates: 0, unknown_status: 0, missing_sales: 0 } }

describe('Summary', () => {
  it('is admin only by default and can be granted without changing existing navigation', () => {
    const access = (role: string, halaman = {}): AksesSaya => ({ role, nama: role, akses_toko: 'semua', halaman })
    expect(filterNav(access('admin')).some(n => n.to === '/summary')).toBe(true)
    expect(filterNav(access('staff')).some(n => n.to === '/summary')).toBe(false)
    expect(filterNav(access('staff', { summary: 'baca' })).map(n => n.to)).toContain('/summary')
  })
  it('renders both tabs, preserves filter across tabs, expands shops inside tables and shows missing values', async () => {
    mock.data = fixture; mock.error = null
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<SummaryPage />) })
    expect(tree.root.findAllByType('table').length).toBe(2)
    expect(JSON.stringify(tree.toJSON())).not.toContain('Toko Utama</')
    const expand = tree.root.findAllByType('button').find(b => b.props['aria-expanded'] === false)!
    await act(async () => expand.props.onClick())
    expect(tree.root.findAllByType('th').some(t => t.children.join('') === 'Toko Utama')).toBe(true)
    const selects = tree.root.findAllByType('select')
    await act(async () => selects[1].props.onChange({ target: { value: 'shopee' } }))
    expect((mock.query.queryKey as unknown[])[3]).toBe('shopee')
    await act(async () => tree.root.findAllByType('button').find(b => b.props.id === 'summary-sales')!.props.onClick())
    expect((mock.query.queryKey as unknown[])[3]).toBe('shopee')
    expect(JSON.stringify(tree.toJSON())).toContain('Belum tersedia')
    expect(JSON.stringify(tree.toJSON())).toContain('Omzet Bersih')
    await act(async () => tree.unmount())
  })
  it('does not display zero KPIs on source failure', async () => {
    mock.data = undefined; mock.error = new Error('Summary unavailable')
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<SummaryPage />) })
    expect(tree.root.findAllByType('table')).toHaveLength(0)
    expect(JSON.stringify(tree.toJSON())).toContain('Summary unavailable')
    await act(async () => tree.unmount())
  })
})
