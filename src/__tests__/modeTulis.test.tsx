import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AksiLainnya from '@/components/AksiLainnya'
import { HanyaTulis, KunciBaca, ModeTulisProvider } from '@/lib/modeTulis'
import { bisa, PENGATURAN_TOKO, SETTLEMENT, TAB_SETTLEMENT } from '@/lib/akses'

const html = (boleh: boolean, isi: React.ReactNode) => renderToStaticMarkup(<ModeTulisProvider boleh={boleh}>{isi}</ModeTulisProvider>)

describe('read-only pages', () => {
  it('hides edit actions and disables forms for Baca only', () => {
    expect(html(false, <AksiLainnya><button>Hapus</button></AksiLainnya>)).toBe('')
    expect(html(true, <AksiLainnya><button>Hapus</button></AksiLainnya>)).toContain('Aksi lainnya')
    expect(html(false, <AksiLainnya baca><button>Ekspor</button></AksiLainnya>)).toContain('Aksi lainnya')
    expect(html(false, <HanyaTulis><button>Tambah</button></HanyaTulis>)).toBe('')
    expect(html(false, <KunciBaca><input /></KunciBaca>)).toContain('<fieldset disabled')
    expect(html(true, <KunciBaca><input /></KunciBaca>)).not.toContain('fieldset')
    expect(html(true, <KunciBaca boleh={false}><input /></KunciBaca>)).toContain('Hanya baca')
  })

  it('a role from before the split still opens the tabs with the old key', () => {
    const lama = { role: 'x', nama: 'x', akses_toko: 'semua' as const, halaman: { info_toko: 'baca' as const, settlement: 'tulis' as const } }
    expect(bisa(lama, PENGATURAN_TOKO)).toBe(true)
    expect(bisa(lama, PENGATURAN_TOKO, 'tulis')).toBe(false)
    expect(bisa(lama, TAB_SETTLEMENT.dana, 'tulis')).toBe(true)
    const baru = { ...lama, halaman: { settlement_mutasi: 'baca' as const } }
    expect(bisa(baru, SETTLEMENT)).toBe(true)
    expect(bisa(baru, TAB_SETTLEMENT.dana)).toBe(false)
    expect(bisa(baru, PENGATURAN_TOKO)).toBe(false)
  })
})
