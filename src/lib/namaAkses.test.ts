import { describe, expect, it } from 'vitest'
import type { HalamanDef } from '@/api/types'
import { idGrup, idMenu, NAV } from '@/config/nav'
import { kunciGrup, labelAkses, namaGrupAkses, petaMenuHalaman, urutGrupAkses } from './namaAkses'

/** A permission row as the server sends it (group id + default label). */
const baris = (id: string, label: string, grup: string): HalamanDef => ({ id, label, grup, grup_id: grup, tingkat: ['baca', 'tulis'] })

/** `t` as on Kelola Aplikasi: the texts the admin changed, else the app default. */
const teks = (ubah: Record<string, string>) => (id: string, bawaan: string) => ubah[id] ?? bawaan

const BACA = baris('arus_kas', 'Arus Kas (tulis = centang)', 'keuangan')

describe('nama halaman dan kelompok di tabel role', () => {
  it('maps a page to the menu that holds it, including composite and extra pages', () => {
    const peta = petaMenuHalaman()
    expect(peta['processing_tukang']).toEqual(['/processing/pemetaan'])
    expect(peta['data_katalog_manual']).toEqual(['/processing/produk-non-kayu'])
    expect(peta['kategori_transaksi']).toEqual(['/kelola-aplikasi'])
    expect(peta['info_toko']).toEqual(['/pengaturan-toko', '/performa-toko'])
    expect(peta['*']).toBeUndefined()
  })

  it('takes the page name from the menu text, so a rename on Kelola Aplikasi shows up here', () => {
    const t = teks({ [idMenu('/settlement')]: 'Saldo Shopee' })
    expect(labelAkses(t, baris('settlement', 'Dana & Saldo Shopee', 'info-toko'))).toBe('Saldo Shopee')
    expect(labelAkses(t, baris('pesanan', 'Pesanan', 'harian'))).toBe('Pesanan')
    expect(labelAkses(t, baris('kelola_pengguna', 'Kelola Pengguna', 'pengaturan'))).toBe('Kelola Pengguna')
  })

  it('keeps a row hint (tab, note) while the menu name is replaced', () => {
    const t = teks({ [idMenu('/arus-kas')]: 'Kas' })
    expect(labelAkses(t, BACA)).toBe('Kas (tulis = centang)')
    expect(labelAkses(teks({}), baris('processing_tukang', 'Pemetaan Order: tab Tukang Kayu', 'processing'))).toBe('Pemetaan Order: tab Tukang Kayu')
    expect(labelAkses(teks({ [idMenu('/processing/pemetaan')]: 'Order Produksi' }), baris('processing_packing', 'Pemetaan Order: tab Packing', 'processing'))).toBe('Order Produksi: tab Packing')
    expect(labelAkses(teks({}), baris('data_katalog_otomatis', 'Katalog Produk Non Kayu: tab Katalog Otomatis', 'data-produksi'))).toBe('Katalog Produk Non Kayu: tab Katalog Otomatis')
  })

  it('drops a stale extra phrase instead of keeping it after the menu name', () => {
    expect(labelAkses(teks({}), baris('kelola_pengguna', 'Kelola Pengguna dan Role', 'pengaturan'))).toBe('Kelola Pengguna')
  })

  it('joins the two menus of one row', () => {
    const t = teks({ [idMenu('/pengaturan-toko')]: 'Toko Saya' })
    expect(labelAkses(t, baris('info_toko', 'Performa dan Pengaturan Toko', 'info-toko'))).toBe('Toko Saya & Performa Toko')
  })

  it('leaves rows that are not a menu as the server sends them', () => {
    expect(labelAkses(teks({}), baris('pesanan_manual', 'Buat dan hapus pesanan manual', 'harian'))).toBe('Buat dan hapus pesanan manual')
    expect(labelAkses(teks({}), baris('kategori_transaksi', 'Kategori Transaksi', 'pengaturan'))).toBe('Kategori Transaksi')
    expect(labelAkses(teks({}), baris('retur', 'Retur & Refund', 'harian'))).toBe('Retur & Refund')
  })

  it('shows the group text of Kelola Aplikasi and falls back to an unknown group text', () => {
    const t = teks({ [idGrup('keuangan')]: 'Keuangan Toko' })
    expect(namaGrupAkses(t, 'keuangan')).toBe('Keuangan Toko')
    expect(namaGrupAkses(t, 'Iklan')).toBe('Iklan')
    expect(namaGrupAkses(teks({}), 'info-toko')).toBe('Info Toko')
  })

  it('orders the groups as the sidebar, unknown ones last and in the order they came', () => {
    expect(urutGrupAkses(['pengaturan', 'harian', 'info-toko', 'data-produksi'])).toEqual(['harian', 'data-produksi', 'info-toko', 'pengaturan'])
    expect(urutGrupAkses(['Iklan', 'keuangan', 'X'])).toEqual(['keuangan', 'Iklan', 'X'])
    expect(urutGrupAkses(NAV.map((n) => n.grup).filter((g, i, a) => a.indexOf(g) === i))).toEqual(['harian', 'produk', 'processing', 'data-produksi', 'keuangan', 'info-toko', 'pengaturan'])
  })

  it('reads the group id of a row, falling back to the older group text', () => {
    expect(kunciGrup({ id: 'pesanan', label: 'Pesanan', grup: 'Harian', tingkat: ['baca'] })).toBe('Harian')
    expect(kunciGrup(baris('pesanan', 'Pesanan', 'harian'))).toBe('harian')
  })
})
