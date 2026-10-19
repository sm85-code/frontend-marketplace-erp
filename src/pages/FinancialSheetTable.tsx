import { Pencil, Plus } from 'lucide-react'
import { fmtRp } from '@/api/client'
import PeriodPicker, { usePeriodPick } from '@/components/PeriodPicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { bisaDiganti } from '@/lib/namaBaris'
import { isGroup, type Block, type GroupDef, type Line } from '@/lib/sheetEngine'

const ADDABLE = new Set(['pemasukan', 'pengeluaran', 'arus_kas', 'neraca'])
const sentenceCase = (label: string) => label.toLocaleLowerCase('id-ID').replace(/^./, (c) => c.toLocaleUpperCase('id-ID'))
const editable = (line: Line) => line.def.kind === 'input' && !line.hidden

type Props = {
  block: Block
  days: string[]
  weekLabel: (index: number) => string
  onEdit: (line: Line, week: number) => void
  onAddRow: (group: GroupDef) => void
  /** Hide the per-group "+ Baris" button. */
  tanpaTambah?: boolean
  /** Show row names exactly as written instead of sentence-casing the total rows. */
  hurufAsli?: boolean
  /** Rename a total / calculated row (rows that can be typed over rename in their edit pop-up). */
  onRenameRow?: (line: Line) => void
  onRenameGroup?: (group: GroupDef) => void
}

function GroupHead({ group, colSpan, onAddRow, tanpaTambah, onRenameGroup }: { group: GroupDef; colSpan: number; onAddRow: (g: GroupDef) => void; tanpaTambah?: boolean; onRenameGroup?: (g: GroupDef) => void }) {
  return (
    <TableRow className="financial-row-group">
      <TableHead colSpan={colSpan} scope="rowgroup">
        <span className="sticky left-0 inline-flex w-full items-center justify-between gap-2 pr-3 md:w-auto md:gap-4">
          {group.tampil ?? group.label}
          {onRenameGroup && (
            <button
              type="button"
              onClick={() => onRenameGroup(group)}
              className="inline-flex items-center rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              aria-label={`Ubah nama ${group.tampil ?? group.label}`}
            >
              <Pencil className="size-3" />
            </button>
          )}
          {ADDABLE.has(group.tabel) && !tanpaTambah && (
            <button
              type="button"
              onClick={() => onAddRow(group)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium normal-case text-primary hover:bg-primary/10"
              aria-label={`Tambah baris di ${group.label}`}
            >
              <Plus className="size-3" /> Baris
            </button>
          )}
        </span>
      </TableHead>
    </TableRow>
  )
}

const Amount = ({ value, manual }: { value: number | null; manual: boolean }) => (
  <span className={manual ? 'font-medium text-primary' : undefined}>
    {value === null ? '—' : fmtRp(value)}
    {manual && <span aria-label="diisi manual" className="ml-1 inline-block size-1.5 rounded-full bg-primary align-middle" />}
  </span>
)

/** Phone layout: pick one period (or the total) and read a two-column list, so nothing scrolls sideways. */
function PhoneTable({ block, days, weekLabel, onEdit, onAddRow, tanpaTambah, hurufAsli, onRenameRow, onRenameGroup }: Props) {
  const { pick, setPick } = usePeriodPick(Math.max(days.length - 1, 0))
  const total = pick >= days.length
  const options = [
    ...days.map((_, i) => ({ key: String(i), label: 'Periode', sub: weekLabel(i) })),
    { key: 'total', label: block.tabel === 'neraca' ? 'Posisi terakhir' : 'Jumlah', sub: '' },
  ]
  return (
    <div className="space-y-2 md:hidden">
      <PeriodPicker options={options} pick={pick} onPick={setPick} />
      <div className="overflow-hidden rounded-lg border">
        <Table aria-label={block.title.slice(3)}>
          <TableBody>
            {block.lines.map((line) => {
              if (isGroup(line)) return <GroupHead key={`g-${line.label}`} group={line} colSpan={2} onAddRow={onAddRow} tanpaTambah={tanpaTambah} onRenameGroup={onRenameGroup} />
              if (line.hidden) return null
              const can = editable(line) && !total
              const rename = !editable(line) && !!onRenameRow && bisaDiganti(line.def.key)
              const cell = total ? { value: line.total, manual: false } : line.cells[pick]
              return (
                <TableRow
                  key={line.def.key}
                  className={`${line.def.emphasis ? 'bg-muted/50 font-semibold' : ''} ${can || rename ? 'cursor-pointer active:bg-muted/60' : ''}`}
                  onClick={can ? () => onEdit(line, pick) : rename ? () => onRenameRow!(line) : undefined}
                >
                  <TableCell className="whitespace-normal">{line.def.emphasis && !hurufAsli ? sentenceCase(line.def.label) : line.def.label}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    <Amount value={cell?.value ?? null} manual={!!cell?.manual} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function FinancialSheetTable(props: Props) {
  const { block, days, weekLabel, onEdit, onAddRow, tanpaTambah, hurufAsli, onRenameRow, onRenameGroup } = props
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{sentenceCase(block.title.slice(3))}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <PhoneTable {...props} />
        <div className="hidden max-w-full overflow-x-auto rounded-lg border md:block">
          <Table className="table-fixed min-w-[calc(220px+var(--n)*142px)]" style={{ '--n': days.length + 1 } as React.CSSProperties} aria-label={block.title.slice(3)}>
            <colgroup>
              <col className="w-[220px]" />
              {days.map((d) => (
                <col key={d} className="w-[142px]" />
              ))}
              <col className="w-[142px]" />
            </colgroup>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-muted">Uraian</TableHead>
                {days.map((d, i) => (
                  <TableHead key={d} className="text-center">
                    <span className="block">Periode</span>
                    <span className="block text-xs font-normal">{weekLabel(i)}</span>
                  </TableHead>
                ))}
                <TableHead className="text-right">{block.tabel === 'neraca' ? 'Posisi terakhir' : 'Jumlah'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.lines.map((line) => {
                if (isGroup(line)) return <GroupHead key={`g-${line.label}`} group={line} colSpan={days.length + 2} onAddRow={onAddRow} tanpaTambah={tanpaTambah} onRenameGroup={onRenameGroup} />
                if (line.hidden) return null
                const can = editable(line)
                const rename = !can && !!onRenameRow && bisaDiganti(line.def.key)
                const lastWithData = Math.max(0, line.cells.map((c) => c.value !== null).lastIndexOf(true))
                return (
                  <TableRow key={line.def.key} className={line.def.emphasis ? 'bg-muted/50 font-semibold' : undefined}>
                    <TableCell
                      className={`sticky left-0 z-10 ${line.def.emphasis ? 'bg-muted font-semibold' : 'bg-card'} ${can || rename ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={can ? () => onEdit(line, lastWithData) : rename ? () => onRenameRow!(line) : undefined}
                    >
                      {line.def.emphasis && !hurufAsli ? sentenceCase(line.def.label) : line.def.label}
                    </TableCell>
                    {line.cells.map((cell, w) => (
                      <TableCell
                        key={days[w]}
                        className={`whitespace-nowrap text-right tabular-nums ${can ? 'cursor-pointer hover:bg-muted/60' : ''}`}
                        onClick={can ? () => onEdit(line, w) : undefined}
                      >
                        <Amount value={cell.value} manual={cell.manual} />
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap bg-muted/40 text-right tabular-nums">
                      <Amount value={line.total} manual={false} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
