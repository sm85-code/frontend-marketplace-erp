/** "2026-10-05" -> "05/10". */
export const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
/** Period range as shown in every report table header: "05/10 - 10/10". */
export const rentang = (from: string, to: string) => `${ddmm(from)} - ${ddmm(to)}`
const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)
export const hariSebelum = (date: string, n: number) => addDays(date, -n)
