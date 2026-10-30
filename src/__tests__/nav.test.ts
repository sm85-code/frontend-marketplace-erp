import { describe, expect, it } from 'vitest'
import { filterNav, GRUP_NAV, itemBawah, itemBawahDipilih, kelompokNav, NAV } from '@/config/nav'
import { aksesBawaan } from './aksesBawaan'

describe('filterNav', () => {
  it('returns nothing for a logged-out user', () => {
    expect(filterNav(null)).toEqual([])
  })

  it('admin sees every nav item; owner cannot see Iklan or Settlement', () => {
    expect(filterNav(aksesBawaan('admin')).length).toBe(NAV.length)
    expect(filterNav(aksesBawaan('owner')).map((n) => n.to)).toEqual(NAV.map((n) => n.to).filter((to) => !to.startsWith('/processing/') && ![ '/laporan-keuangan', '/arus-kas', '/iklan', '/settlement', '/toko', '/staff', '/performa-toko', '/asisten', '/kelola-aplikasi', '/pengaturan-toko'].includes(to)))
  })

  it('staff gets the shared pages and Arus Kas, in workflow order', () => {
    const paths = filterNav(aksesBawaan('staff')).map((n) => n.to)
    expect(paths).toEqual(['/dashboard', '/pesanan', '/chat', '/katalog', '/arus-kas', '/profile'])
  })
})

describe('menu order follows the daily workflow', () => {
  it('lists the sections: harian, produk, keuangan, pengaturan', () => {
    expect(GRUP_NAV.map((g) => g.id)).toEqual(['harian', 'produk', 'processing', 'data-produksi', 'keuangan', 'info-toko', 'pengaturan'])
  })

  it('groups the admin menu as agreed (Toko lives under Pengaturan; Iklan and Dana & Saldo Shopee sit in Info Toko)', () => {
    const peta = Object.fromEntries(kelompokNav(filterNav(aksesBawaan('admin'))).map((g) => [g.grup.id, g.items.map((n) => n.to)]))
    expect(peta).toEqual({
      harian: ['/dashboard', '/pesanan', '/chat'],
      produk: ['/katalog', '/produk', '/listing'],
      processing: ['/processing/pemetaan'],
      'data-produksi': ['/processing/tukang-kayu', '/processing/supplier', '/processing/produk-kayu', '/processing/produk-non-kayu', '/processing/tarif-pengecatan', '/processing/tarif-packing', '/processing/template'],
      keuangan: ['/operasional-umum', '/operasional-packing', '/belanja-supplier', '/belanja-tukang', '/arus-kas', '/laporan-keuangan'],
      'info-toko': ['/pengaturan-toko', '/performa-toko', '/iklan', '/settlement'],
      pengaturan: ['/toko', '/staff', '/kelola-aplikasi', '/asisten', '/profile'],
    })
  })

  it('hides Iklan from owner and staff (ads move real money: admin only)', () => {
    for (const role of ['owner', 'staff'] as const) {
      const semua = kelompokNav(filterNav(aksesBawaan(role))).flatMap((g) => g.items.map((n) => n.to))
      expect(semua.some(path => path.startsWith('/processing'))).toBe(false)
      expect(semua).not.toContain('/laporan-keuangan')
      expect(semua).not.toContain('/iklan')
      expect(semua).not.toContain('/settlement')
    }
    // owner may only look at the two Operasional pages by default; the rest of Keuangan stays admin-only
    expect(kelompokNav(filterNav(aksesBawaan('owner'))).find((g) => g.grup.id === 'keuangan')?.items.map((n) => n.to)).toEqual(['/operasional-umum', '/operasional-packing', '/belanja-supplier', '/belanja-tukang'])
  })

  it('drops sections a role cannot see anything in (staff sees Keuangan for Arus Kas only)', () => {
    const grup = kelompokNav(filterNav(aksesBawaan('staff'))).map((g) => g.grup.id)
    expect(grup).toEqual(['harian', 'produk', 'keuangan', 'pengaturan'])
  })

  it('every nav item belongs to a known section', () => {
    const dikenal = new Set(GRUP_NAV.map((g) => g.id))
    expect(NAV.every((n) => dikenal.has(n.grup))).toBe(true)
  })
})

