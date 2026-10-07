import { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'

export default function QueryError({ error, retry }: { error: unknown; retry: () => unknown }) {
  return <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-4 text-sm">
    <p>{getApiError(error, 'Data belum bisa dimuat.')}</p>
    <Button variant="outline" onClick={() => { void retry() }}>Coba lagi</Button>
  </div>
}
