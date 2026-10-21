import NotificationsBell from '@/components/NotificationsBell'
import { LogOut, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PanduanFitur from '@/components/PanduanFitur'
import AppearancePopover from '@/components/AppearancePopover'
import BottomNav from '@/components/BottomNav'
import WallpaperLayer from '@/components/WallpaperLayer'
import { Button } from '@/components/ui/button'
import { APP_BAWAAN, useIdentitas, useLabel } from '@/api/pengaturanUi'
import { denganLabel, filterNav, idGrup, idNavBawah, itemBawahDipilih, kelompokNav } from '@/config/nav'
import { ROLE_LABELS } from '@/config/roles'
import { useAuth } from '@/lib/auth'
import { useKonfirmasiKeluar } from '@/lib/riwayat'

function isNavActive(pathname: string, to: string, allPaths: string[]) {
  const matches = allPaths.filter((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (matches.length === 0) return false
  const best = matches.reduce((a, b) => (a.length >= b.length ? a : b))
  return best === to
}

/** A logo address that does not load falls back to the built-in logo. */
const logoCadangan = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.onerror = null
  e.currentTarget.src = APP_BAWAAN.logo
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, akses, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  useKonfirmasiKeluar(!!user)

  const t = useLabel()
  const app = useIdentitas()
  const visible = useMemo(() => denganLabel(filterNav(akses), t), [akses, t])
  const allPaths = useMemo(() => visible.map((n) => n.to), [visible])

  const grup = useMemo(() => kelompokNav(visible), [visible])
  const navBawah = t(idNavBawah(akses?.role ?? user?.role ?? ''), '')
  const bottomItems = useMemo(() => itemBawahDipilih(visible, navBawah), [visible, navBawah])

  // "Lainnya" lights up when the current page is not one of the bottom tabs.
  const moreActive = useMemo(() => {
    const bottomPaths = bottomItems.map((n) => n.to)
    return visible.some((n) => !bottomPaths.includes(n.to) && isNavActive(location.pathname, n.to, allPaths))
  }, [visible, bottomItems, location.pathname, allPaths])

  if (!user) return null

  return (
    <div className="app-shell flex min-h-screen">
      <WallpaperLayer />
      <div
        className="fixed inset-x-3 top-3 z-40 flex h-14 items-center rounded-2xl px-4 lg:hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--legacy-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img src={app.logo} onError={logoCadangan} alt={app.nama} className="h-9 w-auto flex-shrink-0 rounded-md bg-white" />
          <div className="min-w-0 leading-tight">
            <div className="font-heading truncate text-sm font-semibold">{app.nama}</div>
            <div className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
              {app.subjudul}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <AppearancePopover />
          <PanduanFitur path={location.pathname} />
          <NotificationsBell />
        </div>
      </div>

      <aside
        data-testid="sidebar"
        className={`fixed top-0 left-0 z-50 flex h-[100dvh] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden transition-transform lg:sticky lg:w-72 lg:transform-none ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div
          className="m-0 flex h-full flex-col overflow-hidden rounded-none lg:m-3 lg:h-[calc(100dvh-1.5rem)] lg:rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--legacy-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex shrink-0 items-center gap-3 px-4 pt-5 pb-4">
            <img src={app.logo} onError={logoCadangan} alt={app.nama} className="h-10 w-14 shrink-0 rounded-md bg-white object-contain" />
            <div className="min-w-0 flex-1">
              <div className="font-heading text-sm leading-6 font-semibold whitespace-nowrap">{app.nama}</div>
              <div className="text-xs leading-5 font-medium" style={{ color: 'var(--text-muted)' }}>
                {app.subjudul}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <nav aria-label="Menu utama" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
            {grup.map(({ grup: g, items }) => (
              <div key={g.id} role="group" aria-labelledby={`grup-${g.id}`} className="mt-5 first:mt-1">
                <div
                  id={`grup-${g.id}`}
                  className="sidebar-group-heading mb-1.5 px-2 py-1 text-[11px] leading-5 font-bold tracking-widest uppercase"
                >
                  {t(idGrup(g.id), g.label)}
                </div>
                <div className="ml-2 space-y-1 border-l border-border pl-2">
                  {items.map((n) => {
                    const Icon = n.icon
                    const active = isNavActive(location.pathname, n.to, allPaths)
                    return (
                      <NavLink
                        key={n.to}
                        to={n.to}
                        replace
                        data-testid={`nav-${n.to.replace(/\//g, '-')}`}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`side-link ${active ? 'active' : ''}`}
                      >
                        <span className="nav-ico">
                          <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
                        </span>
                        <span>{n.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="shrink-0 space-y-2 border-t p-3" style={{ borderColor: 'var(--legacy-border)' }}>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold text-primary-foreground"
                style={{ background: 'var(--primary)' }}
              >
                {user.nama?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.nama}</div>
                <div className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                  {t(`role:${user.role}`, akses?.nama ?? ROLE_LABELS[user.role] ?? user.role)}
                </div>
              </div>
              <Button
                data-testid="logout-btn"
                onClick={() => void logout()}
                variant="outline"
                size="icon"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 flex-1 pt-20 pb-24 lg:pt-0 lg:pb-0">
        <div className="hidden h-14 items-center justify-end px-6 lg:flex">
          <AppearancePopover />
          <PanduanFitur path={location.pathname} />
          <NotificationsBell />
        </div>
        <div className="fade-in mx-auto max-w-[1400px] p-3 sm:p-5 lg:p-6 erp-content">
          {children}
        </div>
      </main>

      <BottomNav items={bottomItems} onOpenMore={() => setOpen(true)} moreActive={moreActive} />
    </div>
  )
}
