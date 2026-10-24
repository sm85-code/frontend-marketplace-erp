import { useEffect, useState, type ReactNode } from 'react'
import Paginasi from './Paginasi'
import { useUrutLokal, type Urut } from '@/lib/urut'
import TabelData, { type KolomTabel, type PilihanTabel } from './TabelData'

/**
 * A table whose rows are all loaded already: sorting happens in the browser. Give a column a `nilai`
 * (its sortable value) and its header becomes clickable. Same declaration, density and phone layout as
 * TabelData; use this for small tables (dashboard, settings, lists without paging).
 */
export default function TabelLokal<T>({
  items,
  kolom,
  urutAwal = null,
  kartu,
  ...rest
}: {
  label: string
  items: T[] | undefined
  kolom: KolomTabel<T>[]
  idDari: (item: T) => string
  namaDari: (item: T) => string
  /** First sort, e.g. { kunci: 'omzet', arah: 'desc' }. */
  urutAwal?: Urut | null
  pilihan?: PilihanTabel<T>
  aksi?: (item: T) => ReactNode
  judulAksi?: string
  minWidth?: number
  /** Rows per page (10 by default). */
  perHalaman?: number
  footer?: ReactNode
  /** Phone cards share the table sorting and pagination. */
  kartu?: (item: T) => ReactNode
}) {
  const [page, setPage] = useState(1)
  const nilaiDari = (item: T, kunci: string) =>
    kolom.find((k) => k.kunci === kunci)?.nilai?.(item)
  const { hasil, urut, ubah } = useUrutLokal(items, nilaiDari, urutAwal)
  const dapatDiurut = kolom.map((k) =>
    k.nilai ? { ...k, urut: k.urut ?? { kunci: k.kunci } } : k,
  )
  const identity = hasil.map(rest.idDari).join('|')
  useEffect(() => setPage(1), [identity])
  const n = rest.perHalaman ?? 10
  const pages = Math.max(1, Math.ceil(hasil.length / n))
  const current = Math.min(page, pages)
  const visible = hasil.slice((current - 1) * n, current * n)
  const eligible = visible.filter(
    (item) => !rest.pilihan?.bisaDipilih || rest.pilihan.bisaDipilih(item),
  )
  const selection = rest.pilihan
    ? {
        ...rest.pilihan,
        semuaDipilih:
          eligible.length > 0 &&
          eligible.every((item) => rest.pilihan!.terpilih(rest.idDari(item))),
        adaYangBisaDipilih: eligible.length > 0,
        onUbahSemua: (selected: boolean) =>
          eligible.forEach((item) => rest.pilihan!.onUbah(item, selected)),
      }
    : undefined
  return (
    <div className="space-y-3">
      <div className={kartu ? "hidden lg:block" : undefined}><TabelData
        {...rest}
        pilihan={selection}
        items={visible}
        kolom={dapatDiurut}
        urut={urut}
        onUrut={ubah}
      /></div>
      {kartu && <div className="grid gap-3 sm:grid-cols-2 lg:hidden">{visible.map(item => <div key={rest.idDari(item)} className="min-w-0">{kartu(item)}</div>)}</div>}
      {pages > 1 && (
        <p className="text-xs text-center text-muted-foreground">
          {(current - 1) * n + 1}–{Math.min(current * n, hasil.length)} dari{' '}
          {hasil.length}
        </p>
      )}
      <Paginasi halaman={current} totalHalaman={pages} onUbah={setPage} />
    </div>
  )
}