describe('phone bottom bar', () => {
  it('every role has Dashboard, Katalog, Chat, Pesanan before Lainnya', () => {
    for (const role of ['admin', 'owner', 'staff'] as const) {
      expect(itemBawah(filterNav(aksesBawaan(role))).map((n) => n.to)).toEqual(['/dashboard', '/katalog', '/chat', '/pesanan'])
    }
  })

  it('staff: dashboard, orders, shop and profile', () => {
    expect(itemBawah(filterNav(aksesBawaan('staff'))).map((n) => n.to)).toEqual(['/dashboard', '/katalog', '/chat', '/pesanan'])
  })

  it('never shows more tabs than asked for', () => {
    expect(itemBawah(filterNav(aksesBawaan('owner')), 2).map((n) => n.to)).toEqual(['/dashboard', '/katalog'])
  })
})

describe('bottom bar chosen on Kelola Aplikasi', () => {
  const menu = filterNav(aksesBawaan('staff'))
  it('keeps the built-in bar when nothing is chosen', () => {
    expect(itemBawahDipilih(menu, undefined).map((n) => n.to)).toEqual(itemBawah(menu).map((n) => n.to))
    expect(itemBawahDipilih(menu, '').map((n) => n.to)).toEqual(itemBawah(menu).map((n) => n.to))
  })
  it('follows the chosen order and drops menus the role cannot open or that are repeated', () => {
    expect(itemBawahDipilih(menu, '/chat, /dashboard,/chat,/settlement,/profile').map((n) => n.to)).toEqual(['/chat', '/dashboard', '/profile'])
  })
  it('never shows more than four tabs, and falls back when nothing usable is chosen', () => {
    expect(itemBawahDipilih(menu, '/dashboard,/pesanan,/chat,/katalog,/profile').map((n) => n.to)).toEqual(['/dashboard', '/pesanan', '/chat', '/katalog'])
    expect(itemBawahDipilih(menu, '/settlement').map((n) => n.to)).toEqual(itemBawah(menu).map((n) => n.to))
  })
})

describe('Pemetaan Order and every menu of Data Produksi are separate pages', () => {
  const akses = (halaman: Record<string, 'baca' | 'tulis'>) => ({ role: 'x', nama: 'x', akses_toko: 'semua', halaman }) as never
  const proses = (halaman: Record<string, 'baca' | 'tulis'>) => filterNav(akses(halaman)).map((n) => n.to).filter((to) => to.startsWith('/processing/'))

  it('shows each staff member only the menus they were given', () => {
    expect(proses({ processing_tukang: 'tulis' })).toEqual(['/processing/pemetaan'])
    expect(proses({ data_tukang: 'tulis', data_template: 'baca' })).toEqual(['/processing/tukang-kayu', '/processing/template'])
  })

  it.each(['processing_tukang', 'processing_supplier', 'processing_pengecatan', 'processing_packing'])('shows Pemetaan Order for %s at either level without a parent permission', (tab) => {
    for (const level of ['baca', 'tulis'] as const) {
      expect(proses({ [tab]: level })).toEqual(['/processing/pemetaan'])
    }
  })

  it('hides Pemetaan Order without tabs, including an obsolete parent permission', () => {
    expect(proses({})).toEqual([])
    expect(proses({ processing: 'tulis' })).toEqual([])
    expect(proses({ data_tukang: 'tulis' })).not.toContain('/processing/pemetaan')
  })

  it('shows Katalog Produk Non Kayu when either of its tabs is given', () => {
    expect(proses({ data_katalog_manual: 'baca' })).toEqual(['/processing/produk-non-kayu'])
    expect(proses({ data_katalog_otomatis: 'baca' })).toEqual(['/processing/produk-non-kayu'])
  })
})

describe('Kategori Transaksi lives on Kelola Aplikasi', () => {
  it('a role with only kategori_transaksi still sees Kelola Aplikasi, and the old menu is gone', () => {
    const akses = { role: 'x', nama: 'x', akses_toko: 'semua', halaman: { kategori_transaksi: 'baca' } } as never
    expect(filterNav(akses).map((n) => n.to)).toContain('/kelola-aplikasi')
    expect(NAV.map((n) => n.to)).not.toContain('/kategori-transaksi')
  })
})
