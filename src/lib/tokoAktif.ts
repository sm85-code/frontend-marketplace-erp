import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import { useAuth } from '@/lib/auth'
import { bacaSimpan, tulisSimpan } from '@/lib/simpan'

/** Remember only a shop the current user may access; the backend remains authoritative. */
export function useTokoAktif(single = false) {
  const { user } = useAuth()
  const {search}=useLocation()
  const key = `erp.toko.${user?.id ?? 'anonymous'}`
  const [stored, setStored] = useState(
    () =>
      new URLSearchParams(search).get('toko') ??
      bacaSimpan(key) ??
      '',
  )
  const shops = useQuery({
    queryKey: ['akun'],
    queryFn: () => listAkun(),
    enabled: !!user,
  })
  useEffect(() => {
    const update = () => setStored(bacaSimpan(key) ?? '')
    const linked = new URLSearchParams(search).get('toko')
    if (linked !== null) {
      setStored(linked)
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
      setStored(next)
      window.dispatchEvent(new Event('erp-toko'))
    },
    [key, shops.data],
  )
  return [value, change] as const
}
