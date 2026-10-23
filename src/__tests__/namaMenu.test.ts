import { describe, expect, it } from 'vitest'
import { namaMenu, namaTab, tabKategori } from '@/lib/namaMenu'

const diatur: Record<string, string> = { 'menu:/operasional-packing': 'Operasional Eceran', 'tab:pengeluaran': 'Belanja' }
const t = (id: string, bawaan: string) => diatur[id] ?? bawaan

describe('labels follow Kelola Aplikasi', () => {
  it('uses the renamed menu and tab names', () => {
    expect(namaMenu(t, '/operasional-packing')).toBe('Operasional Eceran')
    expect(namaMenu(t, '/operasional-umum')).toBe('Operasional Umum')
    expect(namaTab(t, 'pengeluaran')).toBe('Belanja')
    expect(namaTab(t, 'arus_kas')).toBe('Arus Kas')
  })
  it('Kategori Transaksi tabs use the configured names', () => {
    expect(tabKategori(t).map((x) => x.label)).toEqual(['Arus Kas · Pemasukan', 'Arus Kas · Belanja', 'Operasional Umum', 'Operasional Eceran', 'Belanja Supplier'])
  })
  it('no hardcoded menu names in pages that show them as labels', () => {
    const files = import.meta.glob(['../pages/KategoriTransaksi.tsx', '../pages/ProcessingParties.tsx', '../pages/ProcessingPrices.tsx', '../components/WorkspaceOverlays.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(files)).toHaveLength(4)
    for (const src of Object.values(files))
      expect(src).not.toMatch(/'(Operasional Packing|Operasional Umum|Tukang Kayu|Supplier|Tarif Packing|Tarif Pengecatan|Katalog Produk Kayu)'|>Asisten AI</)
  })
})
