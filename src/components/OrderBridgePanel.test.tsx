import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderBridgePanel from './OrderBridgePanel'

const state = vi.hoisted(() => ({ write: true, configured: false, plan: null as unknown }))
const mutations = vi.hoisted(() => ({ preview: vi.fn(), apply: vi.fn(), check: vi.fn(), automation: vi.fn() }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ bisa: () => state.write }) }))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: { configured: state.configured, connection: 'unverified', scheduler: 'disabled', enabled: false, shops: 0, counts: {}, runs: [], errors: [] } }),
  useMutation: ({ mutationFn }: { mutationFn: (task: () => Promise<unknown>) => Promise<unknown> }) => ({ isPending: false, mutate: (task: () => Promise<unknown>) => mutationFn(task) }),
}))
vi.mock('@/api/tokoPenjualan', () => ({ kunciTokoPenjualan: ['shops'], useTokoPenjualan: () => ({ data: { items: [{ id: 'manual-1', nama: 'Old Shop', jenis: 'internal', platform: 'lazada' }, { id: 'reseller-1', nama: 'Reseller', jenis: 'reseller', platform: 'lazada' }] } }) }))
vi.mock('@/api/orderBridge', () => ({ getBridge: vi.fn(), previewShops: mutations.preview, applyShops: mutations.apply, checkOrders: mutations.check, setAutomation: mutations.automation, bridgeLog: vi.fn() }))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? children : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => children,
  DialogHeader: ({ children }: { children: React.ReactNode }) => children,
  DialogTitle: ({ children }: { children: React.ReactNode }) => children,
  DialogDescription: ({ children }: { children: React.ReactNode }) => children,
}))
const button = (tree: ReactTestRenderer, label: string) => tree.root.findAllByType('button').find(b => b.children.join('') === label)!

describe('Order Bridge controls', () => {
  beforeEach(() => { vi.clearAllMocks(); state.write = true; state.configured = false })
  it('blocks import and automation until upstream contract is configured', async () => {
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<OrderBridgePanel />) })
    expect(button(tree, 'Periksa Pesanan Sekarang').props.disabled).toBe(true)
    expect(button(tree, 'Aktifkan Otomatisasi').props.disabled).toBe(true)
    expect(JSON.stringify(tree.toJSON())).toContain('Integrasi nyata belum diverifikasi')
    await act(async () => tree.unmount())
  })
  it('hides mutations for readers', async () => {
    state.write = false
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<OrderBridgePanel />) })
    expect(button(tree, 'Sinkronkan EasyBoss')).toBeUndefined()
    await act(async () => tree.unmount())
  })
  it('previews before applying and offers only internal manual candidates', async () => {
    state.configured = true
    mutations.preview.mockResolvedValue({ fingerprint: 'fixture-hash', manual_review: ['manual-1'], items: [{ shop: { platform: 'lazada', shop_id: 'eb-1', name: 'Old Shop', active: true }, action: 'review', candidates: ['manual-1'] }] })
    let tree!: ReactTestRenderer
    await act(async () => { tree = create(<OrderBridgePanel />) })
    await act(async () => { await button(tree, 'Sinkronkan EasyBoss').props.onClick() })
    expect(mutations.apply).not.toHaveBeenCalled()
    expect(tree.root.findAllByType('option').map(o => o.props.value)).toEqual(['', 'manual-1'])
    await act(async () => tree.root.findByType('select').props.onChange({ target: { value: 'manual-1' } }))
    await act(async () => { await button(tree, 'Terapkan sinkronisasi').props.onClick() })
    expect(mutations.apply).toHaveBeenCalledWith('fixture-hash', { 'lazada:eb-1': 'manual-1' })
    await act(async () => tree.unmount())
  })
})
