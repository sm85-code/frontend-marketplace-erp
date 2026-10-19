/** "2026-10-05" -> "05/10". */
export const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
/** Period range as shown in every report table header: "05/10 - 10/10". */
export const rentang = (from: string, to: string) => `${ddmm(from)} - ${ddmm(to)}`
const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)
export const hariSebelum = (date: string, n: number) => addDays(date, -n)

export const hariIniWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
export const tambahHari = (date: string, n: number) => addDays(date, n)

/**
 * Index of the report period (Monday-Sunday weeks counted from the week of the 1st) that contains today.
 * Another month: the last period of a past month, the first of a future one.
 */
export function periodeBerjalan(month: string, count: number, today = hariIniWib()): number {
  if (count <= 0) return 0
  if (today.slice(0, 7) !== month) return today.slice(0, 7) > month ? count - 1 : 0
  const first = new Date(`${month}-01T12:00:00Z`)
  const monday = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10)
  const days = Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${monday}T12:00:00Z`).getTime()) / 86_400_000)
  return Math.min(Math.max(Math.floor(days / 7), 0), count - 1)
}

// Monday-Saturday of the n-th reporting week of a month (the same weeks the Shopee tables use), e.g. "28/09 - 03/10".
export function weekRange(month: string, index: number): string {
  const first = new Date(`${month}-01T12:00:00Z`)
  const monday = new Date(first)
  monday.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7) + index * 7)
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)
  return rentang(monday.toISOString().slice(0, 10), saturday.toISOString().slice(0, 10))
}

