import { describe, expect, it } from 'vitest'
import type { HalamanDef } from '@/api/types'
import { centangSimpul, klikSimpul, pohonAkses } from '@/lib/pohonAkses'

const h = (id: string, grup_id: string, tingkat: HalamanDef['tingkat'] = ['baca', 'tulis']): HalamanDef => ({ id, label: id, grup: grup_id, grup_id, tingkat })
const DAFTAR = [
  h('pesanan', 'harian'), h('pesanan_manual', 'harian', ['tulis']), h('retur', 'harian'),
  h('processing_tukang', 'processing'), h('processing_supplier', 'processing'),
  h('pengaturan_toko_profil', 'info-toko'), h('pengaturan_toko_libur', 'info-toko'), h('performa_toko', 'info-toko'),
  h('kelola_pengguna', 'pengaturan'), h('kelola_role', 'pengaturan'), h('baru_dari_server', 'pengaturan'),
]

describe('pohon akses', () => {
  const pohon = pohonAkses(DAFTAR)
  const baris = (id: string) => pohon.find((n) => n.id === id)!

  it('is group > menu > tab with short names only', () => {
    const urut = pohon.map((n) => `${n.tingkatan}:${n.label}`)
    expect(urut.slice(0, 5)).toEqual(['0:Harian', '1:Pesanan', '2:Halaman utama', '2:Buat & hapus pesanan manual', '2:Retur & Refund'])
    expect(urut).toContain('1:Pemetaan Order')
    expect(urut).toContain('2:Tukang Kayu')
    expect(urut).toContain('2:Mode Libur')
    expect(urut).toContain('1:Performa Toko')
    expect(urut).toContain('2:Role')
    expect(urut.some((u) => u.includes(':'.repeat(2)) || u.includes(': tab'))).toBe(false)
    expect(urut).toContain('1:baru_dari_server') // an unknown key still shows, under its server group
  })

  it('a parent stands for every key under it', () => {
    expect(baris('menu:/processing/pemetaan').kunci.map((k) => k.id)).toEqual(['processing_tukang', 'processing_supplier'])
    expect(baris('grup:info-toko').kunci.map((k) => k.id).sort()).toEqual(['pengaturan_toko_libur', 'pengaturan_toko_profil', 'performa_toko'])
  })

  it('tri-state: none, some, all', () => {
    const menu = baris('menu:/processing/pemetaan').kunci
    expect(centangSimpul(menu, {}, 'baca')).toBe(false)
    expect(centangSimpul(menu, { processing_tukang: 'baca' }, 'baca')).toBe('indeterminate')
    expect(centangSimpul(menu, { processing_tukang: 'baca', processing_supplier: 'tulis' }, 'baca')).toBe(true)
    expect(centangSimpul(menu, { processing_tukang: 'baca', processing_supplier: 'tulis' }, 'tulis')).toBe('indeterminate')
    expect(centangSimpul([h('x', 'harian', ['tulis'])], {}, 'baca')).toBeNull() // no such level
  })

  it('ticking a parent ticks every child; Tulis brings Baca; clearing Baca clears Tulis', () => {
    const menu = baris('menu:/pengaturan-toko').kunci
    const tulis = klikSimpul(menu, {}, 'tulis')
    expect(tulis).toEqual({ pengaturan_toko_profil: 'tulis', pengaturan_toko_libur: 'tulis' })
    expect(centangSimpul(menu, tulis, 'baca')).toBe(true)
    expect(klikSimpul(menu, tulis, 'baca')).toEqual({})
    expect(klikSimpul(menu, { pengaturan_toko_profil: 'baca' }, 'baca')).toEqual({ pengaturan_toko_profil: 'baca', pengaturan_toko_libur: 'baca' })
    expect(klikSimpul(menu, tulis, 'tulis')).toEqual({ pengaturan_toko_profil: 'baca', pengaturan_toko_libur: 'baca' })
  })

  it('a write-only key under a parent gets Tulis but is left alone by Baca', () => {
    const menu = baris('menu:/pesanan').kunci
    expect(klikSimpul(menu, {}, 'baca')).toEqual({ pesanan: 'baca', retur: 'baca' })
    expect(klikSimpul(menu, {}, 'tulis')).toEqual({ pesanan: 'tulis', pesanan_manual: 'tulis', retur: 'tulis' })
  })
})
