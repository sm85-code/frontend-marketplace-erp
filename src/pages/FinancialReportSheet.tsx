import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Download } from 'lucide-react'
import * as reports from '@/api/financialReports'
import type { Overview } from '@/api/financialReports'
export { sumAmounts } from '@/lib/financialAmounts'
import FinancialSellerBalance from './FinancialSellerBalance'
import FinancialShippingReceivables from './FinancialShippingReceivables'
import FinancialPendingReconciliation from './FinancialPendingReconciliation'
import FinancialSheetTable from './FinancialSheetTable'
import { AddRowDialog, EditCellDialog, RenameDialog, type EditTarget } from './FinancialSheetDialogs'
import { fmtRp, getApiError } from '@/api/client'
import { exportCsv } from '@/lib/exportData'
import { cellKey, computeSheet, emptyLembar, isGroup, type GroupDef, type Lembar, type Line } from '@/lib/sheetEngine'
import { sheetSections } from '@/lib/sheetSections'
import { sheetDays } from '@/lib/sheetDays'
import { bisaDiganti, namai, setNamaBaris, setNamaGrup } from '@/lib/namaBaris'
import { Button } from '@/components/ui/button'
import KartuMetrik from '@/components/KartuMetrik'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const months = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

// Monday-Saturday of the n-th reporting week of a month (the same weeks the Shopee tables use), e.g. "28 Sep–3 Okt".
const shortDate = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function weekRange(month: string, index: number): string {
  const first = new Date(`${month}-01T12:00:00Z`)
  const monday = new Date(first)
  monday.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7) + index * 7)
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)
  return `${shortDate(monday)}–${shortDate(saturday)}`
}

