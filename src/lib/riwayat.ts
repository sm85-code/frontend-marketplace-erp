import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
const KUNCI_ALAMAT = 'ampel-penjaga-alamat'

type Riwayat = Pick<History, 'state' | 'replaceState' | 'pushState'>
type Simpanan = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Puts a marked entry under the current page, once per tab, so the Back button on the first page lands on it and the app
 * can ask before leaving. The page entry above it is a copy, so nothing visible changes.
 */
export function pasangPenjaga(riwayat: Riwayat, simpan: Simpanan, alamat?: string): boolean {
  try {
    if (simpan.getItem(KUNCI_PENJAGA)) return false
    simpan.setItem(KUNCI_PENJAGA, '1')
  } catch {
    return false // without storage the guard could be added again on every reload
  }
  const state = riwayat.state
  try {
    if (alamat) simpan.setItem(KUNCI_ALAMAT, alamat)
  } catch {
    // only used to close the installed app from the same address as the guard entry
  }
  riwayat.replaceState({ ...(state ?? {}), penjaga: true }, '')
  riwayat.pushState(state, '')
  return true
}

const aplikasiTerpasang = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * On phones and installed apps: Back from the first page asks before leaving instead of leaving at once.
 * In a browser the question has Keluar, which goes back past the guard entry. An installed app cannot close itself
 * (Android only closes it from the phone's Back button on its first entry), so there the question stays on the guard
 * entry and says to press Back once more, which then closes the app.
 */
export function useKonfirmasiKeluar(aktif: boolean) {
  const confirm = useConfirm()
  useEffect(() => {
    if (!aktif) return
    if (!window.matchMedia('(max-width: 1023px)').matches && !aplikasiTerpasang()) return
    pasangPenjaga(window.history, window.sessionStorage)
    let bertanya = false
    const onPop = async (e: PopStateEvent) => {
      if (!(e.state as { penjaga?: boolean } | null)?.penjaga || bertanya) return
      bertanya = true
      if (aplikasiTerpasang()) {
        await confirm({ title: 'Keluar dari aplikasi?', description: 'Tekan tombol Kembali di HP sekali lagi untuk keluar.', confirmLabel: 'Tetap di sini', tanpaBatal: true })
        bertanya = false
        window.history.forward()
        return
      }
      // Back to the page at once, so the screen behind the question does not change; leaving jumps over the guard entry.
      window.history.forward()
      const keluar = await confirm({ title: 'Keluar dari aplikasi?', description: 'Tekan Keluar untuk menutup aplikasi.', confirmLabel: 'Keluar', cancelLabel: 'Tetap di sini' })
      bertanya = false
      if (!keluar) return
      try {
        window.sessionStorage.removeItem(KUNCI_PENJAGA)
      } catch {
        // nothing to clear
      }
      window.history.go(-2)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [aktif, confirm])
}
