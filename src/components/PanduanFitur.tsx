import { BookOpen } from 'lucide-react'
import { panduanUntuk } from '@/lib/panduan'
export default function PanduanFitur({ path }: { path: string }) {
  const guide = panduanUntuk(path)
  if (!guide) return null
  return (
    <details key={path} className="mb-4 rounded-lg border bg-card text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
        <BookOpen className="size-4 shrink-0" aria-hidden="true" />
        Petunjuk {guide.judul}
        <span className="ml-auto text-xs text-muted-foreground">Buka / tutup</span>
      </summary>
      <div className="space-y-3 border-t px-4 py-3">
        <p>{guide.tujuan}</p>
        <ol className="list-decimal space-y-2 pl-5">
          {guide.langkah.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-muted-foreground">{guide.dampak}</p>
        <p className="text-xs text-muted-foreground">
          Di HP, geser tabel ke samping untuk melihat kolom lain. Gunakan filter dan pencarian untuk mempersempit hasil. Jika tindakan
          gagal, baca pesan dan periksa status terbaru sebelum mencoba ulang.
        </p>
      </div>
    </details>
  )
}
