import type { ReactNode } from 'react'

/** Page title (with an optional description) on the left, page actions on the right; wraps on phones. */
export default function BarHalaman({ judul, deskripsi, children }: { judul: string; deskripsi?: string; children?: ReactNode }) {
  return (
    <header className="bar-halaman">
      <div className="min-w-0">
        <h1 className="page-h1 font-heading text-2xl font-bold">{judul}</h1>
        {deskripsi && <p className="text-sm text-muted-foreground">{deskripsi}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
