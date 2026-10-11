import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'

export default function QueryError({ error, retry }: { error: unknown; retry: () => unknown }) {
  return <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 px-5 py-4 text-sm">
    <p className="leading-relaxed">{getApiError(error, 'Data belum bisa dimuat.')}</p>
    <Button variant="outline" onClick={() => { void retry() }}>Coba lagi</Button>
  </div>
}
