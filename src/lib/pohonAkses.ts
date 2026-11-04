import type { HalamanDef, Tingkat } from '@/api/types'
import { GRUP_NAV, NAV, type GrupNav } from '@/config/nav'
import { ubahCentang } from '@/lib/centangAkses'

/**
 * The role editor as a tree: menu group > menu > tab. Only the rows at the bottom (a permission key) are stored; a menu
 * or group row is the sum of the keys under it.
 *
 * Where each key sits: `[menu path, tab name]`. A key that is the menu itself has no tab name. A key the app does not
 * place (a newer server) is shown under its server group at menu level, with the server's label.
 */
export const LETAK_AKSES: Record<string, [string, string | null]> = {
  dashboard: ['/dashboard', null],
  laporan_ringkas: ['/dashboard', 'Ringkasan stok kritis'],
  pesanan: ['/pesanan', null],
  pesanan_manual: ['/pesanan', 'Buat & hapus pesanan manual'],
  retur: ['/pesanan', 'Retur & Refund'],
  chat: ['/chat', null],
  katalog: ['/katalog', null],
  katalog_lanjutan: ['/katalog', 'Pengaturan lanjutan Shopee'],
  promosi: ['/katalog', 'Promosi Diskon'],
  publikasi: ['/katalog', 'Buat / Salin Produk'],
  sinkron_shopee: ['/katalog', 'Sinkronisasi & kirim stok/harga'],
  produk: ['/produk', null],
  listing: ['/listing', null],
  processing_tukang: ['/processing/pemetaan', 'Tukang Kayu'],
  processing_supplier: ['/processing/pemetaan', 'Supplier'],
  processing_pengecatan: ['/processing/pemetaan', 'Pengecatan'],
  processing_packing: ['/processing/pemetaan', 'Packing'],
  data_tukang: ['/processing/tukang-kayu', null],
  data_supplier: ['/processing/supplier', null],
  data_produk_kayu: ['/processing/produk-kayu', null],
  data_katalog_manual: ['/processing/produk-non-kayu', 'Katalog Manual'],
  data_katalog_otomatis: ['/processing/produk-non-kayu', 'Katalog Otomatis'],
  data_tarif_pengecatan: ['/processing/tarif-pengecatan', null],
  data_tarif_packing: ['/processing/tarif-packing', null],
  data_template_inv: ['/processing/template', 'Invoice (INV)'],
  data_template_po: ['/processing/template', 'Purchase Order (PO)'],
  operasional_umum: ['/operasional-umum', null],
  operasional_packing: ['/operasional-packing', null],
  belanja_supplier: ['/belanja-supplier', null],
  belanja_tukang: ['/belanja-tukang', null],
  arus_kas: ['/arus-kas', 'Arus Kas'],
  arus_kas_rekening: ['/arus-kas', 'Rekening'],
  laporan_keuangan: ['/laporan-keuangan', 'Arus Kas, Transaksi, Laba/Rugi & Neraca'],
  laporan_tutup_buku: ['/laporan-keuangan', 'Tutup Buku'],
  pengaturan_toko_profil: ['/pengaturan-toko', 'Profil'],
  pengaturan_toko_pengiriman: ['/pengaturan-toko', 'Pengiriman'],
  pengaturan_toko_alamat: ['/pengaturan-toko', 'Alamat'],
  pengaturan_toko_libur: ['/pengaturan-toko', 'Mode Libur'],
  performa_toko: ['/performa-toko', null],
  iklan_performa: ['/iklan', 'Performa'],
  iklan_kampanye: ['/iklan', 'Kampanye Shopee'],
  iklan_gmv: ['/iklan', 'Shop GMV Max'],
  iklan_agen: ['/iklan', 'Agen'],
  iklan_catatan: ['/iklan', 'Catatan'],
  settlement_saldo: ['/settlement', 'Saldo Penjual'],
  settlement_pendapatan: ['/settlement', 'Menunggu Pencairan'],
  settlement_dana: ['/settlement', 'Dana Dilepas'],
  settlement_mutasi: ['/settlement', 'Mutasi Saldo'],
  kelola_toko: ['/toko', 'Toko & Sinkronisasi'],
  toko_penjualan: ['/toko', 'Toko Internal & Reseller'],
  otomasi: ['/toko', 'Drop Off, Balasan & Boost'],
  kelola_pengguna: ['/staff', 'Pengguna'],
  kelola_role: ['/staff', 'Role'],
  kelola_aplikasi: ['/kelola-aplikasi', null],
  kategori_transaksi: ['/kelola-aplikasi', 'Kategori Transaksi'],
  asisten: ['/asisten', null],
}

