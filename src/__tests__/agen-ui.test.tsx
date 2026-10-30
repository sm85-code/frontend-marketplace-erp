import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import type { AgenApi } from '@/api/agen'
import { agenApi, BATAS_AWAL } from '@/api/agen'
// Render dialogs inline in Node; no portal or network.
vi.mock('@/components/ui/dialog', () => ({ Dialog: ({ open, children }: any) => open ? <div>{children}</div> : null, DialogContent: 'section', DialogDescription: 'p', DialogFooter: 'footer', DialogHeader: 'header', DialogTitle: 'h2' }))
vi.mock('@/api/endpoints', () => ({ listAkun: vi.fn() }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ bisa: () => true }) }))
import { listAkun } from '@/api/endpoints'
import Agen, { AgenView } from '@/pages/iklan/Agen'
const api: AgenApi = {
  stop: vi.fn(async () => ({ lingkup: 'global', aktif: false, alasan: '', oleh: null })),
  simpanStop: vi.fn(async () => ({ lingkup: 'global', aktif: true, alasan: '', oleh: null })),
  batas: vi.fn(async () => BATAS_AWAL), simpanBatas: vi.fn(async (_, b) => b),
  audit: vi.fn(async () => ({ items: [{ id: 'audit', akun_id: 'a', kampanye_id: '7', aksi: 'bid', pelaku_nama: 'Owner', pelaku_id: 'u', sebelum: { bid: 300 }, sesudah: { bid: 330 }, alasan: 'uji', request_id: 'req', persetujuan: 'ya', kering: false, hasil: 'diterapkan', dibuat_at: '2026-10-30' }] })),
  jadwal: vi.fn(async () => ({ items: [], loop_detik: 0 })), simpanJadwal: vi.fn(async (_, b) => ({ ...b, campaign_id: String(b.campaign_id), dijeda_jadwal: false })),
  ringkasan: vi.fn(async () => ({ akun_id: 'a', nama_toko: 'Demo', saldo: 50000, kampanye: [], produk: [], catatan: [] })), tren: vi.fn(async () => ({ views: 100 })),
  kirim: vi.fn(async (_, b) => ({ kering: b.kering, diterapkan: !b.kering, butuh_persetujuan: true, jenis: 'bid', campaign_id: '7', sebelum: { bid: 300 }, sesudah: { bid: 330 }, audit_id: 'dry' })),
}
let r: ReactTestRenderer
let client: QueryClient
const text = () => JSON.stringify(r.toJSON())
const buttons = () => r.root.findAllByType('button')
const btn = (s: string) => buttons().find(b => b.children.filter(c => typeof c === 'string').join('').includes(s))!
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)) }) }
async function mount(tulis = true, baca = true) { client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); await act(async () => { r = create(<QueryClientProvider client={client}><AgenView api={api} toko={[{ id: 'a', nama: 'Demo' }, { id: 'b', nama: 'Dua' }]} baca={baca} tulis={tulis} /></QueryClientProvider>) }); await flush() }
async function select(id: string) { await act(async () => r.root.findAllByType('select')[0].props.onChange({ target: { value: id } })); await flush() }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.stop).mockImplementation(async () => ({ lingkup: 'global', aktif: false, alasan: '', oleh: null })); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true })
it('never auto selects a shop, even with loaded accounts; read-only permissions', async () => {
  await mount(false)
  expect(r.root.findByType('select').props.value).toBe('')
  expect(api.batas).not.toHaveBeenCalled(); expect(api.ringkasan).not.toHaveBeenCalled()
  expect(btn('Aktifkan STOP').props.disabled).toBe(true)
  await select('a'); expect(text()).toContain('Job mati'); expect(btn('Simulasikan aksi').props.disabled).toBe(true)
  expect(text()).toContain('pelaku_nama'); expect(text()).toContain('request_id'); expect(text()).toContain('persetujuan')
  await act(async () => r.unmount())
})
it('no API reads without read permission', async () => { await mount(true, false); expect(api.stop).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled(); await act(async () => r.unmount()) })
it('STOP requires explicit typed confirmation', async () => {
  await mount(); await act(async () => btn('Aktifkan STOP').props.onClick())
  expect(api.simpanStop).not.toHaveBeenCalled(); expect(btn('Ya, konfirmasi').props.disabled).toBe(true)
  const input = r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!
  await act(async () => input.props.onChange({ target: { value: 'ya' } }))
  await act(async () => btn('Ya, konfirmasi').props.onClick()); await flush()
  expect(api.simpanStop).toHaveBeenCalledWith(undefined, expect.objectContaining({ aktif: true }))
  await act(async () => r.unmount())
})
it('rollback first simulates, previews, then requires a second confirmation; shop change clears it', async () => {
  await mount(); await select('a')
  await act(async () => btn('Simulasikan rollback').props.onClick()); await flush()
  expect(api.kirim).toHaveBeenCalledWith('a', expect.objectContaining({ kering: true }), 'audit')
  expect(vi.mocked(api.kirim).mock.calls).toHaveLength(1)
  await act(async () => btn('Tinjau eksekusi nyata').props.onClick())
  expect(btn('Ya, konfirmasi').props.disabled).toBe(true)
  await act(async () => r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!.props.onChange({ target: { value: 'ya' } }))
  await act(async () => btn('Ya, konfirmasi').props.onClick()); await flush()
  expect(api.kirim).toHaveBeenLastCalledWith('a', expect.objectContaining({ kering: false, persetujuan: 'ya' }), 'audit')
  await act(async () => btn('Simulasikan rollback').props.onClick()); await flush()
  await select('b'); expect(text()).not.toContain('Tinjau eksekusi nyata')
  await act(async () => r.unmount())
})
it('edits invalidate rollback previews and full limits default autonomy off', async () => {
  await mount(); await select('a')
  await act(async () => btn('Simulasikan rollback').props.onClick()); await flush()
  const reason = r.root.findAllByType('input').find(i => i.props.maxLength === 500)!
  await act(async () => reason.props.onChange({ target: { value: 'baru' } }))
  expect(text()).not.toContain('Tinjau eksekusi nyata')
  await act(async () => btn('Tinjau penggantian batas').props.onClick())
  expect(api.simpanBatas).not.toHaveBeenCalled()
  await act(async () => r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!.props.onChange({ target: { value: 'ya' } }))
  await act(async () => btn('Ya, konfirmasi').props.onClick()); await flush()
  expect(api.simpanBatas).toHaveBeenCalledWith('a', { ...BATAS_AWAL, alasan: 'baru', request_id: expect.any(String) })
  await act(async () => r.unmount())
})
it.each(['anggaran', 'roas', 'jeda', 'lanjut', 'bid', 'kata_kunci', 'kata_negatif'])('UI %s only sends dry-run until second typed approval', async jenis => {
  await mount(); await select('a')
  const field = (label: string) => { const l = r.root.findAllByType('label').find(n => n.props.children === label)!; return r.root.findAll(n => n.props.id === l.props.htmlFor && n.type !== 'label').find(n => typeof n.type === 'string')! }
  await act(async () => field('Jenis aksi').props.onChange({ target: { value: jenis } }))
  await act(async () => field('ID kampanye').props.onChange({ target: { value: '7' } }))
  if (['anggaran', 'roas', 'bid'].includes(jenis)) await act(async () => field('Nilai baru').props.onChange({ target: { value: '330' } }))
  if (jenis === 'bid') await act(async () => field('Kata kunci aktif').props.onChange({ target: { value: 'kursi' } }))
  if (jenis.startsWith('kata_')) {
    await act(async () => field('Kata 1').props.onChange({ target: { value: 'kursi' } }))
    if (jenis === 'kata_kunci') await act(async () => field('Bid kata 1 (Rp)').props.onChange({ target: { value: '300' } }))
  }
  await act(async () => btn('Simulasikan aksi').props.onClick()); await flush()
  expect(api.kirim).toHaveBeenCalledTimes(1)
  expect(api.kirim).toHaveBeenCalledWith('a', expect.objectContaining({ jenis, campaign_id: 7, kering: true }), undefined)
  await act(async () => btn('Tinjau eksekusi nyata').props.onClick())
  expect(api.kirim).toHaveBeenCalledTimes(1)
  await act(async () => r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!.props.onChange({ target: { value: 'ya' } }))
  await act(async () => btn('Ya, konfirmasi').props.onClick()); await flush()
  expect(api.kirim).toHaveBeenCalledTimes(2)
  expect(api.kirim).toHaveBeenLastCalledWith('a', expect.objectContaining({ jenis, kering: false, persetujuan: 'ya' }), undefined)
  await act(async () => r.unmount())
})
it('STOP blocks action and rollback before mock transport', async () => {
  vi.mocked(api.stop).mockImplementation(async () => ({ lingkup: 'global', aktif: true, alasan: 'darurat', oleh: 'u' }))
  await mount(); await select('a')
  expect(btn('Simulasikan aksi').props.disabled).toBe(true)
  expect(btn('Simulasikan rollback').props.disabled).toBe(true)
  expect(btn('Tinjau jadwal').props.disabled).toBe(true)
  expect(api.kirim).not.toHaveBeenCalled()
  await act(async () => r.unmount())
})
it('schedule validates hours and sends exact body only after confirmation', async () => {
  await mount(); await select('a')
  const field = (label: string) => { const l = r.root.findAllByType('label').find(n => n.props.children === label)!; return r.root.findAllByType('input').find(n => n.props.id === l.props.htmlFor)! }
  await act(async () => field('ID kampanye jadwal').props.onChange({ target: { value: '7' } }))
  await act(async () => field('Jam diizinkan (0–23, pisahkan koma)').props.onChange({ target: { value: '24' } }))
  await act(async () => btn('Tinjau jadwal').props.onClick())
  expect(text()).toContain('Jam tidak valid'); expect(api.simpanJadwal).not.toHaveBeenCalled()
  await act(async () => field('Jam diizinkan (0–23, pisahkan koma)').props.onChange({ target: { value: '10,9,10' } }))
  await act(async () => btn('Tinjau jadwal').props.onClick())
  expect(api.simpanJadwal).not.toHaveBeenCalled()
  await act(async () => r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!.props.onChange({ target: { value: 'ya' } }))
  await act(async () => btn('Ya, konfirmasi').props.onClick()); await flush()
  expect(api.simpanJadwal).toHaveBeenCalledWith('a', { campaign_id: 7, jam: [9,10], aktif: false })
  await act(async () => r.unmount())
})
it('shop change during pending dry-run cannot expose stale preview', async () => {
  let resolve!: (h: Awaited<ReturnType<AgenApi['kirim']>>) => void
  vi.mocked(api.kirim).mockImplementationOnce(() => new Promise(r => { resolve = r }))
  await mount(); await select('a')
  await act(async () => btn('Simulasikan rollback').props.onClick())
  await select('b')
  await act(async () => resolve({ kering: true, diterapkan: false, butuh_persetujuan: true, jenis: 'bid', campaign_id: '7', sebelum: {}, sesudah: {}, audit_id: 'stale' }))
  expect(text()).not.toContain('Tinjau eksekusi nyata')
  await act(async () => r.unmount())
})

