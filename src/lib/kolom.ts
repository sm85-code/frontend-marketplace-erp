import { useState } from 'react'
import { bacaSimpan, tulisSimpan } from '@/lib/simpan'

/** What the column picker needs to know about a column. `bawaan: false` = hidden until the user turns it on. */
export interface DefinisiKolom {
  kunci: string
  judul: string
  bawaan?: boolean
}

export const kolomBawaan = (semua: DefinisiKolom[]): string[] => semua.filter((k) => k.bawaan !== false).map((k) => k.kunci)

/** Saved choice -> valid keys in the table's own order; anything unknown, empty or unreadable falls back to the defaults. */
export function bacaKolomTersimpan(raw: string | null, semua: DefinisiKolom[]): string[] {
  try {
    const arr = JSON.parse(raw ?? 'null')
    if (!Array.isArray(arr)) return kolomBawaan(semua)
    const dipilih = new Set(arr)
    const hasil = semua.map((k) => k.kunci).filter((k) => dipilih.has(k))
    return hasil.length ? hasil : kolomBawaan(semua)
  } catch {
    return kolomBawaan(semua)
  }
}

/** Which columns are shown, remembered in the browser under `kunciSimpan`. At least one column always stays on. */
export function useKolomTersimpan(kunciSimpan: string, semua: DefinisiKolom[]) {
  const [tampil, setTampil] = useState(() => bacaKolomTersimpan(bacaSimpan(kunciSimpan), semua))

  function simpan(next: string[]) {
    setTampil(next)
    tulisSimpan(kunciSimpan, JSON.stringify(next))
  }

  return {
    tampil,
    ubah(kunci: string, aktif: boolean) {
      const next = semua.map((k) => k.kunci).filter((k) => (k === kunci ? aktif : tampil.includes(k)))
      if (next.length) simpan(next)
    },
    reset: () => simpan(kolomBawaan(semua)),
    preset: (keys: string[]) => simpan(semua.map(k=>k.kunci).filter(k=>keys.includes(k))),
  }
}
