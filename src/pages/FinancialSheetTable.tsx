import { ChevronsDownUp, ChevronsUpDown, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fmtRp } from '@/api/client'
import PeriodPicker, { usePeriodPick } from '@/components/PeriodPicker'
import TombolLipat from '@/components/TombolLipat'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { bisaDiganti } from '@/lib/namaBaris'
import { isGroup, type Block, type GroupDef, type Line } from '@/lib/sheetEngine'

const ADDABLE = new Set(['pemasukan', 'pengeluaran', 'arus_kas', 'neraca'])
const sentenceCase = (label: string) => label.toLocaleLowerCase('id-ID').replace(/^./, (c) => c.toLocaleUpperCase('id-ID'))
/** Cell of a period whose cash transaction is ticked as done. */
const SELESAI = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
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
  /** Period shown first on phones (default: the last one). */
  periodeAwal?: number
  /** Detail rows get their own No column, numbered from 1 again under every group heading; main rows span both columns. */
  bernomor?: boolean
  /** Read-only: no editing, renaming or adding rows (the done ticks still work). */
  hanyaLihat?: boolean
  /** Rows that get a "done" checkbox next to each period's figure, and what happens when it is ticked. */
  bisaCentang?: (line: Line) => boolean
  onCentang?: (line: Line, week: number, checked: boolean) => void
  /** Rename a total / calculated row (rows that can be typed over rename in their edit pop-up). */
  onRenameRow?: (line: Line) => void
  onRenameGroup?: (group: GroupDef) => void
  /** A small note after a row's name (e.g. the category its figure is filed under). */
  ketBaris?: (line: Line) => string | undefined
  /** Rows whose sub-rows are folded away (tree view of the breakdown), and how to fold/unfold one. */
  lipat?: ReadonlySet<string>
  onLipat?: (key: string) => void
}

