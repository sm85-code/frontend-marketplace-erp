import { createContext, useContext, type ReactNode } from 'react'

/**
 * Whether the role may change things on the page it opened (Tulis), set by the route guard from the page's access.
 * A role with only Baca sees the page read-only: edit, add, delete and save controls are hidden or disabled.
 */
const ModeTulis = createContext(true)

export function ModeTulisProvider({ boleh, children }: { boleh: boolean; children: ReactNode }) {
  return <ModeTulis.Provider value={boleh}>{children}</ModeTulis.Provider>
}

export const useBolehTulis = () => useContext(ModeTulis)

/** Shows its content only when the page may be changed. */
export function HanyaTulis({ children }: { children: ReactNode }) {
  return useBolehTulis() ? <>{children}</> : null
}

function Tanda() {
  return (
    <p role="status" className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      Hanya baca: kamu bisa melihat, tapi tidak bisa mengubah.
    </p>
  )
}

/** A read-only notice for a role with only Baca. */
export function TandaHanyaBaca() {
  return useBolehTulis() ? null : <Tanda />
}

/**
 * Disables every input and button inside (a form-like screen) when the page may not be changed. `boleh` overrides the
 * page level, for a tab with its own access.
 */
export function KunciBaca({ boleh, children }: { boleh?: boolean; children: ReactNode }) {
  const halaman = useBolehTulis()
  if (boleh ?? halaman) return <>{children}</>
  return (
    <fieldset disabled className="min-w-0 space-y-3">
      <Tanda />
      {children}
    </fieldset>
  )
}
