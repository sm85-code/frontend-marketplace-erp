/** localStorage that never throws (private windows and blocked storage just forget the choice). */
export function bacaSimpan(kunci: string): string | null {
  try {
    return localStorage.getItem(kunci)
  } catch {
    return null
  }
}

export function tulisSimpan(kunci: string, nilai: string): void {
  try {
    localStorage.setItem(kunci, nilai)
  } catch {
    /* not remembered */
  }
}
