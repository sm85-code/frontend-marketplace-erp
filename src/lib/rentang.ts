export type PresetTanggal = 'semua' | 'hari_ini' | '7' | '30' | '90' | 'bulan_ini' | 'kustom'

export const PRESET_LABEL: Record<PresetTanggal, string> = {
  semua: 'Semua tanggal',
  hari_ini: 'Hari ini',
  '7': '7 hari terakhir',
  '30': '30 hari terakhir',
  '90': '90 hari terakhir',
  bulan_ini: 'Bulan ini',
  kustom: 'Pilih tanggal…',
}

/** An ISO time -> its day in the browser's time zone as YYYY-MM-DD (what the Ads API takes as a date). */
export function keTanggal(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  const dua = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`
}

const awalHari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const akhirHari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

/** "2026-10-04" (a date input value) -> that day in the browser's time zone; null when empty or invalid. */
function hariLokal(nilai: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nilai)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/**
 * Preset -> ISO bounds for the API (whole local days, so "hari ini" means today in the user's time zone).
 * N days includes today. `semua` has no bounds; a custom range may leave either side empty.
 */
export function rentangTanggal(
  preset: PresetTanggal,
  kustom: { dari: string; sampai: string } = { dari: '', sampai: '' },
  sekarang: Date = new Date(),
): { dari?: string; sampai?: string } {
  const hariIni = awalHari(sekarang)
  switch (preset) {
    case 'semua':
      return {}
    case 'hari_ini':
      return { dari: hariIni.toISOString(), sampai: akhirHari(sekarang).toISOString() }
    case '7':
    case '30':
    case '90': {
      const awal = new Date(hariIni)
      awal.setDate(awal.getDate() - (Number(preset) - 1))
      return { dari: awal.toISOString(), sampai: akhirHari(sekarang).toISOString() }
    }
    case 'bulan_ini':
      return { dari: new Date(sekarang.getFullYear(), sekarang.getMonth(), 1).toISOString(), sampai: akhirHari(sekarang).toISOString() }
    case 'kustom': {
      const dari = hariLokal(kustom.dari)
      const sampai = hariLokal(kustom.sampai)
      return { dari: dari?.toISOString(), sampai: sampai ? akhirHari(sampai).toISOString() : undefined }
    }
  }
}
