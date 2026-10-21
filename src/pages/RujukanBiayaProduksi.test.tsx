import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RujukanBiayaProduksi from './RujukanBiayaProduksi'

const render = (items: unknown[]) => {
  const qc = new QueryClient()
  qc.setQueryData(['biaya-produksi', '2026-10'], items)
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <RujukanBiayaProduksi month="2026-10" />
    </QueryClientProvider>,
  )
}

describe('Rujukan biaya produksi', () => {
  it('groups the finished stages by weekly period with numbered details and a total', () => {
    const html = render([
      { tanggal: '2026-10-06', tahap: 'produksi', pihak: 'Tukang 1', jumlah: '300000' },
      { tanggal: '2026-10-07', tahap: 'produksi', pihak: 'Tukang 1', jumlah: '100000' },
      { tanggal: '2026-10-08', tahap: 'packing', pihak: '', jumlah: '10000' },
    ])
    expect(html).toContain('2. Periode')
    expect(html).toContain('2.1 Tukang kayu · Tukang 1')
    expect(html).toContain('400.000')
    expect(html).toContain('410.000')
    expect(html).toContain('Belum ada tahap yang selesai.')
  })
})
