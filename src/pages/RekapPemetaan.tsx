import { useQuery } from '@tanstack/react-query'
import { getProcessingRekap } from '@/api/processing'
const fmtAngka = (n: number) => n.toLocaleString('id-ID')

/** One collapsed line: "Belum dipetakan N · Sudah M"; opens into a small per-shop table. Hidden when it cannot be read. */
export default function RekapPemetaan({ onBelum }: { onBelum?: () => void }) {
  const q = useQuery({ queryKey: ['processing-rekap'], queryFn: getProcessingRekap, staleTime: 60_000 })
  if (!q.data) return null
  const d = q.data
  return (
    <details className="rounded-xl border bg-card text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
        <span className="font-medium">Rekap pemetaan</span>
        <span className="text-muted-foreground">Belum <b className="text-foreground tabular-nums">{fmtAngka(d.belum)}</b> · Sudah <b className="text-foreground tabular-nums">{fmtAngka(d.sudah)}</b> item</span>
        {onBelum && d.belum > 0 && <button type="button" className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={(e) => { e.preventDefault(); onBelum() }}>Petakan</button>}
      </summary>
      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="px-3 py-1.5 text-left font-medium">Toko</th><th className="px-3 py-1.5 text-right font-medium">Belum</th><th className="px-3 py-1.5 text-right font-medium">Sudah</th><th className="px-3 py-1.5 text-right font-medium">Total</th></tr></thead>
          <tbody>
            {d.items.map((r) => (
              <tr key={r.toko} className="border-t"><td className="px-3 py-1.5">{r.toko}</td><td className={`px-3 py-1.5 text-right tabular-nums ${r.belum ? 'font-semibold text-destructive' : ''}`}>{fmtAngka(r.belum)}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmtAngka(r.sudah)}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmtAngka(r.belum + r.sudah)}</td></tr>
            ))}
            {!d.items.length && <tr><td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">Belum ada pesanan.</td></tr>}
          </tbody>
        </table>
      </div>
    </details>
  )
}
