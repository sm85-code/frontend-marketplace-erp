import type { LucideIcon } from 'lucide-react'

export interface OpsiTampilan<V extends string> {
  value: V
  label: string
  ikon: LucideIcon
}

/** Segmented switch (e.g. Grid / List) with a visible label, aria-pressed buttons and a focus ring. */
export default function PilihTampilan<V extends string>({
  id,
  label = 'Tampilan',
  nilai,
  onUbah,
  opsi,
}: {
  id: string
  label?: string
  nilai: V
  onUbah: (v: V) => void
  opsi: OpsiTampilan<V>[]
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span id={id} className="text-sm font-medium">
        {label}
      </span>
      <div className="inline-flex h-11 overflow-hidden rounded-2xl border" role="group" aria-labelledby={id}>
        {opsi.map(({ value, label: teks, ikon: Ikon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onUbah(value)}
            aria-pressed={nilai === value}
            className={
              'flex flex-1 items-center justify-center gap-1.5 px-3 text-[length:var(--teks-data)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ' +
              (nilai === value ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')
            }
          >
            <Ikon className="size-4" aria-hidden="true" /> {teks}
          </button>
        ))}
      </div>
    </div>
  )
}
