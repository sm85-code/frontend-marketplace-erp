import type { ReactNode } from 'react'
import type { KolomTabel } from './TabelData'

/**
 * Phone view of a descriptive list (retur, promosi…): one compact card per record built from the
 * same columns as the desktop table. First column = card title, the rest as label: value lines.
 */
export default function DaftarKartu<T>({ label, items, kolom, idDari, aksi }: { label: string; items: T[]; kolom: KolomTabel<T>[]; idDari: (item: T) => string; aksi?: (item: T) => ReactNode }) {
  const [utama, ...lain] = kolom
  return (
    <ul aria-label={label} className="space-y-2 lg:hidden">
      {items.map((item) => (
        <li key={idDari(item)} className="min-w-0 space-y-1 rounded-lg border bg-card p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 break-words text-sm font-medium">{utama?.sel(item)}</div>
            {aksi?.(item)}
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
            {lain.map((k) => (
              <div key={k.kunci} className="contents">
                <dt className="text-muted-foreground">{k.judul}</dt>
                <dd className={`min-w-0 break-words ${k.rata === 'kanan' ? 'tabular-nums' : ''}`}>{k.sel(item)}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  )
}
