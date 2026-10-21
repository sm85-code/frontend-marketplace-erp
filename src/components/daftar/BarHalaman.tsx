import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useLabel } from '@/api/pengaturanUi'
import { idMenu, NAV } from '@/config/nav'

const ID_AKSI = 'aksi-halaman'

/** Page title (with an optional description) on the left, page actions on the right; wraps on phones. */
export default function BarHalaman({ judul, deskripsi, children }: { judul: string; deskripsi?: string; children?: ReactNode }) {
  const t = useLabel()
  const { pathname } = useLocation()
  // A title that is the menu text of this very page follows what the admin set for that menu on Kelola Aplikasi.
  const menu = NAV.find((n) => n.to === pathname && n.label === judul)
  if (menu) judul = t(idMenu(menu.to), judul)
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
