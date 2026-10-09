import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function Bantuan({ children, judul = 'Penjelasan', rincian = false }: {
  children: ReactNode
  judul?: string
  rincian?: boolean
}) {
  if (rincian) return <details className="rounded-lg border bg-card/80 text-sm"><summary className="cursor-pointer px-3 py-2 font-medium text-muted-foreground">{judul}</summary><div className="space-y-2 border-t p-3 leading-relaxed">{children}</div></details>
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"><CircleHelp className="size-4" aria-hidden="true" />{judul}</Button></DialogTrigger><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>{judul}</DialogTitle></DialogHeader><div className="space-y-2 text-sm leading-relaxed">{children}</div></DialogContent></Dialog>
}
