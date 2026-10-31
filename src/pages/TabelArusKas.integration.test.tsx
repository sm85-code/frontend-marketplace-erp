import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { KATEGORI_BAWAAN, KELOMPOK_BAWAAN } from '@/api/kategori'
import { keyNama, RINCI_TABEL } from '@/lib/arusKasRinci'
import { setKategori } from '@/lib/kategoriKeuangan'
import { emptyLembar, isGroup, type Lembar, type Line } from '@/lib/sheetEngine'
import { susunLaporan } from '@/lib/susunLaporan'
import TabelArusKas from './TabelArusKas'
import FinancialSheetTable from './FinancialSheetTable'
import ArusKasRinciDialog from './ArusKasRinciDialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const api = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), op: vi.fn(), error: vi.fn() }))
vi.mock('@/api/financialReports', () => ({ lembarManual: api.read, lembarArusKas: api.read, saveLembarManual: api.save, saveLembarArusKas: api.save, operasionalBulan: api.op }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }))
vi.mock('@/api/pengaturanUi', () => ({ useLabel: () => (s: string) => s }))
vi.mock('@/api/kategori', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/kategori')>()
  return { ...original, useKategori: () => daftar, useKelompok: () => original.KELOMPOK_BAWAAN }
})
vi.mock('sonner', () => ({ toast: { error: api.error } }))
// Keep the real table, but isolate the browser-only Radix dialog; call its public callbacks as a user would.
vi.mock('./ArusKasRinciDialog', () => ({ default: () => null }))
vi.mock('./FinancialSheetDialogs', () => ({ AddRowDialog: () => null, RenameDialog: () => null }))

