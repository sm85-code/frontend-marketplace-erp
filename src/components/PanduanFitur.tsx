import { BookOpen } from 'lucide-react'
import { panduanUntuk } from '@/lib/panduan'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useNamaMenu } from '@/lib/namaMenu'
import { NAV } from '@/config/nav'
export default function PanduanFitur({ path }: { path: string }) {
  const menu = useNamaMenu()
  const guide = panduanUntuk(path)
  if (!guide) return null
  return (
    <Dialog key={path}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="size-11 shrink-0 rounded-full" aria-label="Bantuan halaman" title="Bantuan halaman"><BookOpen className="size-5" aria-hidden="true" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{NAV.some((n) => n.to === guide.path) ? menu(guide.path) : guide.judul}</DialogTitle><DialogDescription>{guide.tujuan}</DialogDescription></DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">{guide.langkah.map(step => <li key={step}>{step}</li>)}</ol>
        <p className="text-sm text-muted-foreground">{guide.dampak}</p>
      </DialogContent>
    </Dialog>
  )
}
