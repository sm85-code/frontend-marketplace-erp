import { useCallback, useState } from 'react'

/**
 * State of a list page's filters plus its page number. Any filter change goes back to page 1, so a page
 * never has to remember to do that. `awal` must be a stable object (declare it at module level).
 */
export function useFilterDaftar<F extends Record<string, string | boolean>>(awal: F) {
  const [nilai, setNilai] = useState<F>(awal)
  const [halaman, setHalaman] = useState(1)

  const ubah = useCallback((patch: Partial<F>) => {
    setNilai((prev) => ({ ...prev, ...patch }))
    setHalaman(1)
  }, [])

  const reset = useCallback(() => {
    setNilai(awal)
    setHalaman(1)
  }, [awal])

  /** True when anything differs from the defaults (shows "Reset filter"). */
  const berubah = (Object.keys(awal) as (keyof F)[]).some((k) => nilai[k] !== awal[k])

  return { nilai, ubah, reset, berubah, halaman, setHalaman }
}
