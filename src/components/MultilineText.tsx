import { useEffect } from 'react'

const candidates = 'p, li, td, dd, div, span, a, h1, h2, h3, h4, summary'
const excluded = 'button, [role="button"], input, textarea, select, nav, svg, pre, code, .sr-only, [aria-hidden="true"], [data-text-align="preserve"]'
const nestedBlocks = 'p, li, div, table, ul, ol, dl, h1, h2, h3, h4'

/** Counts rendered text lines, including inline emphasis and links, rather than container height. */
function hasThreeLines(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const tops: number[] = []
  const range = document.createRange()
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim() || node.parentElement?.closest(excluded)) continue
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      if (rect.width > 0 && rect.height > 0 && !tops.some(top => Math.abs(top - rect.top) < 4)) tops.push(rect.top)
      if (tops.length >= 3) return true
    }
  }
  return false
}

/** One rule for page prose, table descriptions and portaled help/dialogs, responsive to live content. */
export default function MultilineText() {
  useEffect(() => {
    let frame = 0
    let disposed = false
    const update = () => {
      frame = 0
      document.querySelectorAll<HTMLElement>('[data-multiline-justify]').forEach(el => el.removeAttribute('data-multiline-justify'))
      const eligible: HTMLElement[] = []
      document.querySelectorAll<HTMLElement>(candidates).forEach(el => {
        if (!el.closest('#root, main, [data-slot="dialog-content"], [role="region"], [data-sonner-toast]')) return
        if (el.closest(excluded) || el.querySelector(nestedBlocks) || el.getClientRects().length === 0) return
        const style = getComputedStyle(el)
        const clamp = Number.parseInt(style.webkitLineClamp, 10)
        if (clamp > 0 && clamp < 3) return
        if (['flex', 'inline-flex', 'grid', 'inline', 'contents'].includes(style.display)) return
        if (['right', 'end', 'center'].includes(style.textAlign) || style.whiteSpace === 'nowrap') return
        if (hasThreeLines(el)) eligible.push(el)
      })
      // Batch writes after measurement so each paragraph does not force a new layout.
      eligible.forEach(el => el.setAttribute('data-multiline-justify', ''))
    }
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(update)
    }
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'data-font', 'data-huruf'] })
    const resize = new ResizeObserver(schedule)
    resize.observe(document.body)
    window.addEventListener('resize', schedule)
    document.fonts.addEventListener('loadingdone', schedule)
    void document.fonts.ready.then(schedule)
    schedule()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
      window.removeEventListener('resize', schedule)
      document.fonts.removeEventListener('loadingdone', schedule)
      document.querySelectorAll('[data-multiline-justify]').forEach(el => el.removeAttribute('data-multiline-justify'))
    }
  }, [])
  return null
}
