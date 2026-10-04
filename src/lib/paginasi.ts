/**
 * Page numbers to show for a pager: first, last, the current page and its neighbours, with `null` where
 * pages are skipped (rendered as an ellipsis). 24 pages on page 1 -> [1, 2, 3, null, 24].
 */
export function nomorHalaman(sekarang: number, total: number, tetangga = 1): (number | null)[] {
  if (total <= 1) return [1]
  const tampil = new Set<number>([1, total])
  for (let i = sekarang - tetangga; i <= sekarang + tetangga; i++) if (i >= 1 && i <= total) tampil.add(i)
  const urut = [...tampil].sort((a, b) => a - b)
  const hasil: (number | null)[] = []
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push(urut[i - 1] + 1 === n - 1 ? n - 1 : null)
    hasil.push(n)
  })
  return hasil
}
