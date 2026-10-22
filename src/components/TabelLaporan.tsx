import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export interface KolomLaporan { judul: string; angka?: boolean }
export interface BarisLaporan { kunci: string; sel: ReactNode[]; tebal?: boolean; onClick?: () => void }

/**
 * Number/report table in the same look as the Arus Kas sheet (card, muted header, sticky first column,
 * right-aligned tabular figures, muted last column and total rows). Arus Kas itself keeps its own component.
 */
export default function TabelLaporan({ judul, ringkas, kolom, baris, total, lipat = false, aksi }: {
  judul: string
  /** One-line summary shown next to the title (also when folded). */
  ringkas?: ReactNode
  kolom: KolomLaporan[]
  baris: BarisLaporan[]
  total?: ReactNode[]
  /** Starts folded; the title row opens it. */
  lipat?: boolean
  aksi?: ReactNode
}) {
  const [tutup, setTutup] = useState(lipat)
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-2">
        <CardTitle className="flex min-w-0 flex-wrap items-baseline gap-x-3 text-base">
          {judul}
          {ringkas && <span className="text-sm font-normal text-muted-foreground">{ringkas}</span>}
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          {aksi}
          {lipat && (
            <Button type="button" variant="ghost" size="icon" aria-expanded={!tutup} aria-label={tutup ? `Buka ${judul}` : `Lipat ${judul}`} title={tutup ? 'Buka' : 'Lipat'} onClick={() => setTutup(!tutup)}>
              <ChevronDown className={`size-4 transition-transform ${tutup ? '' : 'rotate-180'}`} aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>
      {!tutup && (
        <CardContent className="min-w-0 px-4 pb-4">
          <div className="max-w-full overflow-x-auto rounded-lg border">
            <Table aria-label={judul}>
              <TableHeader className="bg-muted">
                <TableRow>
                  {kolom.map((k, i) => (
                    <TableHead key={k.judul} className={`${i === 0 ? 'sticky left-0 z-10 bg-muted' : ''} ${k.angka ? 'text-right' : ''} ${i === kolom.length - 1 && k.angka ? 'bg-muted' : ''}`}>{k.judul}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {baris.map((b) => (
                  <TableRow key={b.kunci} className={`${b.tebal ? 'bg-muted/50 font-semibold' : ''} ${b.onClick ? 'cursor-pointer hover:bg-muted/60' : ''}`} onClick={b.onClick}>
                    {b.sel.map((s, i) => (
                      <TableCell key={i} className={`${i === 0 ? `sticky left-0 z-10 ${b.tebal ? 'bg-muted' : 'bg-card'}` : ''} ${kolom[i]?.angka ? 'whitespace-nowrap text-right tabular-nums' : ''} ${i === kolom.length - 1 && kolom[i]?.angka ? 'bg-muted/40' : ''}`}>{s}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {total && (
                  <TableRow className="bg-muted/50 font-semibold">
                    {total.map((s, i) => (
                      <TableCell key={i} className={`${i === 0 ? 'sticky left-0 z-10 bg-muted' : ''} ${kolom[i]?.angka ? 'whitespace-nowrap text-right tabular-nums' : ''}`}>{s}</TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
