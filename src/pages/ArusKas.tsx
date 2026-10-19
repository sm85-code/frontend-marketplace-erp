import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import * as reports from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/exportData'
import { applyRinci, keyNama, keyNilaiDasar, keySembunyi, RINCI_TABEL, splitsOf } from '@/lib/arusKasRinci'
import { computeSheet, emptyLembar, isGroup, type GroupDef, type Lembar, type Line } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { namai, setNamaGrup } from '@/lib/namaBaris'
import { sheetSections } from '@/lib/sheetSections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BarHalaman from '@/components/daftar/BarHalaman'
import Spinner from '@/components/Spinner'
import FinancialSheetTable from './FinancialSheetTable'
import { AddRowDialog, RenameDialog } from './FinancialSheetDialogs'
import ArusKasRinciDialog, { type RinciTarget } from './ArusKasRinciDialog'
import { weekRange } from './FinancialReportSheet'

const monthNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`
}
const dateLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function ArusKas() {
  const { user } = useAuth()
  const allowed = user?.role === 'admin'
  const [month, setMonth] = useState(monthNow)
  const overview = useQuery({ queryKey: ['financial-reports', month], queryFn: () => reports.overview(month), enabled: allowed })
  if (!allowed) return <p role="alert">Arus kas hanya dapat diakses admin.</p>
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Arus Kas" deskripsi="Arus kas Bumi Lestari, otomatis dari laporan keuangan">
        <Label htmlFor="cash-month">Bulan</Label>
        <Input id="cash-month" type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      </BarHalaman>
      {overview.isLoading && <Spinner label="Memuat arus kas…" />}
      {overview.error && (
        <div role="alert">
          <p>{getApiError(overview.error)}</p>
          <Button onClick={() => void overview.refetch()}>Coba lagi</Button>
        </div>
      )}
      {overview.data && <ArusKasSheet data={overview.data} month={month} />}
    </div>
  )
}

function ArusKasSheet({ data, month }: { data: reports.Overview; month: string }) {
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
    () => computeSheet(sheetSections(data), records, days, lembar).find((b) => b.tabel === 'arus_kas')!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, lembar, days.join('|')],
  )
  const block = useMemo(() => namai([applyRinci(plain, days, lembar)], lembar)[0], [plain, days, lembar])
  const [ren, setRen] = useState<{ label: string; group: GroupDef } | null>(null)
  const originalLabel = (key: string) => plain.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)?.def.label ?? key
  const splitIds = new Set(splitsOf(lembar).map((b) => b.id))
  const anyHidden = lembar.baris.some((b) => b.id.startsWith('c:hide-'))

  const [target, setTarget] = useState<(RinciTarget & { week: number }) | null>(null)
  const [addTo, setAddTo] = useState<GroupDef | null>(null)
  const openEdit = (line: Line, week: number) => {
    if (line.def.key.endsWith(':selisih')) return
    setTarget({
      key: line.def.key,
      label: line.def.label,
      period: weekRange(month, week),
      current: line.cells[week]?.value ?? null,
      manual: line.cells[week]?.manual ?? false,
      split: splitIds.has(line.def.key),
      total: !!line.def.emphasis,
      week,
    })
  }
  const cellId = (t: RinciTarget & { week: number }) => (t.split ? `${t.key}|${days[t.week]}` : `${keyNilaiDasar(t.key)}|${days[t.week]}`)
  const commit = (next: Lembar) => {
    save.mutate(next)
    setTarget(null)
  }
  const withName = (key: string, label: string): Lembar['baris'] => {
    const rest = lembar.baris.filter((b) => b.id !== keyNama(key))
    return label === originalLabel(key) ? rest : [...rest, { id: keyNama(key), tabel: RINCI_TABEL, grup: 'nama', label }]
  }
  const onSave = (label: string, value: string) => {
    if (!target) return
    const sel = target.total ? lembar.sel : { ...lembar.sel, [cellId(target)]: value }
    const baris = target.split ? lembar.baris.map((b) => (b.id === target.key ? { ...b, label } : b)) : withName(target.key, label)
    commit({ ...lembar, sel, baris })
  }
  const onClearValue = () => {
    if (!target) return
    const sel = { ...lembar.sel }
    delete sel[cellId(target)]
    commit({ ...lembar, sel })
  }
  const onDeleteRow = () => {
    if (!target || target.total) return
    if (!target.split) {
      commit({ ...lembar, baris: [...lembar.baris, { id: keySembunyi(target.key), tabel: RINCI_TABEL, grup: 'sembunyi', label: 'sembunyi' }] })
      return
    }
    commit({
      ...lembar,
      baris: lembar.baris.filter((b) => b.id !== target.key),
      sel: Object.fromEntries(Object.entries(lembar.sel).filter(([k]) => !k.startsWith(`${target.key}|`))),
    })
  }
  const restore = () => save.mutate({ ...lembar, baris: lembar.baris.filter((b) => !b.id.startsWith('c:hide-')) })
  const onAdd = (label: string) => {
    if (!addTo) return
    save.mutate({ ...lembar, baris: [...lembar.baris, { id: `c:${crypto.randomUUID().slice(0, 8)}`, tabel: RINCI_TABEL, grup: addTo.label, label }] })
    setAddTo(null)
  }

  const exportReport = () =>
    exportCsv(`arus-kas-${month}.csv`, [
      ['ARUS KAS'],
      ['Uraian', ...days.map(dateLabel), 'JUMLAH / POSISI TERAKHIR'],
      ...block.lines.filter((l) => isGroup(l) || !l.hidden).map((line) => (isGroup(line) ? [line.label] : [line.def.label, ...line.cells.map((c) => c.value), line.total])),
    ])
  return (
    <section aria-label="Tabel arus kas" className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {anyHidden && (
            <button type="button" className="text-sm text-primary underline-offset-2 hover:underline" onClick={restore}>
              Tampilkan baris yang dihapus
            </button>
          )}
        </div>
        <Button variant="outline" onClick={exportReport} disabled={!records.length}>
          <Download className="h-4 w-4" /> Unduh arus kas
        </Button>
      </div>
      <FinancialSheetTable block={block} days={days} weekLabel={(i) => weekRange(month, i)} onEdit={openEdit} onAddRow={setAddTo} hurufAsli onRenameGroup={(group) => setRen({ label: group.tampil ?? group.label, group })} />
      <ArusKasRinciDialog
        target={target}
        onClose={() => setTarget(null)}
        onSave={onSave}
        onClearValue={onClearValue}
        onDeleteRow={onDeleteRow}
        onAddSplit={() => {
          let group: GroupDef | null = null
          for (const l of block.lines) {
            if (isGroup(l)) group = l
            else if (l.def.key === target?.key) break
          }
          setTarget(null)
          setAddTo(group)
        }}
      />
      <RenameDialog
        target={ren && { title: 'Ubah judul kelompok', label: ren.label }}
        onClose={() => setRen(null)}
        onSave={(label) => {
          if (ren) save.mutate(setNamaGrup(lembar, ren.group.tabel, ren.group.label, label))
          setRen(null)
        }}
      />
      <AddRowDialog group={addTo ? { tabel: RINCI_TABEL, grup: addTo.label } : null} onClose={() => setAddTo(null)} onAdd={onAdd} />
    </section>
  )
}
