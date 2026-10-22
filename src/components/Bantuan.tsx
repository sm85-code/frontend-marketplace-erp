import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function Bantuan({ children, judul = 'Penjelasan', }: {
  children: ReactNode
  judul?: string
  /** Kept for callers; help now always opens from a small icon. */
  rincian?: boolean
}) {
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={judul} title={judul}><CircleHelp className="size-4" aria-hidden="true" /></Button></DialogTrigger><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>{judul}</DialogTitle></DialogHeader><div className="space-y-2 text-sm leading-relaxed">{children}</div></DialogContent></Dialog>
}
