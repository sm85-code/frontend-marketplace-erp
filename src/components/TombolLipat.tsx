import { ChevronDown, ChevronRight } from 'lucide-react'

/** Fold/unfold node of a row with sub-rows, set in the No column like a tree node. */
export default function TombolLipat({ tertutup, nama, onClick }: { tertutup: boolean; nama: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={!tertutup}
      aria-label={`${tertutup ? 'Buka' : 'Lipat'} rincian ${nama}`}
      title={tertutup ? 'Tampilkan rincian' : 'Sembunyikan rincian'}
      onClick={(e) => {
        e.stopPropagation() // the row opens its pop-up when tapped; the node only folds
        onClick()
      }}
      className="inline-flex !h-7 !min-h-7 !w-7 !min-w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
    >
      {tertutup ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
    </button>
  )
}
