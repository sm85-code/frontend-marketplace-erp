// Preserve cents for column totals without rounding through floating-point arithmetic.
export function sumAmounts(values: string[]): string {
  const cents = values.reduce((sum, value) => {
    const negative = value.startsWith('-')
    const [whole, fraction = ''] = value.replace(/^-/, '').split('.')
    const n = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
    return sum + (negative ? -n : n)
  }, 0n)
  const magnitude = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}`
}

