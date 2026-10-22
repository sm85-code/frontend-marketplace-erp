import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RujukanBiayaProduksi from './RujukanBiayaProduksi'

const render = (data: unknown) => {
  const qc = new QueryClient()
  qc.setQueryData(['biaya-produksi', '2026-10'], data)
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <RujukanBiayaProduksi month="2026-10" />
    </QueryClientProvider>,
  )
}

describe('Rujukan pembayaran produksi & tagihan reseller', () => {
  it('lists payments to craftsmen and the components billed to each reseller per weekly period', () => {
    const html = render({
      pembayaran: [
        { tanggal: '2026-10-06', tahap: 'produksi', pihak: 'Tukang 1', jumlah: '300000' },
        { tanggal: '2026-10-07', tahap: 'produksi', pihak: 'Tukang 1', jumlah: '100000' },
      ],
      tagihan: [{ tanggal: '2026-10-08', reseller: 'Reseller A', harga_produk: '400000', cat_packing: '80000', biaya_proses: '20000', packing_kayu: '0' }],
    })
    expect(html).toContain('2.1 Tukang kayu · Tukang 1')
    expect(html).toContain('400.000')
    expect(html).toContain('2.2 Reseller A · Harga produk')
    expect(html).toContain('2.3 Reseller A · Cat + packing')
    expect(html).toContain('2.4 Reseller A · Biaya proses')
    expect(html).not.toContain('Packing kayu')
    expect(html).toContain('Belum ada tahap yang selesai.')
  })
})
