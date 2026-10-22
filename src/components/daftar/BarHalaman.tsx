import { Info } from 'lucide-react'
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
  // The menu of this very page names it: a text the admin set for that menu on Kelola Aplikasi becomes the page title.
  const menu = NAV.find((n) => n.to === pathname)
  if (menu) {
    const diatur = t(idMenu(menu.to), menu.label)
    if (diatur !== menu.label || menu.label === judul) judul = diatur
  }
  return (
    <header className="bar-halaman">
      <div className="min-w-0">
        <h1 className="page-h1 flex items-center gap-1.5 font-heading text-2xl font-bold">
          {judul}
          {/* Help text stays out of the way: one small info icon instead of a paragraph under every title. */}
          {deskripsi && <span role="img" aria-label={deskripsi} title={deskripsi} className="inline-flex shrink-0 cursor-help text-muted-foreground"><Info className="size-4" /></span>}
        </h1>
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
