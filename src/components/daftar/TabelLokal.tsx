import type { ReactNode } from 'react'
import { useUrutLokal, type Urut } from '@/lib/urut'
import TabelData, { type KolomTabel } from './TabelData'

/**
 * A table whose rows are all loaded already: sorting happens in the browser. Give a column a `nilai`
 * (its sortable value) and its header becomes clickable. Same declaration, density and phone layout as
 * TabelData; use this for small tables (dashboard, settings, lists without paging).
 */
export default function TabelLokal<T>({
  items,
  kolom,
  urutAwal = null,
  ...rest
}: {
  label: string
  items: T[] | undefined
  kolom: KolomTabel<T>[]
  idDari: (item: T) => string
  namaDari: (item: T) => string
  /** First sort, e.g. { kunci: 'omzet', arah: 'desc' }. */
  urutAwal?: Urut | null
  aksi?: (item: T) => ReactNode
  judulAksi?: string
  minWidth?: number
  footer?: ReactNode
}) {
  const nilaiDari = (item: T, kunci: string) => kolom.find((k) => k.kunci === kunci)?.nilai?.(item)
  const { hasil, urut, ubah } = useUrutLokal(items, nilaiDari, urutAwal)
  const dapatDiurut = kolom.map((k) => (k.nilai ? { ...k, urut: k.urut ?? { kunci: k.kunci } } : k))
  return <TabelData {...rest} items={hasil} kolom={dapatDiurut} urut={urut} onUrut={ubah} />
}
