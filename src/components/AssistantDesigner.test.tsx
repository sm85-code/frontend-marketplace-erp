import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AssistantDesigner from './AssistantDesigner'
import type { AiAction } from '@/api/assistant'

const act = (tool: string, result: unknown, args: Record<string, unknown> = {}, status: AiAction['status'] = 'succeeded'): AiAction =>
  ({ id: tool, tool, label: tool, is_write: false, status, arguments: args, result })
const render = (actions: AiAction[]) => {
  const qc = new QueryClient()
  qc.setQueryData(['assistant-image', 'g1'], 'blob:foto-1')
  return renderToStaticMarkup(<QueryClientProvider client={qc}><MemoryRouter><AssistantDesigner actions={actions} /></MemoryRouter></QueryClientProvider>)
}

describe('Desainer produk di chat', () => {
  it('shows the draft card with one "Buka draf" button, photo and research sources', () => {
    const html = render([
      act('riset_web', { sumber: [{ judul: 'Pesaing A', url: 'https://a.example/1' }, { judul: 'Jahat', url: 'javascript:alert(1)' }] }),
      act('buat_gambar_produk', { gambar_ids: ['g1'] }),
      act('buat_draf_produk', { draf_id: 'd1', nama: 'Tas Rajut Krem', harga_saran: '89000', gambar_ids: ['g1'], tautan: '/publikasi?draf_ai=d1' }, { stok: 10, berat_kg: '0.3' }),
    ])
    expect(html).toContain('Tas Rajut Krem')
    expect(html).toContain('Rp 89.000')
    expect(html).toContain('belum dipublikasikan')
    expect(html.match(/Buka draf/g)).toHaveLength(1)
    expect(html).toContain('href="/publikasi?draf_ai=d1"')
    expect(html).toContain('blob:foto-1')
    expect(html).toContain('https://a.example/1')
    expect(html).not.toContain('javascript:')
  })
  it('renders nothing for other tools or failed actions', () => {
    expect(render([act('cari_produk', {}), act('buat_draf_produk', { draf_id: 'x' }, {}, 'failed')])).toBe('')
  })
})
