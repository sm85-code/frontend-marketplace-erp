import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { emptyLembar } from '@/lib/sheetEngine'
import type { LembarManualResponse } from '@/api/financialReports'
import { cacheLembarManual } from './financialSheetCache'

const saved: LembarManualResponse = { version: 2, lembar: { ...emptyLembar(), sel: { 'rb:k_prod|2026-10-31': '2500' } } }

describe('cacheLembarManual', () => {
  it('updates both finance and read-only Arus Kas caches from the saved sheet', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
    const stale: LembarManualResponse = { version: 1, lembar: emptyLembar() }
    client.setQueryData(['financial-manual-sheet', '2026-10'], stale)
    client.setQueryData(['financial-manual-sheet', '2026-10', 'arus-kas'], stale)

    cacheLembarManual(client, '2026-10', saved)

    expect(client.getQueryData(['financial-manual-sheet', '2026-10'])).toEqual(saved)
    expect(client.getQueryData(['financial-manual-sheet', '2026-10', 'arus-kas'])).toEqual(saved)
    client.clear()
  })
})
