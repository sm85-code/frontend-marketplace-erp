export function formatNominal(raw: string) {
  if (!raw || raw === '-') return raw
  const [whole, decimal] = raw.split('.')
  const sign = whole.startsWith('-') ? '-' : ''
  const digits = whole.replace(/\D/g, '')
  return (
    sign +
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') +
    (decimal !== undefined ? ',' + decimal : '')
  )
}
export function parseNominal(display: string) {
  return display
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
}