function GroupHead({ group, colSpan, onAddRow, tanpaTambah, onRenameGroup }: { group: GroupDef; colSpan: number; onAddRow: (g: GroupDef) => void; tanpaTambah?: boolean; onRenameGroup?: (g: GroupDef) => void }) {
  return (
    <TableRow className="financial-row-group">
      <TableHead colSpan={colSpan} scope="rowgroup">
        <span className="sticky left-0 inline-flex w-full items-center justify-between gap-2 pr-3 md:w-auto md:gap-4">
          {group.tampil ?? group.label}
          {onRenameGroup && !group.dariPengaturan && (
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

/** Sub-rows (breakdown of a row) are set apart: italic and a different colour. */
export const GAYA_ANAK = 'italic text-indigo-700 dark:text-indigo-300'

const Amount = ({ value, manual, warisan }: { value: number | null; manual: boolean; warisan?: boolean }) => (
  <span className={manual ? `font-medium ${warisan ? '' : 'text-primary'}` : undefined}>
    {value === null ? '—' : fmtRp(value)}
    {manual && <span aria-label="diisi manual" className={`ml-1 inline-block size-1.5 rounded-full align-middle ${warisan ? 'bg-current' : 'bg-primary'}`} />}
  </span>
)

/** Number of each detail row, restarting at every group heading; sub-rows are 1.1, 1.2, ... under their row. */
/** The note after a row's name: small, muted, and kept apart from the name. */
function Ket({ teks }: { teks?: string }) {
  return teks ? <span className="teks-kecil ml-1.5 whitespace-nowrap font-normal text-muted-foreground">· {teks}</span> : null
}

/** Keys of the rows that have visible sub-rows. */
const punyaRincian = (block: Block) => new Set(block.lines.flatMap((l) => (!isGroup(l) && !l.hidden && l.def.induk ? [l.def.induk] : [])))

/** Fold/unfold node of a row with sub-rows. */
function Simpul({ line, lipat, onLipat }: { line: Line; lipat: ReadonlySet<string>; onLipat: (key: string) => void }) {
  return <TombolLipat tertutup={lipat.has(line.def.key)} nama={line.def.label} onClick={() => onLipat(line.def.key)} />
}

/** The number of a sub-row sits inside the name cell, in line with the text of the row it breaks down. */
export const NomorRincian = ({ teks }: { teks?: string }) => (teks ? <span className="mr-2 tabular-nums">{teks}</span> : null)

function nomorBaris(block: Block): Map<string, string> {
  const out = new Map<string, string>()
  let n = 0
  let anak = 0
  for (const line of block.lines) {
    if (isGroup(line)) {
      n = 0
      continue
    }
    if (line.hidden || line.def.emphasis || line.def.key.endsWith(':selisih')) continue
    if (line.def.induk) out.set(line.def.key, `${out.get(line.def.induk) ?? n}.${++anak}`)
    else {
      anak = 0
      out.set(line.def.key, String(++n))
    }
  }
  return out
}

function Centang({ line, week, checked, onCentang }: { line: Line; week: number; checked: boolean; onCentang: (line: Line, week: number, checked: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="size-4 shrink-0 cursor-pointer accent-primary"
      checked={checked}
      aria-label={`${line.def.label} sudah dilakukan`}
      title={checked ? "Sudah dilakukan. Hapus centang untuk membatalkan." : "Tandai sudah dilakukan"}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onCentang(line, week, e.target.checked)}
    />
  )
}

/** Phone layout: pick one period (or the total) and read a two-column list, so nothing scrolls sideways. */
function PhoneTable({ block, days, weekLabel, onEdit, onAddRow, tanpaTambah, hurufAsli, onRenameRow, onRenameGroup, periodeAwal, bisaCentang, onCentang, bernomor, hanyaLihat, ketBaris, lipat, onLipat }: Props) {
  const { pick, setPick } = usePeriodPick(Math.min(periodeAwal ?? days.length - 1, Math.max(days.length - 1, 0)))
  const total = pick >= days.length
  const nomor = bernomor ? nomorBaris(block) : null
  const induk = useMemo(() => punyaRincian(block), [block])
  const options = [
    ...days.map((_, i) => ({ key: String(i), label: 'Periode', sub: weekLabel(i) })),
    { key: 'total', label: block.tabel === 'neraca' ? 'Posisi terakhir' : 'Jumlah', sub: '' },
  ]
  return (
    <div className="space-y-3 md:hidden">
      <PeriodPicker options={options} pick={pick} onPick={setPick} />
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label={block.title.slice(3)}>
          <TableBody>
            {block.lines.map((line) => {
              if (isGroup(line)) return <GroupHead key={`g-${line.label}`} group={line} colSpan={nomor ? 3 : 2} onAddRow={onAddRow} tanpaTambah={tanpaTambah} onRenameGroup={onRenameGroup} />
              if (line.hidden || (line.def.induk && lipat?.has(line.def.induk))) return null
              const can = editable(line) && !total && !hanyaLihat
              const rename = !editable(line) && !hanyaLihat && !!onRenameRow && bisaDiganti(line.def.key)
              const cell = total ? { value: line.total, manual: false } : line.cells[pick]
              return (
                <TableRow
                  key={line.def.key}
                  className={`${line.def.emphasis ? 'bg-muted/50 font-semibold' : ''} ${can || rename ? 'cursor-pointer active:bg-muted/60' : ''}`}
                  onClick={can ? () => onEdit(line, pick) : rename ? () => onRenameRow!(line) : undefined}
                >
                  {nomor && !line.def.emphasis && (
                    <TableCell className="w-16 px-1 text-center tabular-nums text-muted-foreground">
                      {!line.def.induk && (
                        <span className="inline-flex items-center justify-end gap-0.5">
                          {lipat && onLipat && induk.has(line.def.key) ? <Simpul line={line} lipat={lipat} onLipat={onLipat} /> : <span className="inline-block w-7" aria-hidden="true" />}
                          {nomor.get(line.def.key) ?? ''}
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell colSpan={nomor && line.def.emphasis ? 2 : 1} className={`whitespace-normal ${line.def.induk ? GAYA_ANAK : ''}`}>{line.def.induk && <NomorRincian teks={nomor?.get(line.def.key)} />}{line.def.emphasis && !hurufAsli ? sentenceCase(line.def.label) : line.def.label}<Ket teks={ketBaris?.(line)} /></TableCell>
                  <TableCell className={`whitespace-nowrap text-right tabular-nums ${line.def.induk ? GAYA_ANAK : ''} ${cell?.selesai ? SELESAI : ''}`}>
                    <span className="inline-flex items-center justify-end gap-3">
                      <Amount value={cell?.value ?? null} manual={!hanyaLihat && !!cell?.manual} warisan={!!line.def.induk} />
                      {!total && onCentang && bisaCentang?.(line) && <Centang line={line} week={pick} checked={!!cell?.selesai} onCentang={onCentang} />}
                    </span>
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
  const { block, days, weekLabel, onEdit, onAddRow, tanpaTambah, hurufAsli, onRenameRow, onRenameGroup, bisaCentang, onCentang, bernomor, hanyaLihat, ketBaris } = props
  const nomor = bernomor ? nomorBaris(block) : null
  const [lipatSendiri, setLipatSendiri] = useState<ReadonlySet<string>>(new Set())
  const induk = useMemo(() => punyaRincian(block), [block])
  const lipat = props.lipat ?? lipatSendiri
  const onLipat =
    props.onLipat ??
    ((key: string) =>
      setLipatSendiri((sekarang) => {
        const next = new Set(sekarang)
        if (!next.delete(key)) next.add(key)
        return next
      }))
  const semuaTertutup = induk.size > 0 && [...induk].every((k) => lipat.has(k))
  const lipatSemua = () => (semuaTertutup ? setLipatSendiri(new Set()) : setLipatSendiri(new Set(induk)))
  const kembangan = { ...props, lipat, onLipat }
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{sentenceCase(block.title.slice(3))}</CardTitle>
        {nomor && induk.size > 0 && !props.lipat && (
          <Button type="button" variant="outline" size="sm" onClick={lipatSemua}>
            {semuaTertutup ? <ChevronsUpDown className="size-4" aria-hidden="true" /> : <ChevronsDownUp className="size-4" aria-hidden="true" />}
            {semuaTertutup ? 'Buka semua rincian' : 'Lipat semua rincian'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <PhoneTable {...kembangan} />
        <div className="hidden max-w-full overflow-x-auto rounded-lg border md:block">
          <Table className="table-fixed min-w-[calc(var(--lebar)+var(--n)*142px)]" style={{ '--n': days.length + 1, '--lebar': nomor ? '292px' : '220px' } as React.CSSProperties} aria-label={block.title.slice(3)}>
            <colgroup>
              {nomor && <col className="w-[72px]" />}
              <col className="w-[220px]" />
              {days.map((d) => (
                <col key={d} className="w-[142px]" />
              ))}
              <col className="w-[142px]" />
            </colgroup>
            <TableHeader className="bg-muted">
              <TableRow>
                {nomor && <TableHead className="sticky left-0 z-10 bg-muted px-2 text-center">No</TableHead>}
                <TableHead className={`sticky z-10 bg-muted ${nomor ? 'left-[72px]' : 'left-0'}`}>Uraian</TableHead>
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
                if (isGroup(line)) return <GroupHead key={`g-${line.label}`} group={line} colSpan={days.length + (nomor ? 3 : 2)} onAddRow={onAddRow} tanpaTambah={tanpaTambah} onRenameGroup={onRenameGroup} />
                if (line.hidden || (line.def.induk && lipat.has(line.def.induk))) return null
                const can = editable(line) && !hanyaLihat
                const rename = !can && !hanyaLihat && !!onRenameRow && bisaDiganti(line.def.key)
                const lastWithData = Math.max(0, line.cells.map((c) => c.value !== null).lastIndexOf(true))
                return (
                  <TableRow key={line.def.key} className={line.def.emphasis ? 'bg-muted/50 font-semibold' : undefined}>
                    {nomor && !line.def.emphasis && (
                      <TableCell className="sticky left-0 z-10 bg-card px-1 text-center tabular-nums text-muted-foreground">
                        {!line.def.induk && (
                          <span className="inline-flex items-center justify-end gap-0.5">
                            {induk.has(line.def.key) ? <Simpul line={line} lipat={lipat} onLipat={onLipat} /> : <span className="inline-block w-7" aria-hidden="true" />}
                            {nomor.get(line.def.key) ?? ''}
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell
                      colSpan={nomor && line.def.emphasis ? 2 : 1}
                      className={`sticky z-10 ${line.def.induk ? GAYA_ANAK : ''} ${nomor && !line.def.emphasis ? 'left-[72px]' : 'left-0'} ${line.def.emphasis ? 'bg-muted font-semibold' : 'bg-card'} ${can || rename ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={can ? () => onEdit(line, lastWithData) : rename ? () => onRenameRow!(line) : undefined}
                    >
                      {line.def.induk && <NomorRincian teks={nomor?.get(line.def.key)} />}
                      {line.def.emphasis && !hurufAsli ? sentenceCase(line.def.label) : line.def.label}
                      <Ket teks={ketBaris?.(line)} />
                    </TableCell>
                    {line.cells.map((cell, w) => (
                      <TableCell
                        key={days[w]}
                        className={`whitespace-nowrap text-right tabular-nums ${can ? 'cursor-pointer hover:bg-muted/60' : ''} ${line.def.induk ? GAYA_ANAK : ''} ${cell.selesai ? SELESAI : ''}`}
                        onClick={can ? () => onEdit(line, w) : undefined}
                      >
                        <span className="inline-flex items-center justify-end gap-3">
                          <Amount value={cell.value} manual={!hanyaLihat && cell.manual} warisan={!!line.def.induk} />
                          {onCentang && bisaCentang?.(line) && <Centang line={line} week={w} checked={!!cell.selesai} onCentang={onCentang} />}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className={`whitespace-nowrap bg-muted/40 text-right tabular-nums ${line.def.induk ? GAYA_ANAK : ''}`}>
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