function field(label: string) {
  const l = r.root.findAllByType('label').find(n => n.props.children === label)!
  return r.root.findAll(n => n.props.id === l.props.htmlFor && typeof n.type === 'string')[0]
}
async function change(label: string, value: string) { await act(async () => field(label).props.onChange({ target: { value } })) }
async function approve() {
  await act(async () => r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!.props.onChange({ target: { value: 'ya' } }))
  await act(async () => btn('Ya, konfirmasi').props.onClick()); await flush()
}
it('summary and trends expose Indonesian tables and preserve unavailable values', async () => {
  vi.mocked(api.ringkasan).mockResolvedValueOnce({ akun_id: 'a', nama_toko: 'Demo', saldo: null, kampanye: [{ campaign_id: '7', nama: 'Kursi', status: 'ongoing', anggaran: 50000, kinerja: { clicks: 0 } }], produk: [{ item_id: '9', nama: 'Rotan', harga: null }], catatan: ['Sebagian data tertunda'] })
  vi.mocked(api.tren).mockResolvedValueOnce({ item_id: '9', terjual_7: 0, views: null, rating: null, diagnosis: { masalah: null } })
  await mount(); await select('a')
  expect(r.root.findAllByType('table')).toHaveLength(2)
  expect(text()).toContain('Sebagian data tertunda'); expect(text()).toContain('Rotan')
  await change('ID item (maksimal 32 digit)', '9'); await flush()
  const stat = r.root.findAllByType('dt').find(n => n.props.children === 'Dilihat')!.parent!
  expect(JSON.stringify(stat.findByType('dd').props.children)).toContain('Belum tersedia')
  expect(text()).toContain('Terjual 7 hari'); expect(text()).toContain('Perubahan dilihat 28 hari')
  await act(async () => r.unmount())
})
it('schedule loads an existing row and preserves its enabled state through confirmation', async () => {
  vi.mocked(api.jadwal).mockResolvedValueOnce({ items: [{ campaign_id: '17', jam: [9, 15], aktif: true, dijeda_jadwal: true }], loop_detik: 60 })
  await mount(); await select('a')
  expect(text()).toContain('Dijeda oleh jadwal')
  await act(async () => btn('Edit jadwal 17').props.onClick())
  expect(field('ID kampanye jadwal').props.value).toBe('17')
  expect(field('Jam diizinkan (0–23, pisahkan koma)').props.value).toBe('9,15')
  await act(async () => btn('Tinjau jadwal').props.onClick())
  expect(btn('Ya, konfirmasi').props.disabled).toBe(true)
  await approve()
  expect(api.simpanJadwal).toHaveBeenCalledWith('a', { campaign_id: 17, jam: [9,15], aktif: true })
  await act(async () => r.unmount())
})
it('autonomy warning and typed approval are required before replacing limits', async () => {
  await mount(); await select('a')
  const checkbox = r.root.findAllByType('input').find(i => i.props.type === 'checkbox')!
  await act(async () => checkbox.props.onChange({ target: { checked: true } }))
  await act(async () => btn('Tinjau penggantian batas').props.onClick())
  expect(text()).toContain('BAHAYA: Anda mengaktifkan otonomi')
  expect(api.simpanBatas).not.toHaveBeenCalled(); expect(btn('Ya, konfirmasi').props.disabled).toBe(true)
  await approve()
  expect(api.simpanBatas).toHaveBeenCalledWith('a', expect.objectContaining({ otonomi: true }))
  await act(async () => r.unmount())
})
it.each(['ringkasan', 'batas', 'jadwal'] as const)('failed %s never disables independent global/shop STOP controls', async key => {
  vi.mocked(api[key]).mockRejectedValueOnce(new Error(`Gagal ${key}`))
  await mount(); await select('a')
  expect(text()).toContain(`Gagal ${key}`)
  const stopButtons = buttons().filter(b => b.props.children === 'Aktifkan STOP')
  expect(stopButtons).toHaveLength(2); expect(stopButtons.every(b => !b.props.disabled)).toBe(true)
  await act(async () => stopButtons[1].props.onClick()); await approve()
  expect(api.simpanStop).toHaveBeenCalledWith('a', expect.objectContaining({ aktif: true }))
  await act(async () => r.unmount())
})
it('keyword editor supports all operations without a JSON input', async () => {
  await mount(); await select('a'); await change('Jenis aksi', 'kata_kunci'); await change('ID kampanye', '7')
  for (const operation of ['add', 'delete', 'restore', 'change_bid_price']) {
    await change('Operasi kata 1', operation); await change('Kata 1', 'rotan')
    if (['add', 'change_bid_price'].includes(operation)) { await change('Bid kata 1 (Rp)', '400'); await change('Pencocokan kata 1', 'exact') }
    await act(async () => btn('Simulasikan aksi').props.onClick()); await flush()
    expect(api.kirim).toHaveBeenLastCalledWith('a', expect.objectContaining({ kering: true, kata_kunci: [expect.objectContaining({ aksi: operation, kata: 'rotan' })] }), undefined)
  }
  expect(r.root.findAllByType('textarea')).toHaveLength(0)
  expect(vi.mocked(api.kirim).mock.calls.every(([,b]) => b.kering)).toBe(true)
  await act(async () => r.unmount())
})
it('returning to the original shop discards a late preview', async () => {
  let resolve!: (h: Awaited<ReturnType<AgenApi['kirim']>>) => void
  vi.mocked(api.kirim).mockImplementationOnce(() => new Promise(r => { resolve = r }))
  await mount(); await select('a')
  await act(async () => btn('Simulasikan rollback').props.onClick())
  // Refresh is disabled while busy; changing scope is still permitted and clears pending dialogs.
  expect(btn('Muat ulang').props.disabled).toBe(true)
  await select('b'); await select('a')
  await act(async () => resolve({ kering: true, diterapkan: false, butuh_persetujuan: true, jenis: 'bid', campaign_id: '7', sebelum: {}, sesudah: {}, audit_id: 'late' }))
  expect(text()).not.toContain('Tinjau eksekusi nyata')
  await act(async () => r.unmount())
})
it('shop change closes a pending approval and resets schedule and action forms', async () => {
  await mount(); await select('a'); await change('ID kampanye jadwal', '7')
  await change('Jam diizinkan (0–23, pisahkan koma)', '9')
  await act(async () => btn('Tinjau jadwal').props.onClick())
  await select('b')
  expect(buttons().some(b => b.props.children === 'Ya, konfirmasi')).toBe(false)
  expect(field('ID kampanye jadwal').props.value).toBe(''); expect(field('ID kampanye').props.value).toBe('')
  expect(api.simpanJadwal).not.toHaveBeenCalled()
  await act(async () => r.unmount())
})

