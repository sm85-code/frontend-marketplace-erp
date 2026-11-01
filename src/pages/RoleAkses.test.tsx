import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { HalamanDef, RoleDef } from '@/api/types'
import RoleAkses from './RoleAkses'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ muatUlangAkses: async () => {} }) }))
vi.mock('@/components/ConfirmProvider', () => ({ useConfirm: () => async () => true }))

const halaman = (id: string, label: string, grup: string, grup_id: string): HalamanDef => ({ id, label, grup, grup_id, tingkat: ['baca', 'tulis'] })

const HALAMAN: HalamanDef[] = [
  halaman('arus_kas', 'Arus Kas (tulis = centang)', 'Keuangan', 'keuangan'),
  halaman('push_shopee', 'Pengaturan push Shopee', 'Pengaturan', 'pengaturan'),
  halaman('kategori_transaksi', 'Kategori Transaksi', 'Pengaturan', 'pengaturan'),
]

const ROLE: RoleDef = {
  id: 'owner',
  nama: 'Owner',
  keterangan: 'Pemilik toko',
  akses_toko: 'semua',
  sistem: true,
  terkunci: false,
  jumlah_pengguna: 1,
  // The server still sends the page: the form keeps it, the table just does not show it.
  halaman: { arus_kas: 'tulis', push_shopee: 'tulis', kategori_transaksi: 'baca' },
}

function render(halamanDari: HalamanDef[] = HALAMAN, roles: RoleDef[] = [ROLE]) {
  const qc = new QueryClient()
  qc.setQueryData(['roles'], { halaman: halamanDari, roles })
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RoleAkses />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('tabel role', () => {
  it('does not list the internal Shopee push page, while its group keeps its other rows', () => {
    const html = render()
    expect(html).not.toContain('Pengaturan push Shopee')
    expect(html).not.toContain('push_shopee')
    expect(html).toContain('Kategori Transaksi')
    expect(html).toContain('Arus Kas (tulis = centang)')
  })

  it('leaves no empty group title behind when the internal page was the only row of a group', () => {
    const html = render([halaman('push_shopee', 'Pengaturan push Shopee', 'Pengaturan', 'pengaturan')])
    expect(html).not.toContain('Pengaturan')
  })
})
