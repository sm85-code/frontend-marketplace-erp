export function workTime(value: string | null | undefined) {
  if (!value) return '—'
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const v = (t: string) => p.find((x) => x.type === t)?.value
  return `${v('day')}/${v('month')}/${v('year')} ${v('hour')}:${v('minute')}`
}
export function wibInputNow() {
  const d = workTime(new Date().toISOString())
  return `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}T${d.slice(11)}`
}
