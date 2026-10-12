import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import { useAuth } from '@/lib/auth'
import { bacaSimpan, tulisSimpan } from '@/lib/simpan'

/** A shop filter belongs to its page and user, never to the whole ERP. */
export function useTokoAktif(single = false) {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const key = `erp.toko.halaman.${user?.id ?? 'anonymous'}.${pathname}`
  const read = () => new URLSearchParams(search).get('toko') ?? bacaSimpan(key) ?? ''
  const [selection, setSelection] = useState(() => ({ key, value: read() }))
  // A persistent floating assistant can remain mounted during navigation.
  // Never expose the previous page's selection while the effect catches up.
  const stored = selection.key === key ? selection.value : read()
  const shops = useQuery({
    queryKey: ['akun'],
    queryFn: () => listAkun(),
    enabled: !!user,
  })
  useEffect(() => {
    const update = (event?: Event) => {
      if (event && (event as CustomEvent<string>).detail !== key) return
      setSelection({ key, value: bacaSimpan(key) ?? '' })
    }
    const linked = new URLSearchParams(search).get('toko')
    if (linked !== null) {
      setSelection({ key, value: linked })
      tulisSimpan(key, linked)
    } else update()
    window.addEventListener('erp-toko', update)
    return () => window.removeEventListener('erp-toko', update)
  }, [key, search])
  const value = shops.data?.some((s) => s.id === stored)
    ? stored
    : single && shops.data?.length === 1
      ? shops.data[0].id
      : ''
  const change = useCallback(
    (next: string) => {
      if (next && !shops.data?.some((s) => s.id === next)) return
      tulisSimpan(key, next)
      setSelection({ key, value: next })
      window.dispatchEvent(new CustomEvent('erp-toko', { detail: key }))
    },
    [key, shops.data],
  )
  return [value, change] as const
}
