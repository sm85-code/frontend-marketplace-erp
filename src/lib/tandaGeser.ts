/**
 * Marks horizontal strips (tabs, chips) that have more content to the right with data-terpotong, so CSS can fade the
 * right edge as a "swipe for more" cue. Tables are left alone (their figures must never fade).
 */
const SELEKTOR = '.section-tabs, .overflow-x-auto'

function tandai(el: HTMLElement) {
  // Tables, and the Arus Kas / Laporan Keuangan sheets as a whole, keep their exact look.
  if (el.querySelector('table') || el.closest('[aria-label="Tabel arus kas"], [aria-label="Tabel laporan keuangan"]')) return
  const sisa = el.scrollWidth - el.clientWidth - el.scrollLeft
  if (sisa > 2) el.dataset.terpotong = ''
  else delete el.dataset.terpotong
}

export function pasangTandaGeser(): () => void {
  const semua = () => document.querySelectorAll<HTMLElement>(SELEKTOR).forEach(tandai)
  const onScroll = (e: Event) => {
    const el = e.target
    if (el instanceof HTMLElement && el.matches(SELEKTOR)) tandai(el)
  }
  let jadwal = 0
  const tunda = () => {
    cancelAnimationFrame(jadwal)
    jadwal = requestAnimationFrame(semua)
  }
  const amati = new MutationObserver(tunda)
  amati.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', tunda)
  document.addEventListener('scroll', onScroll, true)
  tunda()
  return () => {
    amati.disconnect()
    window.removeEventListener('resize', tunda)
    document.removeEventListener('scroll', onScroll, true)
    cancelAnimationFrame(jadwal)
  }
}
