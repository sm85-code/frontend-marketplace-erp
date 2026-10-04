import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/** Floating bar shown while rows are ticked: how many, the batch actions (children) and a cancel. */
export default function BarPilihan({
  jumlah,
  satuan,
  onBatal,
  sibuk,
  children,
}: {
  jumlah: number
  satuan: string
  onBatal: () => void
  sibuk?: boolean
  children: ReactNode
}) {
  if (jumlah === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-3 md:bottom-4">
      <div
        role="region"
        aria-label="Aksi untuk pilihan"
        className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border bg-background p-3 shadow-lg"
      >
        <span className="text-sm font-medium" aria-live="polite">
          {jumlah} {satuan} dipilih
        </span>
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
