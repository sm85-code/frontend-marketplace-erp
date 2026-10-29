import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ProcessingWorkflow, { ProcessingHistory, TimeCorrectionDialog } from './ProcessingWorkflow'
import * as api from '@/api/processing'
import client from '@/api/client'

vi.mock('@/components/ui/dialog', () => {
  const box = ({ children }: any) => <div>{children}</div>
  return { Dialog: box, DialogContent: box, DialogHeader: box, DialogTitle: box, DialogDescription: box, DialogFooter: box }
})
const auth = vi.hoisted(() => ({ role: 'admin', roles: ['admin'], write: true }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { role: auth.role }, akses: { roles: auth.roles }, bisa: (_: string, level: string) => level !== 'tulis' || auth.write }) }))
vi.mock('@/components/PilihNative', () => ({ default: ({ children, ...props }: any) => <select {...props}>{children}</select> }))
vi.mock('@/components/ConfirmProvider', () => ({ useConfirm: () => vi.fn() }))
vi.mock('@/pages/RekapPemetaan', () => ({ default: () => null }))
vi.mock('@/components/AksiLainnya', () => ({ default: ({ children }: any) => <div>{children}</div> }))
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const fixture = {
  id: 'synthetic', version: 3, source: 'internal', route: 'tukang', stage: 'packing',
  order_number: 'SYNTHETIC PREVIEW', produk: 'Fixture rak', customer: 'Synthetic fixture', shop: '', varian: '',
  qty: 1, color: 'Putih', production_done_at: '2026-01-01T17:10:00Z', painting_done_at: '2026-01-01T18:00:00Z',
  packing_done_at: null, received_at: null, events: [], production_price: '100', paint_price: '0', packing_price: '0',
} as unknown as api.ProcessingJob
let tree: ReactTestRenderer
let qc: QueryClient
const text = () => JSON.stringify(tree.toJSON())
const button = (name: string) => tree.root.findAllByType('button').find(n => n.children.join('') === name)!
const change = async (type: string, value: string) => {
  const node = type === 'reason' ? tree.root.findByType('textarea') : tree.root.findAllByType('input').find(n => n.props.type === type)!
  await act(async () => node.props.onChange({ target: { value } }))
}
const submit = async () => { await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} })) }
async function dialog() {
  const onSaved = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()
  await act(async () => { tree = create(<TimeCorrectionDialog job={fixture} stage="produksi" onSaved={onSaved} onClose={onClose} />) })
  return { onSaved, onClose }
}
afterEach(async () => {
  if (tree) await act(async () => tree.unmount())
  qc?.clear()
  vi.restoreAllMocks()
  auth.role = 'admin'; auth.roles = ['admin']; auth.write = true
})
it('requires a trimmed reason and posts explicit WIB with the current version independently of browser timezone', async () => {
  const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { tersimpan: true } })
  const { onSaved, onClose } = await dialog()
  expect(text()).toContain('Waktu selesai baru (WIB)')
  expect(tree.root.findByProps({ type: 'datetime-local' }).props.value).toBe('2026-01-02T00:10')
  expect(button('Simpan koreksi').props.disabled).toBe(true)
  await change('reason', '  ')
  await submit()
  expect(post).not.toHaveBeenCalled()
  await change('datetime-local', '2026-01-01T23:59')
  await change('reason', '  Fixture reason  ')
  await submit()
  expect(post).toHaveBeenCalledWith('/processing/jobs/synthetic/correct-time', {
    version: 3, stage: 'produksi', new_time: '2026-01-01T23:59+07:00', reason: 'Fixture reason',
  })
  expect(onSaved).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
})
it('disables pending submission and keeps the dialog and reason on a version conflict', async () => {
  let reject!: (error: unknown) => void
  vi.spyOn(client, 'post').mockReturnValue(new Promise((_, r) => { reject = r }))
  const { onClose, onSaved } = await dialog()
  await change('reason', 'Fixture reason')
  let promise: Promise<unknown>
  await act(async () => { promise = tree.root.findByType('form').props.onSubmit({ preventDefault() {} }); await Promise.resolve() })
  expect(button('Menyimpan…').props.disabled).toBe(true)
  expect(button('Batal').props.disabled).toBe(true)
  await act(async () => { reject({ response: { status: 409, data: { detail: 'Muat ulang versi' } } }); await promise })
  expect(text()).toContain('Muat ulang versi')
  expect(tree.root.findByType('textarea').props.value).toBe('Fixture reason')
  expect(onClose).not.toHaveBeenCalled()
  expect(onSaved).not.toHaveBeenCalled()
})
it('shows correction stage, old/new WIB, reason and actor in real history rendering', () => {
  const html = renderToStaticMarkup(<ProcessingHistory events={[{ action: 'koreksi_waktu', stage: 'produksi',
    old_time: '2026-01-01T16:59:00Z', new_time: '2026-01-01T17:01:00Z', at: '2026-01-02T00:00:00Z', actor: 'fixture-admin', reason: '<Fixture reason>' }]} />)
  for (const value of ['Produksi', '01/01/2026 23:59', '02/01/2026 00:01', 'fixture-admin', '&lt;Fixture reason&gt;']) expect(html).toContain(value)
})
async function workflow(job = fixture) {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['processing-jobs'], { items: [job] })
  qc.setQueryData(['processing-prices'], { items: [] })
  await act(async () => { tree = create(<QueryClientProvider client={qc}><ProcessingWorkflow catalog={{ tukang: [], supplier: [] } as any} /></QueryClientProvider>) })
}
it.each([
  ['admin', ['admin'], true, true], ['owner', ['owner'], true, true],
  ['staff', ['staff'], true, false], ['custom', ['custom'], true, false],
  ['owner', ['owner'], false, false], ['staff', ['staff', 'owner'], true, true],
])('gates correction control for %s roles %j write %s', async (role, roles, write, allowed) => {
  auth.role = role; auth.roles = roles; auth.write = write
  await workflow()
  expect(!!button('Koreksi waktu')).toBe(allowed)
  if (allowed) {
    await act(async () => button('Koreksi waktu').props.onClick())
    expect(text()).toContain('Waktu selesai baru (WIB)')
  }
})
it('hides the control on unfinished stages', async () => {
  await workflow({ ...fixture, production_done_at: null, stage: 'produksi' })
  expect(button('Koreksi waktu')).toBeUndefined()
})
it.each([['tukang', 'Polos / Tanpa Cat'], ['supplier', 'Putih']] as const)('excludes paint corrections on %s / %s even with stale completion fields', async (route, color) => {
  await workflow({ ...fixture, route, color, painting_done_at: '2026-01-01T18:00:00Z' })
  await act(async () => tree.root.findByProps({ 'aria-label': 'Tabel Pengecatan' }).props.onClick())
  expect(button('Koreksi waktu')).toBeUndefined()
})
