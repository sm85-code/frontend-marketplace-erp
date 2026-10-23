import type { KategoriTransaksi } from '@/api/kategori'

/** Gaji and iklan are typed into Arus Kas itself, never taken from the Operasional pages (as in operasionalArusKas.ts). */
const DIINPUT_DI_ARUS_KAS = new Set(['gaji', 'iklan'])

/**
 * Plain note of where a category's figures go, following the report engine:
 * an Arus Kas row given the category -> its group in Pemasukan / Pengeluaran (ringkasArusKas.ts)
 * -> Laba/Rugi (income in its "Pemasukan" line, expenses in the line of their group).
 * A category without a group ("bukan pemasukan/pengeluaran") stays in Arus Kas only.
 * An expense category placed on an Operasional page also takes that page's entries into Arus Kas.
 * `tab` and `halaman` give names as set on Kelola Aplikasi.
 */
export function aliranLaporan(k: Pick<KategoriTransaksi, 'id' | 'arah' | 'kelompok' | 'operasional'>, tab: (tabel: string) => string, halaman: Record<string, string>): string {
  const arus = tab('arus_kas')
  if (k.kelompok === '') return `Tidak masuk laporan laba/rugi: hanya tercatat di ${arus}.`
  const ringkas = k.arah === 'masuk' ? tab('pemasukan') : tab('pengeluaran')
  const baris = k.arah === 'masuk' ? tab('pemasukan') : k.kelompok
  const op = k.arah === 'keluar' && k.operasional && !DIINPUT_DI_ARUS_KAS.has(k.id) ? halaman[k.operasional] : ''
  return `${op ? `Dari ${op} → ` : ''}Masuk ke: ${arus} · ${ringkas} › ${k.kelompok} · ${tab('laba_rugi')} › ${baris}`
}
