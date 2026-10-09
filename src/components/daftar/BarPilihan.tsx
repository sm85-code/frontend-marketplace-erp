import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/** Floating bar shown while rows are ticked: how many, the batch actions (children) and a cancel. */
export default function BarPilihan({
  jumlah,
  satuan,
  onBatal,
  sibuk,
  children,
  terlihat,
  ringkasan,
}: {
  jumlah: number
  satuan: string
  onBatal: () => void
  sibuk?: boolean
  terlihat?: number
  ringkasan?: ReactNode
  children: ReactNode
}) {
  if (jumlah === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 lg:bottom-4 lg:pl-80">
      <div
        role="region"
        aria-label="Aksi untuk pilihan"
        className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border bg-background p-3 shadow-lg"
      >
        <span className="text-sm font-medium" aria-live="polite">
          {jumlah} {satuan} dipilih
          {terlihat !== undefined && jumlah > terlihat && <small className="block text-muted-foreground">{jumlah - terlihat} pilihan di luar halaman/filter ini</small>}
        </span>
        {ringkasan && <details className="w-full text-sm"><summary className="cursor-pointer">Tinjau pilihan</summary><div className="max-h-32 overflow-auto py-2">{ringkasan}</div></details>}
        <div className="flex flex-wrap items-center gap-2">
          {children}
          <Button variant="ghost" onClick={onBatal} disabled={sibuk}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  )
}