export interface SimpulAkses {
  id: string
  tingkatan: 0 | 1 | 2
  /** Default text; menus and groups are renamed by the caller with the Kelola Aplikasi texts. */
  label: string
  /** The menu path (menu rows) or group id (group rows), for the shown name. */
  menu?: string
  grup?: string
  /** The permission keys this row stands for (itself, or all rows under it). */
  kunci: HalamanDef[]
}

/** Rows of the tree in display order. Groups and menus without any key are left out. */
export function pohonAkses(halaman: HalamanDef[]): SimpulAkses[] {
  const per = new Map(halaman.map((h) => [h.id, h]))
  const dipakai = new Set<string>()
  const hasil: SimpulAkses[] = []
  for (const g of GRUP_NAV) {
    const baris: SimpulAkses[] = []
    for (const n of NAV.filter((x) => x.grup === g.id)) {
      if (hasil.some((r) => r.menu === n.to) || baris.some((r) => r.menu === n.to)) continue
      const milik = Object.entries(LETAK_AKSES).filter(([k, [to]]) => to === n.to && per.has(k))
      if (!milik.length) continue
      milik.forEach(([k]) => dipakai.add(k))
      const kunci = milik.map(([k]) => per.get(k) as HalamanDef)
      const sendiri = milik.filter(([, [, tab]]) => tab === null)
      const tab = milik.filter(([, [, t]]) => t !== null)
      if (!tab.length && sendiri.length === 1) {
        baris.push({ id: `menu:${n.to}`, tingkatan: 1, label: n.label, menu: n.to, kunci })
        continue
      }
      baris.push({ id: `menu:${n.to}`, tingkatan: 1, label: n.label, menu: n.to, kunci })
      // A menu that is itself a key and also has tabs shows its own key as the first row under it ("Halaman ini").
      for (const [k] of sendiri) baris.push({ id: k, tingkatan: 2, label: 'Halaman utama', kunci: [per.get(k) as HalamanDef] })
      for (const [k, [, t]] of tab) baris.push({ id: k, tingkatan: 2, label: t as string, kunci: [per.get(k) as HalamanDef] })
    }
    for (const h of halaman.filter((x) => !dipakai.has(x.id) && (x.grup_id ?? x.grup) === g.id)) {
      dipakai.add(h.id)
      baris.push({ id: h.id, tingkatan: 1, label: h.label, kunci: [h] })
    }
    if (!baris.length) continue
    hasil.push({ id: `grup:${g.id}`, tingkatan: 0, label: g.label, grup: g.id, kunci: baris.filter((b) => b.tingkatan === 1).flatMap((b) => b.kunci) })
    hasil.push(...baris)
  }
  const sisa = halaman.filter((h) => !dipakai.has(h.id))
  if (sisa.length) {
    hasil.push({ id: 'grup:lainnya', tingkatan: 0, label: 'Lainnya', kunci: sisa })
    for (const h of sisa) hasil.push({ id: h.id, tingkatan: 1, label: h.label, kunci: [h] })
  }
  return hasil
}

export type Centang = boolean | 'indeterminate'

/** The box of a row in one column: ticked when every key under it is, half when some are; null when no key has the level. */
export function centangSimpul(kunci: HalamanDef[], akses: Record<string, Tingkat>, kolom: Tingkat): Centang | null {
  const punya = kunci.filter((h) => h.tingkat.includes(kolom))
  if (!punya.length) return null
  const kena = punya.filter((h) => (kolom === 'baca' ? akses[h.id] !== undefined : akses[h.id] === 'tulis')).length
  return kena === 0 ? false : kena === punya.length ? true : 'indeterminate'
}

/**
 * Click on a row's box: a full box clears it for every key under the row, anything else ticks it for all of them. Tulis
 * brings Baca along; clearing Baca also clears Tulis (the same rule as one key).
 */
export function klikSimpul(kunci: HalamanDef[], akses: Record<string, Tingkat>, kolom: Tingkat): Record<string, Tingkat> {
  const nilai = centangSimpul(kunci, akses, kolom) !== true
  const next = { ...akses }
  for (const h of kunci) {
    const t = ubahCentang(h.tingkat, next[h.id], kolom, nilai)
    if (t) next[h.id] = t
    else delete next[h.id]
  }
  return next
}

export const GRUP_IDS = GRUP_NAV.map((g) => g.id) as GrupNav[]
