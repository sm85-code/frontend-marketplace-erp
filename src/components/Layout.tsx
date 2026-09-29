import { KeyRound, LogOut, Menu, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { NAV_ITEMS } from '@/config/nav'
import { useAuth } from '@/lib/auth'
import { CHANGE_PASSWORD_PATH } from '@/lib/redirect'
import { cn } from '@/lib/utils'

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShoppingBag className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Marketplace ERP</p>
        <p className="text-xs text-muted-foreground">Panel Seller</p>
      </div>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserBox({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="border-t pt-3">
      <div className="px-2 pb-2">
        <p className="truncate text-sm font-medium">{user?.nama}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user?.email} · {user?.role}
        </p>
      </div>
      <NavLink
        to={CHANGE_PASSWORD_PATH}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )
        }
      >
        <KeyRound className="size-4" />
        Ganti Password
      </NavLink>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      >
        <LogOut /> Keluar
      </Button>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Brand />
        <div className="flex-1">
          <NavList />
        </div>
        <UserBox />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur lg:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Buka menu" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-sidebar p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Tutup menu" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="flex-1">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <UserBox onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="px-3 py-4 sm:px-6 sm:py-6 lg:ml-60">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
