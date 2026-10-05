import { toast } from 'sonner'

/** 75 -> "1 mnt 15 dtk", 8 -> "8 dtk". */
export function formatDurasi(detik: number): string {
  const d = Math.max(0, Math.floor(detik))
  if (d < 60) return `${d} dtk`
  const m = Math.floor(d / 60)
  const s = d % 60
  return s === 0 ? `${m} mnt` : `${m} mnt ${s} dtk`
}

export interface Progres {
  /** Replaces the detail line, e.g. "toko 3 dari 11". */
  perbarui: (detail: string) => void
  selesai: (pesan: string) => void
  /** Finished, but not everything worked (a warning instead of a success). */
  sebagian: (pesan: string, deskripsi?: string) => void
  gagal: (pesan: string) => void
  tutup: () => void
}

/**
 * Shown while data is pulled from a marketplace, so a slow pull never looks like a frozen page: one toast that stays
 * until the work ends and counts the seconds. Every pull in the app starts one (the progress lives in this single place).
 */
export function mulaiProgres(judul: string): Progres {
  const id = toast.loading(judul, { duration: Infinity })
  const mulai = Date.now()
  let detail = ''
  const teks = () => `${judul} · ${formatDurasi((Date.now() - mulai) / 1000)}${detail ? ` — ${detail}` : ''}`
  const timer = setInterval(() => toast.loading(teks(), { id, duration: Infinity }), 1000)
  const berhenti = () => clearInterval(timer)
  // The loading toast is removed outright and the result gets a toast of its own: reusing one id left the spinner
  // on screen when the click opened another tab (the page was hidden while the result arrived).
  const akhiri = (tampil: () => void) => {
    berhenti()
    toast.dismiss(id)
    tampil()
  }
  return {
    perbarui: (d) => {
      detail = d
      toast.loading(teks(), { id, duration: Infinity })
    },
    selesai: (pesan) => {
      akhiri(() => toast.success(pesan, { duration: 5000 }))
    },
    sebagian: (pesan, deskripsi) => {
      akhiri(() => toast.warning(pesan, { description: deskripsi, duration: 10000 }))
    },
    gagal: (pesan) => {
      akhiri(() => toast.error(pesan, { duration: 10000 }))
    },
    tutup: () => {
      berhenti()
      toast.dismiss(id)
    },
  }
}