const month = '2026-10', day = '2026-10-31', key = `rb:k_tukang|${day}`
const daftar = KATEGORI_BAWAAN.map(k => k.id === 'tukang' ? { ...k, nama: 'Belanja Tukang', operasional: 'tukang' as const } : k)
const items = [
  { tanggal: day, kategori: 'tukang', uraian: 'Tukang [JOKO]', jumlah: '1150000.00' },
  { tanggal: day, kategori: 'tukang', uraian: 'Tukang [YONO]', jumlah: '3025000.00' },
  { tanggal: day, kategori: 'tukang', uraian: 'Tukang [AYI]', jumlah: '2200000.00' },
  { tanggal: day, kategori: 'tukang', uraian: 'Tukang [NUR]', jumlah: '1825000.00' },
]
const zero = { kas_utama: '0', stok: '0', kas_operasional: '0', iklan_prabayar: '0', piutang_pengiriman: '0', saldo_toko: '0', kas_gaji: '0', utang_gaji: '0', utang_usaha: '0', modal: '0', saldo_laba: '0' }
const record = { tanggal: day, input: { pendapatan_produk: '0', jasa_proses: '0', jasa_cat_packing: '0', bayar_tukang: '0', pembelian: '0', gaji: '0', operasional: '0', langganan: '0', topup_iklan: '0', tambahan_modal: '0' }, hasil: { pemasukan_toko: '0', perubahan_piutang: '0', pemasukan: '0', pengeluaran: '0', laba: '0', kas_masuk: '0', kas_keluar: '0', transfer_antar_kas: '0', penyesuaian_stok: '0', penyesuaian_utang: '0', biaya_iklan: '0', saldo_awal: zero, saldo_akhir: zero, neraca: { aset: '0', utang: '0', ekuitas: '0', selisih: '0' } } } as unknown as Report
const data = { laporan: [record] } as unknown as Overview
function fixture() {
  let l = emptyLembar()
  for (const [id, name] of [['k_tukang', 'JOKO'], ['k_pembelian', 'YONO'], ['k_operasional', 'AYI'], ['k_langganan', 'NUR']]) {
    l.baris.push({ id: keyNama(id), tabel: RINCI_TABEL, grup: 'nama', label: `Tukang [${name}]` })
    l = setKategori(l, id, 'Kas keluar', 'tukang')
  }
  l.sel[key] = '0'
  l.sel['unrelated|2026-10-31'] = '99'
  return l
}
let server: { version: number; lembar: Lembar }
let client: QueryClient
let tree: ReactTestRenderer
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) }) }
async function mount(props: { hanyaLihat?: boolean; tanpaUbah?: boolean } = {}) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  await act(async () => { tree = create(<QueryClientProvider client={client}><TabelArusKas data={data} month={month} tanpaUnduh tanpaCentang {...props} /></QueryClientProvider>) })
  await flush()
}
function row(id: string) {
  const table = tree.root.findByType(FinancialSheetTable)
  return table.props.block.lines.find((l: Line) => !isGroup(l) && l.def.key === id) as Line
}
function value(id: string) { return row(id).cells[0].value }
function reports() {
  const { plain } = susunLaporan(data, [record], [day], server.lembar, items, daftar, KELOMPOK_BAWAAN, null, '2026-11-02')
  const get = (t: string, k: string) => (plain.find(b => b.tabel === t)!.lines.find(l => !isGroup(l) && l.def.key === k) as Line).cells[0].value
  return [get('pengeluaran', 'p:tukang'), get('laba_rugi', 'c_hpp')]
}
async function click(text: string) { await act(async () => { tree.root.findAllByType('button').find(b => b.props.children === text)!.props.onClick() }); await flush() }
async function reload() { await act(async () => { tree.unmount() }); await mount() }
beforeEach(() => {
  vi.clearAllMocks(); server = { version: 7, lembar: fixture() }
  api.read.mockImplementation(async () => structuredClone(server))
  api.op.mockResolvedValue(items)
  api.save.mockImplementation(async (_month: string, version: number, lembar: Lembar) => {
    if (version !== server.version) throw new Error('version conflict')
    server = { version: version + 1, lembar: structuredClone(lembar) }
    return structuredClone(server)
  })
})
describe('TabelArusKas through mocked persistence and report reload', () => {
  it('keeps actual JOKO manual zero until automatic is explicitly chosen, then reloads totals', async () => {
    await mount()
    expect(value('k_tukang')).toBe(0); expect(value('k_pembelian')).toBe(3025000)
    expect(value('kas_keluar')).toBe(7050000); expect(reports()).toEqual([7050000, 7050000])
    expect(JSON.stringify(tree.toJSON())).toContain('1.150.000'); expect(api.save).not.toHaveBeenCalled()
    await click('Gunakan nilai otomatis')
    expect(api.save).toHaveBeenCalledTimes(1)
    expect(api.save.mock.calls[0][1]).toBe(7)
    expect(server.lembar.sel[key]).toBeUndefined(); expect(server.lembar.sel['unrelated|2026-10-31']).toBe('99')
    await reload()
    expect(value('k_tukang')).toBe(1150000); expect(value('k_pembelian')).toBe(3025000)
    expect(value('kas_keluar')).toBe(8200000); expect(reports()).toEqual([8200000, 8200000])
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
  })
  it('persists a deliberate manual override through edit and reload', async () => {
    await mount()
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row('k_tukang'), 0) })
    await act(async () => { tree.root.findByType(ArusKasRinciDialog).props.onSave('Tukang [JOKO]', '42', 'tukang') }); await flush()
    expect(server.lembar.sel[key]).toBe('42'); expect(server.lembar.sel['unrelated|2026-10-31']).toBe('99')
    await reload(); expect(value('k_tukang')).toBe(42); expect(value('kas_keluar')).toBe(7050042); expect(reports()).toEqual([7050042, 7050042])
  })
  it('recovers from version conflict without losing the server data or claiming success', async () => {
    await mount()
    server.version = 8; server.lembar.sel['other-user|2026-10-31'] = '123'
    await click('Gunakan nilai otomatis')
    expect(api.error).toHaveBeenCalled(); expect(server.lembar.sel[key]).toBe('0')
    expect(server.lembar.sel['other-user|2026-10-31']).toBe('123')
    expect(value('k_tukang')).toBe(0); expect(JSON.stringify(tree.toJSON())).toContain('Perbedaan nilai manual')
    await reload(); expect(value('k_tukang')).toBe(0); expect(reports()).toEqual([7050000, 7050000])
  })
  it('keeps the edit dialog open on save failure so the entered value is not discarded', async () => {
    await mount()
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row('k_tukang'), 0) })
    api.save.mockRejectedValueOnce(new Error('save failed'))
    await act(async () => { tree.root.findByType(ArusKasRinciDialog).props.onSave('Tukang [JOKO]', '42', 'tukang') }); await flush()
    expect(api.error).toHaveBeenCalled()
    expect(tree.root.findByType(ArusKasRinciDialog).props.target).not.toBeNull()
    expect(server.lembar.sel[key]).toBe('0')
    expect(value('k_tukang')).toBe(0)
  })
  it('retains the last saved zero and conflict when saving and reloading both fail', async () => {
    await mount()
    api.save.mockRejectedValueOnce(new Error('save failed'))
    api.read.mockRejectedValue(new Error('reload failed'))
    await click('Gunakan nilai otomatis')
    expect(api.error).toHaveBeenCalled()
    expect(server.lembar.sel[key]).toBe('0')
    expect(value('k_tukang')).toBe(0)
    expect(JSON.stringify(tree.toJSON())).toContain('Perbedaan nilai manual')
  })
  it.each([{ hanyaLihat: true }, { tanpaUbah: true }])('read-only %o shows the conflict but cannot write', async (props) => {
    await mount(props)
    expect(value('k_tukang')).toBe(0); expect(JSON.stringify(tree.toJSON())).toContain('Perbedaan nilai manual')
    expect(tree.root.findAllByType('button').some(b => b.props.children === 'Gunakan nilai otomatis')).toBe(false)
    expect(tree.root.findByType(FinancialSheetTable).props.hanyaLihat).toBe(true)
    expect(api.save).not.toHaveBeenCalled()
  })
})
