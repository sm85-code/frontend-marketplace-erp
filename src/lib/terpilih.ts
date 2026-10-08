import { useCallback, useEffect, useState } from 'react'

const EMPTY_ROWS: never[] = []

/** Rows ticked in a list. Keeps the whole row (not just the id) so a batch can span pages and filters. */
export function useTerpilih<T extends { id: string }>(terkini: T[] = EMPTY_ROWS) {
  const [peta, setPeta] = useState<Map<string, T>>(new Map())

  useEffect(() => {
    setPeta(prev => {
      const next = new Map(prev)
      let changed = false
      for (const item of terkini) {
        if (prev.has(item.id) && prev.get(item.id) !== item) { next.set(item.id, item); changed = true }
      }
      return changed ? next : prev
    })
  }, [terkini])

  const ubah = useCallback((item: T, pilih: boolean) => {
    setPeta((prev) => {
      const next = new Map(prev)
      if (pilih) next.set(item.id, item)
      else next.delete(item.id)
      return next
    })
  }, [])

  const ubahBanyak = useCallback((items: T[], pilih: boolean) => {
    setPeta((prev) => {
      const next = new Map(prev)
      for (const item of items) {
        if (pilih) next.set(item.id, item)
        else next.delete(item.id)
      }
      return next
    })
  }, [])

  return {
    daftar: [...peta.values()].map((item) => terkini.find((row) => row.id === item.id) ?? item),
    ukuran: peta.size,
    ada: (id: string) => peta.has(id),
    ubah,
    ubahBanyak,
    kosongkan: useCallback(() => setPeta(new Map()), []),
  }
}
