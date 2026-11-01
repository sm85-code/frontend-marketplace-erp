import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ItemSettings } from '@/api/management'
import { qk } from '@/api/keys'
import type { KatalogDetail } from '@/api/types'
import EditProdukShopeePage from './EditProdukShopee'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const router = vi.hoisted(() => ({ navigate: vi.fn(), key: 'langkah-2' }))

vi.mock('react-router-dom', async (orig) => {
  const asli = await orig<typeof import('react-router-dom')>()
  return {
    ...asli,
    useNavigate: () => router.navigate,
    useParams: () => ({ id: 'P1' }),
    useLocation: () => ({ key: router.key, pathname: '/katalog/P1/edit', search: '', hash: '', state: null }),
  }
})
vi.mock('@/components/ConfirmProvider', () => ({ useConfirm: () => vi.fn(async () => true) }))
vi.mock('@/api/endpoints', async (orig) => ({ ...(await orig<object>()), getKatalog: vi.fn() }))
vi.mock('@/api/management', async (orig) => ({ ...(await orig<object>()), settings: vi.fn(), editProduct: vi.fn() }))
// Radix's select needs a real window; the form only uses it to pick the category, which this test does not touch.
vi.mock('@/components/PilihNative', () => ({ default: (p: Record<string, unknown>) => <select data-uji="kategori" {...p} /> }))

const detail = {
  id: 'P1', akun_id: 'A1', nama_toko: 'AZFA DIGITAL INDONESIA', item_id: '9', nama: 'Batu Gamping Aktif', sku: 'BG-1',
  foto_utama: null, jumlah_foto: 1, harga_min: '20000', harga_max: '20000', stok_shopee: 993, jumlah_varian: 1,
  status: 'NORMAL', dikirim_toko_id: null, dikirim_at: null, foto: [], deskripsi_ringkas: '', deskripsi: '', varian: [],
} as unknown as KatalogDetail

const settings = {
  item_name: 'Batu Gamping Aktif', item_sku: 'BG-1', description: '', category_id: 100, attribute_list: [],
  brand: { brand_id: 0, original_brand_name: 'No Brand' }, image: { image_id_list: ['img-1'], image_url_list: ['https://contoh/1.jpg'] },
  weight: 1, dimension: { package_length: 1, package_width: 1, package_height: 1 },
  pre_order: { is_pre_order: false, days_to_ship: 2 }, models: [], tiers: [],
} as unknown as ItemSettings

let layar: ReactTestRenderer | undefined

const buka = async (): Promise<ReactTestRenderer> => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } } })
  qc.setQueryData(qk.katalogOne('P1'), detail)
  qc.setQueryData(['pengaturan-produk', 'P1'], settings)
  let r!: ReactTestRenderer
  await act(async () => { r = create(<QueryClientProvider client={qc}><EditProdukShopeePage /></QueryClientProvider>) })
  layar = r
  return r
}

const tekanKembali = async (r: ReactTestRenderer) => {
  const tombol = r.root.findAll((n) => n.props?.['aria-label'] === 'Kembali' && typeof n.props?.onClick === 'function')[0]
  expect(tombol, 'tombol kembali ada di layar edit').toBeTruthy()
  await act(async () => { tombol.props.onClick() })
}

afterEach(() => { layar?.unmount(); layar = undefined; router.navigate.mockReset(); router.key = 'langkah-2' })

describe('leaving the Shopee product form', () => {
  it('goes back one step to the page it was opened from, without leaving the form on the history stack', async () => {
    const r = await buka()
    await tekanKembali(r)
    expect(router.navigate).toHaveBeenCalledWith(-1)
    // A fresh address would push an entry, so the phone's Back button would open the form again.
    expect(router.navigate).toHaveBeenCalledTimes(1)
  })

  it('opens the detail page in place when the form was opened straight (link or refresh)', async () => {
    router.key = 'default'
    const r = await buka()
    await tekanKembali(r)
    expect(router.navigate).toHaveBeenCalledWith('/katalog/P1?tab=kelola', { replace: true })
  })
})
