import { useCallback, useState } from 'react'

/** Rows ticked in a list. Keeps the whole row (not just the id) so a batch can span pages and filters. */
export function useTerpilih<T extends { id: string }>() {
  const [peta, setPeta] = useState<Map<string, T>>(new Map())

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
    daftar: [...peta.values()],
    ukuran: peta.size,
    ada: (id: string) => peta.has(id),
    ubah,
    ubahBanyak,
    kosongkan: useCallback(() => setPeta(new Map()), []),
  }
}
