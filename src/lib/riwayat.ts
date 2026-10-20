import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ConfirmProvider'

/**
 * Closing a detail page goes back one step when the app has a step to go back to (so the Back button does not bounce
 * between list and detail), and otherwise opens `cadangan` in place of the current entry.
 */
export function useTutupHalaman(cadangan: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key !== 'default' ? navigate(-1) : navigate(cadangan, { replace: true }))
}

export const KUNCI_PENJAGA = 'ampel-penjaga-riwayat'

type Riwayat = Pick<History, 'state' | 'replaceState' | 'pushState'>
type Simpanan = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Puts a marked entry under the current page, once per tab, so the Back button on the first page lands on it and the app
 * can ask before leaving. The page entry above it is a copy, so nothing visible changes.
 */
export function pasangPenjaga(riwayat: Riwayat, simpan: Simpanan): boolean {
  try {
    if (simpan.getItem(KUNCI_PENJAGA)) return false
    simpan.setItem(KUNCI_PENJAGA, '1')
  } catch {
    return false // without storage the guard could be added again on every reload
  }
  const state = riwayat.state
  riwayat.replaceState({ ...(state ?? {}), penjaga: true }, '')
  riwayat.pushState(state, '')
  return true
}

const aplikasiTerpasang = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * On phones and installed apps: Back from the first page asks "Keluar dari aplikasi?" instead of leaving at once.
 * In a browser, Keluar goes back past the guard entry. An installed app cannot be closed by history; it tries
 * `window.close()` and otherwise leaves the guard entry so the phone's own Back button closes it with one more press.
 */
export function useKonfirmasiKeluar(aktif: boolean) {
  const confirm = useConfirm()
  useEffect(() => {
    if (!aktif) return
    if (!window.matchMedia('(max-width: 1023px)').matches && !aplikasiTerpasang()) return
    pasangPenjaga(window.history, window.sessionStorage)
    let bertanya = false
    let lewati = false
    const onPop = async (e: PopStateEvent) => {
      if (!(e.state as { penjaga?: boolean } | null)?.penjaga || bertanya) return
      if (lewati) {
        lewati = false
        return
      }
      bertanya = true
      // Back to the page at once, so the screen behind the question does not change; leaving jumps over the guard entry.
      window.history.forward()
      const keluar = await confirm({ title: 'Keluar dari aplikasi?', description: 'Tekan Keluar untuk menutup aplikasi.', confirmLabel: 'Keluar', cancelLabel: 'Tetap di sini' })
      bertanya = false
      if (!keluar) return
      if (!aplikasiTerpasang()) {
        try {
          window.sessionStorage.removeItem(KUNCI_PENJAGA)
        } catch {
          // nothing to clear
        }
        window.history.go(-2)
        return
      }
      window.close()
      setTimeout(() => {
        lewati = true
        window.history.go(-1)
        toast.info('Tekan tombol Kembali di HP sekali lagi untuk menutup aplikasi.')
      }, 300)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [aktif, confirm])
}
