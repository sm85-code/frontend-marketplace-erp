import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** The one reload button of a page: icon + "Refresh"; on phones only the icon, to keep the header to one line. */
export default function TombolRefresh({ onClick, disabled, memuat }: { onClick: () => void; disabled?: boolean; memuat?: boolean }) {
  return (
    <Button variant="outline" disabled={disabled} onClick={onClick} aria-label="Refresh" title="Refresh">
      <RefreshCw className={`size-4 ${memuat ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
      <span className="max-sm:sr-only">Refresh</span>
    </Button>
  )
}
