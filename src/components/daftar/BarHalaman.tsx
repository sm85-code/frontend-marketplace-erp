import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const ID_AKSI = 'aksi-halaman'

/** Page title (with an optional description) on the left, page actions on the right; wraps on phones. */
export default function BarHalaman({ judul, deskripsi, children }: { judul: string; deskripsi?: string; children?: ReactNode }) {
  return (
    <header className="bar-halaman">
      <div className="min-w-0">
        <h1 className="page-h1 font-heading text-2xl font-bold">{judul}</h1>
        {deskripsi && <p className="text-sm text-muted-foreground">{deskripsi}</p>}
      </div>
      {children && <div id={ID_AKSI} className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

/** Puts an action into the action row of the page's BarHalaman from deeper in the tree (the page needs a BarHalaman with children). */
export function AksiHalaman({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById(ID_AKSI)), [])
  return slot ? createPortal(children, slot) : null
}
