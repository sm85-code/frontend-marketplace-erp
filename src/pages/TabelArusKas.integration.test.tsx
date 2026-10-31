import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Overview, Report } from '@/api/financialReports'
import { KATEGORI_BAWAAN, KELOMPOK_BAWAAN } from '@/api/kategori'
import { keyNama, keySelesai, RINCI_TABEL } from '@/lib/arusKasRinci'
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
vi.mock('@/api/pengaturanUi', () => ({ useLabel: () => (s: string, fallback?: string) => fallback ?? s }))
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
  { tanggal: day, kategori: 'tukang', uraian: 'JOKO WAHYONO', jumlah: '1150000.00' },
  { tanggal: day, kategori: 'tukang', uraian: 'CAHYONO', jumlah: '3025000.00' },
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
let activeData = data
let tree: ReactTestRenderer
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) }) }
async function mount(props: { hanyaLihat?: boolean; tanpaUbah?: boolean } = {}) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  await act(async () => { tree = create(<QueryClientProvider client={client}><TabelArusKas data={activeData} month={month} tanpaUnduh tanpaCentang {...props} /></QueryClientProvider>) })
  await flush()
}
function row(id: string) {
  const table = tree.root.findByType(FinancialSheetTable)
  return table.props.block.lines.find((l: Line) => !isGroup(l) && l.def.key === id) as Line
}
function value(id: string, period = 0) { return row(id).cells[period].value }
function reports() {
  const { plain } = susunLaporan(data, [record], [day], server.lembar, items, daftar, KELOMPOK_BAWAAN, null, '2026-11-02')
  const get = (t: string, k: string) => (plain.find(b => b.tabel === t)!.lines.find(l => !isGroup(l) && l.def.key === k) as Line).cells[0].value
  return [get('pengeluaran', 'p:tukang'), get('laba_rugi', 'c_hpp')]
}
async function edit(value: string, sumber?: 'manual' | 'otomatis') {
  await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row('k_tukang'), 0) })
  await act(async () => { tree.root.findByType(ArusKasRinciDialog).props.onSave('Tukang [JOKO]', value, 'tukang', sumber) })
  await flush()
}
async function reload() { await act(async () => { tree.unmount() }); await mount() }
beforeEach(() => {
  vi.clearAllMocks(); activeData = data; server = { version: 7, lembar: fixture() }
  api.read.mockImplementation(async () => structuredClone(server))
  api.op.mockResolvedValue(items)
  api.save.mockImplementation(async (_month: string, version: number, lembar: Lembar) => {
    if (version !== server.version) throw new Error('version conflict')
    server = { version: version + 1, lembar: structuredClone(lembar) }
    return structuredClone(server)
  })
})
describe('TabelArusKas through mocked persistence and report reload', () => {
  it('defaults historical manual zero to automatic without writes or warnings, including reload', async () => {
    await mount()
    expect(value('k_tukang')).toBe(1150000); expect(value('k_pembelian')).toBe(3025000)
    expect(value('k_operasional')).toBe(2200000); expect(value('k_langganan')).toBe(1825000)
    expect(value('kas_keluar')).toBe(8200000); expect(reports()).toEqual([8200000, 8200000])
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
    expect(api.save).not.toHaveBeenCalled(); expect(server.lembar.sel[key]).toBe('0')
    await reload()
    expect(value('k_tukang')).toBe(1150000)
    expect(server.lembar.sel[key]).toBe('0')
  })
  it.each(['k_tukang', 'k_pembelian', 'k_operasional', 'k_langganan'])('offers automatic and preserves manual selection for worker row %s', async (id) => {
    await mount()
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row(id), 0) })
    const dialog = tree.root.findByType(ArusKasRinciDialog)
    expect(dialog.props.target.sumber).toBe('otomatis')
    await act(async () => { dialog.props.onSave(row(id).def.label, '7', 'tukang', 'manual') })
    await flush(); await reload()
    expect(value(id)).toBe(7)
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
  })
  it('unticking a legacy completion flag preserves an explicitly selected manual amount', async () => {
    await mount()
    await edit('42', 'manual')
    server.lembar.sel[keySelesai('k_tukang', day)] = '2'
    await reload()
    // Mount exposes no ticking with tanpaCentang, so exercise the editable table with ticks enabled.
    await act(async () => { tree.update(<QueryClientProvider client={client}><TabelArusKas data={data} month={month} tanpaUnduh /></QueryClientProvider>) })
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onCentang(row('k_tukang'), 0, false) })
    await flush(); await reload()
    expect(server.lembar.sel[keySelesai('k_tukang', day)]).toBeUndefined()
    expect(value('k_tukang')).toBe(42)
  })
  it('saving automatic selection keeps automatic amounts after reload', async () => {
    await mount()
    await edit('42', 'otomatis')
    await reload()
    expect(value('k_tukang')).toBe(1150000)
    expect(server.lembar.sel['unrelated|2026-10-31']).toBe('99')
    expect(server.lembar.sel[key]).toBe('0')
  })
  it('persists a deliberate manual override through edit and reload', async () => {
    await mount()
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row('k_tukang'), 0) })
    await act(async () => { tree.root.findByType(ArusKasRinciDialog).props.onSave('Tukang [JOKO]', '42', 'tukang', 'manual') }); await flush()
    expect(server.lembar.sel[key]).toBe('42'); expect(server.lembar.sel['unrelated|2026-10-31']).toBe('99')
    await reload(); expect(value('k_tukang')).toBe(42); expect(value('kas_keluar')).toBe(7050042); expect(reports()).toEqual([7050042, 7050042])
  })
  it('persists explicit manual zero then returns to automatic through reload', async () => {
    await mount()
    await edit('0', 'manual')
    await reload()
    expect(value('k_tukang')).toBe(0); expect(reports()).toEqual([7050000, 7050000])
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
    await edit('0', 'otomatis')
    await reload()
    expect(value('k_tukang')).toBe(1150000); expect(reports()).toEqual([8200000, 8200000])
    expect(server.lembar.sel[key]).toBe('0')
  })
  it('recovers from version conflict without losing the server data or claiming success', async () => {
    await mount()
    server.version = 8; server.lembar.sel['other-user|2026-10-31'] = '123'
    await edit('42', 'manual')
    expect(api.error).toHaveBeenCalled(); expect(server.lembar.sel[key]).toBe('0')
    expect(server.lembar.sel['other-user|2026-10-31']).toBe('123')
    expect(value('k_tukang')).toBe(1150000); expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
    await reload(); expect(value('k_tukang')).toBe(1150000); expect(reports()).toEqual([8200000, 8200000])
  })
  it('keeps the edit dialog open on save failure so the entered value is not discarded', async () => {
    await mount()
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row('k_tukang'), 0) })
    api.save.mockRejectedValueOnce(new Error('save failed'))
    await act(async () => { tree.root.findByType(ArusKasRinciDialog).props.onSave('Tukang [JOKO]', '42', 'tukang', 'manual') }); await flush()
    expect(api.error).toHaveBeenCalled()
    expect(tree.root.findByType(ArusKasRinciDialog).props.target).not.toBeNull()
    expect(server.lembar.sel[key]).toBe('0')
    expect(value('k_tukang')).toBe(1150000)
  })
  it('retains saved history and automatic display when saving and reloading both fail', async () => {
    await mount()
    api.save.mockRejectedValueOnce(new Error('save failed'))
    api.read.mockRejectedValue(new Error('reload failed'))
    await edit('42', 'manual')
    expect(api.error).toHaveBeenCalled()
    expect(server.lembar.sel[key]).toBe('0')
    expect(value('k_tukang')).toBe(1150000)
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
  })
  it.each([{ hanyaLihat: true }, { tanpaUbah: true }])('read-only %o shows automatic amounts without warnings or writes', async (props) => {
    await mount(props)
    expect(value('k_tukang')).toBe(1150000); expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
    expect(tree.root.findAllByType('button').some(b => b.props.children === 'Gunakan nilai otomatis')).toBe(false)
    expect(tree.root.findByType(FinancialSheetTable).props.hanyaLihat).toBe(true)
    expect(api.save).not.toHaveBeenCalled()
  })
})

