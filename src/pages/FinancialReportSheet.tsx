import { useMemo, useState } from 'react'
import { useLabel } from '@/api/pengaturanUi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Download } from 'lucide-react'
import * as reports from '@/api/financialReports'
import type { Overview } from '@/api/financialReports'
export { sumAmounts } from '@/lib/financialAmounts'
import FinancialSellerBalance from './FinancialSellerBalance'
import FinancialShippingReceivables from './FinancialShippingReceivables'
import FinancialPendingReconciliation from './FinancialPendingReconciliation'
import FinancialSheetTable, { rentangBulan } from './FinancialSheetTable'
import TabelArusKas from './TabelArusKas'
import RujukanBiayaProduksi from './RujukanBiayaProduksi'
import { AddRowDialog, EditCellDialog, RenameDialog, type EditTarget } from './FinancialSheetDialogs'
import { fmtRp, getApiError } from '@/api/client'
import { exportCsv } from '@/lib/exportData'
import { cellKey, emptyLembar, isGroup, type GroupDef, type Lembar, type Line } from '@/lib/sheetEngine'
import { useKategori, useKelompok } from '@/api/kategori'
import { susunLaporan } from '@/lib/susunLaporan'
import { sheetDays } from '@/lib/sheetDays'
import { periodeBerjalan, weekRange } from '@/lib/tanggal'
import { bisaDiganti, idTab, namai, setNamaBaris, setNamaGrup, TAB_LAPORAN, TAB_TAMPIL } from '@/lib/namaBaris'
import { AksiHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import KartuPembagianLaba, { TabelPembagianLaba } from '@/components/KartuPembagianLaba'
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

export { weekRange }

export default function FinancialReportSheet({
  data,
  month,
}: {
  data: Overview
  month: string
}) {
  const t = useLabel()
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
  const daftarKat = useKategori()
  const kelompok = useKelompok()
  // The Operasional entries of the month fill their Arus Kas rows; a figure typed by hand in a cell wins over them.
  const operasional = useQuery({ queryKey: ['operasional-arus-kas', month, false], queryFn: () => reports.operasionalBulan(month, false) })
  const { plain } = useMemo(
    () => susunLaporan(data, records, days, lembar, operasional.data ?? [], daftarKat, kelompok),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, lembar, days.join('|'), operasional.data, daftarKat, kelompok, records],
  )
  const blocks = useMemo(() => namai(plain, lembar, t), [plain, lembar, t])
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
      ['Uraian', ...days.map(dateLabel), `BULANAN ${rentangBulan(month)}`],
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
    { label: t(idTab('pemasukan'), 'Pemasukan'), value: lineOf('jml_pemasukan')?.total ?? null, icon: ArrowDownLeft, note: 'Akumulasi periode terisi' },
    { label: t(idTab('pengeluaran'), 'Pengeluaran'), value: lineOf('jml_pengeluaran')?.total ?? null, icon: ArrowUpRight, note: 'Akumulasi periode terisi' },
    { label: t(idTab('laba_rugi'), 'Laba / Rugi'), value: lineOf('laba')?.total ?? null, icon: TrendingUp, note: 'Akumulasi periode terisi' },
    {
      label: 'Kas Utama',
      value: lineOf('akhir')?.total ?? data.saldo_awal?.saldo.kas_utama ?? null,
      icon: Wallet,
      note: 'Posisi terakhir',
    },
  ]
  const weekLabel = (i: number) => weekRange(month, i)
  const periodeAwal = periodeBerjalan(month, days.length)
  const bulanan = { rentang: rentangBulan(month), final: data.bulanan?.final ?? false }
  return (
    <section aria-label="Tabel laporan keuangan" className="min-w-0 space-y-5">
      {/* One compact strip instead of four cards and a heading: the tables below get the screen. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border bg-card px-3 py-2 sm:gap-x-6 sm:px-4 text-sm md:max-w-2xl" aria-label={`Rekap ${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`}>
        {summaries.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2" title={s.note}>
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="ml-auto whitespace-nowrap text-right text-[clamp(0.75rem,3.4vw,0.875rem)] font-semibold tabular-nums">{s.value === null ? '—' : fmtRp(s.value)}</dd>
          </div>
        ))}
      </dl>
      <AksiHalaman>
        <Button variant="outline" onClick={exportReport} disabled={!records.length}>
          <Download className="h-4 w-4" /> Unduh laporan
        </Button>
      </AksiHalaman>
      <Tabs defaultValue="3" className="min-w-0">
        <div className="min-w-0 overflow-x-auto">
          <TabsList className="section-tabs order-status-tabs" aria-label="Bagian laporan keuangan">
            {/* Arus Kas first; the value stays the index of its table so contents keep their place. */}
            {TAB_TAMPIL.map((tabel) => (
              <TabsTrigger key={tabel} value={String(blocks.findIndex((b) => b.tabel === (tabel === 'transaksi' ? 'pemasukan' : tabel)))}>
                {t(idTab(tabel), TAB_LAPORAN.find(([id]) => id === tabel)?.[1] ?? tabel)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {blocks.map((block, i) => block.tabel === 'pengeluaran' ? null : (
          <TabsContent key={block.title} value={String(i)} className="min-w-0">
            {block.tabel === 'pemasukan' ? (
              <div className="min-w-0 space-y-5">
                <FinancialSheetTable block={block} days={days} weekLabel={weekLabel} onEdit={openEdit} onAddRow={setAddTo} tanpaTambah={block.tabel === 'pemasukan' || block.tabel === 'pengeluaran'} onRenameRow={renameRow} onRenameGroup={renameGroup} hurufAsli periodeAwal={periodeAwal} bulanan={bulanan} />
                <FinancialShippingReceivables until={reportUntil} month={month} columns={days.length} />
                <FinancialPendingReconciliation month={month} />
                <FinancialSellerBalance month={month} columns={days.length} />
                {blocks.filter((b) => b.tabel === 'pengeluaran').map((b) => (
                  <FinancialSheetTable key={b.title} block={b} days={days} weekLabel={weekLabel} onEdit={openEdit} onAddRow={setAddTo} tanpaTambah onRenameRow={renameRow} onRenameGroup={renameGroup} hurufAsli periodeAwal={periodeAwal} bulanan={bulanan} />
                ))}
              </div>
            ) : block.tabel === 'arus_kas' ? (
              <div className="min-w-0 space-y-5">
                <TabelArusKas data={data} month={month} tanpaUnduh tanpaCentang denganBulanan />
                <TabelPembagianLaba month={month} laba={lineOf('laba')?.total ?? 0} final={data.bulanan?.final ?? false} saldoAwal={data.saldo_awal} />
                <RujukanBiayaProduksi month={month} />
              </div>
            ) : block.tabel === 'neraca' ? (
              <div className="min-w-0 space-y-5">
                <FinancialSheetTable block={block} days={days} weekLabel={weekLabel} onEdit={openEdit} onAddRow={setAddTo} onRenameRow={renameRow} onRenameGroup={renameGroup} hurufAsli periodeAwal={periodeAwal} bulanan={bulanan} />
                <KartuPembagianLaba month={month} laba={lineOf('laba')?.total ?? 0} final={data.bulanan?.final ?? false} saldoAwal={data.saldo_awal} />
              </div>
            ) : (
              <FinancialSheetTable block={block} days={days} weekLabel={weekLabel} onEdit={openEdit} onAddRow={setAddTo} tanpaTambah={block.tabel === 'pemasukan' || block.tabel === 'pengeluaran'} onRenameRow={renameRow} onRenameGroup={renameGroup} hurufAsli periodeAwal={periodeAwal} bulanan={bulanan} />
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
