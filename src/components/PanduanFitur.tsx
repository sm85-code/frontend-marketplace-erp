import { BookOpen } from 'lucide-react'
import { panduanUntuk } from '@/lib/panduan'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
export default function PanduanFitur({ path }: { path: string }) {
  const guide = panduanUntuk(path)
  if (!guide) return null
  return (
    <Dialog key={path}>
      <DialogTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2"><BookOpen className="size-4" aria-hidden="true" />Bantuan halaman</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{guide.judul}</DialogTitle><DialogDescription>{guide.tujuan}</DialogDescription></DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">{guide.langkah.map(step => <li key={step}>{step}</li>)}</ol>
        <p className="text-sm text-muted-foreground">{guide.dampak}</p>
      </DialogContent>
    </Dialog>
  )
}