afterEach(async () => {
  if (tree) await act(async () => { tree.unmount() })
  client?.clear()
})

describe('RIZKI supplier mapping with two distinct destinations', () => {
  const supplierDay = '2026-10-25'
  const supplierKey = `rb:k_pembelian|${supplierDay}`
  const packingKey = `c:packing|${supplierDay}`
  beforeEach(() => {
    activeData = { laporan: [{ ...record, tanggal: supplierDay }, record] } as unknown as Overview
    let l = emptyLembar()
    l.baris.push(
      { id: keyNama('k_pembelian'), tabel: RINCI_TABEL, grup: 'nama', label: 'Supplier [RIZKI]' },
      { id: 'c:packing', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Packing [RIZKI]' },
      { id: 'c:duplicate', tabel: RINCI_TABEL, grup: 'Kas keluar', label: 'Packing [RIZKI]' },
    )
    for (const id of ['k_pembelian', 'c:packing', 'c:duplicate']) l = setKategori(l, id, 'Kas keluar', 'belanja_supplier')
    l.sel[supplierKey] = '0'; l.sel[packingKey] = '99'
    l.sel[`c:duplicate|${supplierDay}`] = '88'
    server.lembar = l
    api.op.mockResolvedValue([
      { tanggal: '2026-10-24', kategori: 'belanja_supplier', uraian: 'Supplier [RIZKI]', jumlah: '423000' },
      { tanggal: '2026-10-24', kategori: 'belanja_supplier', uraian: 'Packing [RIZKI]', jumlah: '12500' },
    ])
  })
  async function open(id: string) {
    await act(async () => { tree.root.findByType(FinancialSheetTable).props.onEdit(row(id), 0) })
    return tree.root.findByType(ArusKasRinciDialog).props
  }
  async function select(id: string, amount: string, source: 'manual' | 'otomatis') {
    const dialog = await open(id)
    await act(async () => { dialog.onSave(row(id).def.label, amount, 'belanja_supplier', source) })
    await flush()
  }
  it('routes 24 October to separate rows, exposes defaults on every row, and reloads without writes or warnings', async () => {
    await mount()
    expect(value('k_pembelian')).toBe(423000)
    expect(value('c:packing')).toBe(12500)
    expect(value('c:duplicate')).toBe(0)
    expect(value('kas_keluar')).toBe(435500)
    for (const id of ['k_pembelian', 'c:packing', 'c:duplicate']) expect((await open(id)).target.sumber).toBe('otomatis')
    expect(api.save).not.toHaveBeenCalled()
    await reload()
    expect(value('k_pembelian')).toBe(423000); expect(value('c:packing')).toBe(12500)
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
    expect(server.lembar.sel[packingKey]).toBe('99')
  })
  it.each(['k_pembelian', 'c:packing', 'c:duplicate'])('persists manual zero and returns %s to automatic, without affecting other destinations', async (id) => {
    await mount()
    await select(id, '0', 'manual')
    await reload()
    expect((await open(id)).target.sumber).toBe('manual')
    expect(value(id)).toBe(0)
    expect(value('k_pembelian')).toBe(id === 'k_pembelian' ? 0 : 423000)
    expect(value('c:packing')).toBe(id === 'c:packing' ? 0 : 12500)
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
    await select(id, '0', 'otomatis')
    await reload()
    expect((await open(id)).target.sumber).toBe('otomatis')
    expect(value('k_pembelian')).toBe(423000); expect(value('c:packing')).toBe(12500)
    expect(value('kas_keluar')).toBe(435500)
  })
  it('rolls back a failed supplier save, retains the dialog, and reloads both original destinations', async () => {
    await mount()
    api.save.mockRejectedValueOnce(new Error('save failed'))
    await select('c:packing', '7', 'manual')
    expect(api.error).toHaveBeenCalled()
    expect(tree.root.findByType(ArusKasRinciDialog).props.target).not.toBeNull()
    expect(server.lembar.sel[packingKey]).toBe('99')
    expect(value('k_pembelian')).toBe(423000); expect(value('c:packing')).toBe(12500)
    await reload()
    expect((await open('c:packing')).target.sumber).toBe('otomatis')
    expect(value('kas_keluar')).toBe(435500)
    expect(JSON.stringify(tree.toJSON())).not.toContain('Perbedaan nilai manual')
  })
})
