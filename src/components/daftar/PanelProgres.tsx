import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDurasi } from '@/lib/progres'

/**
 * Progress of a long pull made of several steps (one shop after another): a bar, what is happening now, the elapsed
 * time and a way to stop. `selesai` of `total` steps are done; the step in progress shows as a half-filled segment.
 */
export default function PanelProgres({
  judul,
  selesai,
  total,
  keterangan,
  mulai,
  onBatal,
}: {
  judul: string
  selesai: number
  total: number
  keterangan: string
  mulai: number
  onBatal?: () => void
}) {
  const [kini, setKini] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const persen = total > 0 ? Math.min(100, Math.round(((selesai + 0.5) / total) * 100)) : 0
  return (
    <div role="status" aria-live="polite" className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="teks-data font-medium">
          {judul} · {formatDurasi((kini - mulai) / 1000)}
        </p>
        {onBatal && (
          <Button size="sm" variant="outline" onClick={onBatal}>
            Hentikan
          </Button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={judul}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={selesai}
        aria-valuetext={`${selesai} dari ${total} selesai`}
        className="h-2 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${persen}%` }} />
      </div>
      <p className="teks-kecil text-muted-foreground">{keterangan}</p>
    </div>
  )
}
