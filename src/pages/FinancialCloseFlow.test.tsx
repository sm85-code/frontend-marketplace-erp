import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FinancialClosePanel from './FinancialClosePanel'
import client from '@/api/client'
import * as api from '@/api/financialReports'
import { emptyClose } from '@/lib/financialClose'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => children,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}))
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const date = '2026-09-30'
const source = {
  settlements: [],
  iklan: [],
  biaya_iklan: '0',
  pesanan_pengiriman: [],
  stok: [],
  peringatan: [],
}
const saved = {
  tanggal: date,
  mulai: '2026-09-28',
  lengkap: true,
  tutup_bulanan: true,
  input: { ...emptyClose(date), catatan: 'Catatan lama', stok: '123' },
  sumber: source,
  hasil: {
    pemasukan: '100',
    pengeluaran: '20',
    laba: '80',
    saldo_akhir: { kas_utama: '50' },
    neraca: { selisih: '0' },
  },
} as unknown as api.Report
let tree: ReactTestRenderer
const text = () => JSON.stringify(tree.toJSON())
const button = (name: string) =>
  tree.root.findAllByType('button').find((n) => n.children.join('') === name)!
const click = async (name: string) => {
  await act(async () => button(name).props.onClick())
}
const change = async (label: string, value: string) => {
  const node = tree.root
    .findAllByType('label')
    .find((n) =>
      n.children.some((c) => typeof c === 'string' && c.includes(label)),
    )!
  await act(async () =>
    node.findByType('input').props.onChange({ target: { value } }),
  )
}
async function setup(existing = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['financial-close-sources', date], {
    mulai: saved.mulai,
    sumber_utama: 'erp',
    sumber: source,
  })
  vi.spyOn(api, 'sources').mockResolvedValue({
    mulai: saved.mulai,
    sumber_utama: 'erp',
    sumber: source,
  } as any)
  vi.spyOn(api, 'preview').mockImplementation(async (data) => ({
    ...saved,
    input: data,
    preview_token: `fresh-${preview.mock.calls.length}`,
  }))
  const preview = vi.mocked(api.preview)
  const reopen = vi.spyOn(api, 'reopen')
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  await act(async () => {
    tree = create(
      <QueryClientProvider client={qc}>
        <FinancialClosePanel
          data={
            {
              akhir_bulan: date,
              laporan: [],
              laporan_bulanan: null,
              patokan_bulanan: existing ? saved : null,
              tutup_terakhir: existing ? date : null,
              tutup_berikutnya: date,
              terakhir: date,
              berikutnya: date,
            } as any
          }
          month="2026-09"
          writable
          live={{
            pemasukan: '101',
            pengeluaran: '20',
            laba: '81',
            kas_utama: '51',
          }}
        />{' '}
      </QueryClientProvider>,
    )
  })
  await click(existing ? 'Perbarui patokan' : `Tutup buku ${date.slice(0, 7)}`)
  return { preview, reopen, invalidate }
}
async function confirm() {
  await click('Buat pratinjau baru')
  await act(async () =>
    tree.root
      .findAllByType('input')
      .find((n) => n.props.type === 'checkbox')!
      .props.onChange({ target: { checked: true } }),
  )
}
afterEach(async () => {
  if (tree) await act(async () => tree.unmount())
  vi.restoreAllMocks()
})
describe('atomic snapshot flow', () => {
  it('previews edited existing inputs and posts the atomic endpoint with reason and fresh token', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: saved })
    const { preview, reopen, invalidate } = await setup()
    await change('Alasan pembaruan', 'Koreksi stok')
    await change('Saldo akhir persediaan', '456')
    await confirm()
    await change('Alasan pembaruan', 'Koreksi stok final')
    expect(button('Simpan patokan dan audit')).toBeUndefined()
    await confirm()
    await click('Simpan patokan dan audit')
    expect(preview.mock.lastCall![0]).toMatchObject({
      tanggal: date,
      stok: '456',
      catatan: 'Catatan lama\nAlasan pembaruan: Koreksi stok final',
      preview_token: undefined,
    })
    expect(post).toHaveBeenCalledWith(
      `/laporan-keuangan/${date}/perbarui`,
      expect.objectContaining({
        preview_token: 'fresh-2',
        stok: '456',
        catatan: preview.mock.lastCall![0].catatan,
      }),
    )
    expect(reopen).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['financial-reports'] })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['financial-close-history'],
    })
    expect(text()).toContain('Patokan berhasil disimpan')
    expect(text()).toContain('Patokan tersimpan')
  })
  it('shows preview errors and leaves the old snapshot saved after a stale update, requiring a new preview', async () => {
    const update = vi
      .spyOn(api, 'updateClose')
      .mockRejectedValue({
        response: { status: 409, data: { detail: 'Token kedaluwarsa' } },
      })
    const { preview, reopen } = await setup()
    await change('Alasan pembaruan', 'Koreksi stok')
    preview.mockRejectedValueOnce(new Error('Pratinjau gagal'))
    await click('Buat pratinjau baru')
    expect(text()).toContain('Pratinjau gagal')
    expect(text()).toContain('Patokan tersimpan')
    await confirm()
    await click('Simpan patokan dan audit')
    expect(text()).toContain('Token kedaluwarsa')
    expect(text()).toContain('Pratinjau baru diperlukan')
    expect(text()).toContain('Patokan tersimpan')
    expect(text()).not.toContain('Belum ditutup')
    expect(button('Simpan patokan dan audit')).toBeUndefined()
    expect(reopen).not.toHaveBeenCalled()
    update.mockResolvedValueOnce(saved)
    await confirm()
    await click('Simpan patokan dan audit')
    expect(update.mock.lastCall![1].preview_token).toBe('fresh-3')
  })
  it('keeps first close on /tutup', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: saved })
    await setup(false)
    await change('Catatan audit', 'Patokan pertama')
    await confirm()
    await click('Simpan patokan dan audit')
    expect(post).toHaveBeenCalledWith(
      '/laporan-keuangan/tutup',
      expect.objectContaining({ preview_token: 'fresh-1' }),
    )
  })
})