export default function FinancialReportSheet({
  data,
  month,
}: {
  data: Overview
  month: string
}) {
  const { records, days } = sheetDays(data, month)

  const qc = useQueryClient()
  const manual = useQuery({ queryKey: ['financial-manual-sheet', month], queryFn: () => reports.lembarManual(month) })
  const lembar: Lembar = manual.data?.lembar ?? emptyLembar()
  const save = useMutation({
    mutationFn: (next: Lembar) => reports.saveLembarManual(month, manual.data?.version ?? 0, next),
    onSuccess: (saved) => qc.setQueryData(['financial-manual-sheet', month], saved),
    onError: (error) => {
      toast.error(getApiError(error))
      void qc.invalidateQueries({ queryKey: ['financial-manual-sheet', month] })
    },
  })
  const plain = useMemo(
    () => computeSheet(sheetSections(data), records, days, lembar),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, lembar, days.join('|')],
  )
  const blocks = useMemo(() => namai(plain, lembar), [plain, lembar])
  const originalLabel = (key: string) => plain.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)?.def.label ?? key
  const lineOf = (key: string) => blocks.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)

  const [target, setTarget] = useState<(EditTarget & { week: number }) | null>(null)
  const [addTo, setAddTo] = useState<GroupDef | null>(null)
  const openEdit = (line: Line, week: number) =>
    setTarget({
      key: line.def.key,
      label: line.def.label,
      period: weekRange(month, week),
      current: line.cells[week]?.value ?? null,
      manual: line.cells[week]?.manual ?? false,
      custom: line.custom,
      renamable: bisaDiganti(line.def.key),
      week,
    })
  const commit = (next: Lembar) => {
    save.mutate(next)
    setTarget(null)
  }
  const withoutRow = (id: string): Lembar => ({
    ...lembar,
    baris: lembar.baris.filter((b) => b.id !== id),
    sel: Object.fromEntries(Object.entries(lembar.sel).filter(([k]) => !k.startsWith(`${id}|`))),
  })
  const onSave = (value: string, label: string) => {
    if (!target) return
    const named = target.renamable ? setNamaBaris(lembar, target.key, originalLabel(target.key), label) : lembar
    commit({ ...named, sel: { ...named.sel, [cellKey(target.key, days[target.week])]: value } })
  }
  const [ren, setRen] = useState<{ title: string; label: string; save: (label: string) => Lembar } | null>(null)
  const renameRow = (line: Line) =>
    setRen({ title: 'Ubah nama baris', label: line.def.label, save: (label) => setNamaBaris(lembar, line.def.key, originalLabel(line.def.key), label) })
  const renameGroup = (group: GroupDef) =>
    setRen({ title: 'Ubah judul kelompok', label: group.tampil ?? group.label, save: (label) => setNamaGrup(lembar, group.tabel, group.label, label) })
  const onClear = () => {
    if (!target) return
    const sel = { ...lembar.sel }
    delete sel[cellKey(target.key, days[target.week])]
    const stillUsed = Object.keys(sel).some((k) => k.startsWith(`${target.key}|`))
    commit(target.custom && !stillUsed ? withoutRow(target.key) : { ...lembar, sel })
  }
  const onAdd = (label: string) => {
    if (!addTo) return
    const id = `c:${crypto.randomUUID().slice(0, 8)}`
    save.mutate({ ...lembar, baris: [...lembar.baris, { id, tabel: addTo.tabel, grup: addTo.label, label }] })
    setAddTo(null)
  }

  const title = `LAPORAN KEUANGAN · ${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`
  const exportReport = () =>
    exportCsv(`laporan-${month}.csv`, [
      [title],
      ['Uraian', ...days.map(dateLabel), 'JUMLAH / POSISI TERAKHIR'],
      ...blocks.flatMap((b) => [
        [b.title],
        ...b.lines.map((line) =>
          isGroup(line) ? [line.label] : [line.def.label, ...line.cells.map((c) => c.value), line.total],
        ),
      ]),
    ])
  // The weekly Shopee tables follow the calendar (shipping Monday-Saturday, balance cut-off Sunday 23:59), not the date of the
  // last saved report: in the current month they read up to today, in other months the whole month.
  const todayWib = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  const reportUntil = todayWib.startsWith(month) ? todayWib : undefined
  const summaries = [
    { label: 'Pemasukan', value: lineOf('jml_pemasukan')?.total ?? null, icon: ArrowDownLeft, note: 'Akumulasi periode terisi' },
    { label: 'Pengeluaran', value: lineOf('jml_pengeluaran')?.total ?? null, icon: ArrowUpRight, note: 'Akumulasi periode terisi' },
    { label: 'Laba / Rugi', value: lineOf('laba')?.total ?? null, icon: TrendingUp, note: 'Akumulasi periode terisi' },
    {
      label: 'Kas utama',
      value: lineOf('akhir')?.total ?? data.saldo_awal?.saldo.kas_utama ?? null,
      icon: Wallet,
      note: 'Posisi terakhir',
    },
  ]
  const weekLabel = (i: number) => weekRange(month, i)
  return (
    <section aria-label="Tabel laporan keuangan" className="min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaries.map((s) => (
          <KartuMetrik key={s.label} label={s.label} icon={s.icon} nilai={s.value === null ? '—' : fmtRp(s.value)} catatan={s.note} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Rekap {months[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
          </h2>
        </div>
        <Button variant="outline" onClick={exportReport} disabled={!records.length}>
          <Download className="h-4 w-4" /> Unduh laporan
        </Button>
      </div>
      <Tabs defaultValue="0" className="min-w-0">
        <div className="min-w-0 overflow-x-auto">
          <TabsList className="section-tabs order-status-tabs" aria-label="Bagian laporan keuangan">
            {['Pemasukan', 'Pengeluaran', 'Laba/Rugi', 'Arus Kas', 'Neraca'].map((label, i) => (
              <TabsTrigger key={label} value={String(i)}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {blocks.map((block, i) => (
          <TabsContent key={block.title} value={String(i)} className="min-w-0">
            {i === 0 ? (
              <div className="min-w-0 space-y-5">
                <FinancialSheetTable block={block} days={days} weekLabel={weekLabel} onEdit={openEdit} onAddRow={setAddTo} onRenameRow={renameRow} onRenameGroup={renameGroup} hurufAsli />
                <FinancialShippingReceivables until={reportUntil} month={month} columns={days.length} />
                <FinancialPendingReconciliation month={month} />
                <FinancialSellerBalance month={month} columns={days.length} />
              </div>
            ) : (
              <FinancialSheetTable block={block} days={days} weekLabel={weekLabel} onEdit={openEdit} onAddRow={setAddTo} onRenameRow={renameRow} onRenameGroup={renameGroup} hurufAsli />
            )}
          </TabsContent>
        ))}
      </Tabs>
      <EditCellDialog
        target={target}
        onClose={() => setTarget(null)}
        onSave={onSave}
        onClear={onClear}
        onDelete={() => (target?.custom ? onClear() : onSave('0', target?.label ?? ''))}
        onDeleteRow={() => target && commit(withoutRow(target.key))}
      />
      <RenameDialog
        target={ren}
        onClose={() => setRen(null)}
        onSave={(label) => {
          if (ren) save.mutate(ren.save(label))
          setRen(null)
        }}
      />
      <AddRowDialog group={addTo ? { tabel: addTo.tabel, grup: addTo.label } : null} onClose={() => setAddTo(null)} onAdd={onAdd} />
    </section>
  )
}