it('account loading and failure are visible while global STOP remains accessible', async () => {
  let reject!: (reason: Error) => void
  vi.mocked(listAkun).mockImplementationOnce(() => new Promise((_, r) => { reject = r }))
  const stop = vi.spyOn(agenApi, 'stop').mockResolvedValue({ lingkup: 'global', aktif: false, alasan: '', oleh: null })
  const audit = vi.spyOn(agenApi, 'audit').mockResolvedValue({ items: [] })
  await act(async () => { r = create(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><Agen /></QueryClientProvider>) }); await flush()
  expect(text()).toContain('Memuat daftar toko')
  await act(async () => reject(new Error('Daftar toko gagal'))); await flush()
  expect(text()).toContain('Gagal memuat daftar toko'); expect(text()).toContain('Daftar toko gagal')
  expect(btn('Aktifkan STOP').props.disabled).toBe(false)
  await act(async () => r.unmount()); stop.mockRestore(); audit.mockRestore()
})

it('STOP becoming active during schedule approval blocks confirmation', async () => {
  await mount(); await select('a'); await change('ID kampanye jadwal', '7'); await change('Jam diizinkan (0–23, pisahkan koma)', '9')
  await act(async () => btn('Tinjau jadwal').props.onClick())
  await act(async () => r.root.findAllByType('input').find(i => i.props.autoComplete === 'off')!.props.onChange({ target: { value: 'ya' } }))
  expect(btn('Ya, konfirmasi').props.disabled).toBe(false)
  vi.mocked(api.stop).mockResolvedValue({ lingkup: 'global', aktif: true, alasan: 'darurat', oleh: 'owner' })
  await act(async () => { await client.invalidateQueries({ queryKey: ['agen', 'global'] }) }); await flush()
  expect(btn('Ya, konfirmasi').props.disabled).toBe(true)
  await act(async () => btn('Ya, konfirmasi').props.onClick())
  expect(api.simpanJadwal).not.toHaveBeenCalled()
  await act(async () => r.unmount())
})
it('editing reason during a pending simulation discards its late result', async () => {
  let resolve!: (h: Awaited<ReturnType<AgenApi['kirim']>>) => void
  vi.mocked(api.kirim).mockImplementationOnce(() => new Promise(r => { resolve = r }))
  await mount(); await select('a'); await act(async () => btn('Simulasikan rollback').props.onClick())
  await change('Alasan perubahan / rollback', 'Alasan berubah')
  await act(async () => resolve({ kering: true, diterapkan: false, butuh_persetujuan: true, jenis: 'bid', campaign_id: '7', sebelum: {}, sesudah: {}, audit_id: 'late-edit' }))
  expect(text()).not.toContain('Tinjau eksekusi nyata')
  expect(api.kirim).toHaveBeenCalledTimes(1)
  await act(async () => r.unmount())
})
