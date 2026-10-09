import { useTokoAktif } from '@/lib/tokoAktif'
import { useCallback, useEffect, useState } from 'react'

/**
 * State of a list page's filters plus its page number. Any filter change goes back to page 1, so a page
 * never has to remember to do that. `awal` must be a stable object (declare it at module level).
 */
export function useFilterDaftar<F extends Record<string, string | boolean>>(
  awal: F,
) {
  const [toko, setToko] = useTokoAktif()
  const [nilai, setNilai] = useState<F>(() => {
    const query = new URLSearchParams(window.location.search)
    return Object.fromEntries(
      Object.entries(awal).map(([key, value]) => [
        key,
        typeof value === 'string'
          ? (query.get(key) ?? (key === 'toko' ? toko : value))
          : value,
      ]),
    ) as F
  })
  const [halaman, setHalaman] = useState(1)
  useEffect(() => {
    if ('toko' in awal) {
      setNilai((prev) => ({ ...prev, toko }))
      setHalaman(1)
    }
  }, [toko, awal])

  const ubah = useCallback(
    (patch: Partial<F>) => {
      if (typeof patch.toko === 'string') setToko(patch.toko)
      setNilai((prev) => ({ ...prev, ...patch }))
      setHalaman(1)
    },
    [setToko],
  )

  const reset = useCallback(() => {
    if (typeof awal.toko === 'string') setToko(awal.toko)
    setNilai(awal)
    setHalaman(1)
  }, [awal, setToko])

  /** True when anything differs from the defaults (shows "Reset filter"). */
  const jumlahAktif = (Object.keys(awal) as (keyof F)[]).filter(
    (k) => nilai[k] !== awal[k],
  ).length

  return {
    nilai,
    ubah,
    reset,
    berubah: jumlahAktif > 0,
    jumlahAktif,
    halaman,
    setHalaman,
  }
}
