import type { QueryClient } from '@tanstack/react-query'
import type { LembarManualResponse } from '@/api/financialReports'

/** Keep the read-only Arus Kas calculation cache current after a financial-sheet save. */
export function cacheLembarManual(client: QueryClient, month: string, saved: LembarManualResponse): void {
  client.setQueryData(['financial-manual-sheet', month], saved)
  client.setQueryData(['financial-manual-sheet', month, 'arus-kas'], saved)
}
