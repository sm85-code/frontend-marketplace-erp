import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Download, Wallet } from 'lucide-react'
import * as reports from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/exportData'
import { applyRinci, BARIS_RINCI, GRUP_BARU, hidden, keyNama, keyNilaiDasar, keySembunyi, RINCI_TABEL, SELISIH } from '@/lib/arusKasRinci'
import { computeSheet, emptyLembar, isGroup, type Lembar, type Line } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { sheetSections } from '@/lib/sheetSections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BarHalaman from '@/components/daftar/BarHalaman'
import KartuMetrik from '@/components/KartuMetrik'
import Spinner from '@/components/Spinner'
import FinancialSheetTable from './FinancialSheetTable'
import { AddRowDialog } from './FinancialSheetDialogs'
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
  const block = useMemo(() => applyRinci(plain, days, lembar), [plain, lembar, days])
  const lineOf = (key: string) => plain.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)
  const originalLabel = (base: string) => lineOf(base)?.def.label ?? base

  const [target, setTarget] = useState<(RinciTarget & { week: number }) | null>(null)
  const [addTo, setAddTo] = useState(false)
  const isOriginal = (line: Line) => (BARIS_RINCI as readonly string[]).includes(line.def.key)
  const openEdit = (line: Line, week: number) => {
    if (line.def.key.endsWith(':selisih') || !(isOriginal(line) || line.custom)) return
    setTarget({
      key: line.def.key,
      base: isOriginal(line) ? line.def.key : '',
      label: line.def.label,
      period: weekRange(month, week),
      current: line.cells[week]?.value ?? null,
      manual: line.cells[week]?.manual ?? false,
      split: !isOriginal(line),
      week,
    })
  }
  const cellId = (t: RinciTarget & { week: number }) => (t.split ? `${t.key}|${days[t.week]}` : `${keyNilaiDasar(t.base)}|${days[t.week]}`)
  const commit = (next: Lembar) => {
    save.mutate(next)
    setTarget(null)
  }
  const withName = (base: string, label: string): Lembar['baris'] => {
    const rest = lembar.baris.filter((b) => b.id !== keyNama(base))
    return label === originalLabel(base) ? rest : [...rest, { id: keyNama(base), tabel: RINCI_TABEL, grup: base, label }]
  }
  const onSave = (label: string, value: string) => {
    if (!target) return
    const sel = { ...lembar.sel, [cellId(target)]: value }
    const baris = target.split ? lembar.baris.map((b) => (b.id === target.key ? { ...b, label } : b)) : withName(target.base, label)
    commit({ ...lembar, sel, baris })
  }
  const onClearValue = () => {
    if (!target) return
    const sel = { ...lembar.sel }
    delete sel[cellId(target)]
    commit({ ...lembar, sel })
  }
  const onDeleteRow = () => {
    if (!target) return
    if (!target.split) {
      commit({ ...lembar, baris: [...lembar.baris, { id: keySembunyi(target.base), tabel: RINCI_TABEL, grup: target.base, label: 'sembunyi' }] })
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
    save.mutate({ ...lembar, baris: [...lembar.baris, { id: `c:${crypto.randomUUID().slice(0, 8)}`, tabel: RINCI_TABEL, grup: GRUP_BARU, label }] })
    setAddTo(false)
  }

  const total = (key: string) => lineOf(key)?.total ?? null
  const cards = [
    { label: 'Kas masuk', value: total('kas_masuk'), icon: ArrowDownLeft, note: 'Akumulasi periode terisi' },
    { label: 'Kas keluar', value: total('kas_keluar'), icon: ArrowUpRight, note: 'Akumulasi periode terisi' },
    { label: 'Transfer antar kas', value: total('transfer'), icon: Wallet, note: 'Akumulasi periode terisi' },
    { label: 'Saldo akhir kas utama', value: total('akhir') ?? data.saldo_awal?.saldo.kas_utama ?? null, icon: Wallet, note: 'Posisi terakhir' },
  ]
  const exportReport = () =>
    exportCsv(`arus-kas-${month}.csv`, [
      ['ARUS KAS'],
      ['Uraian', ...days.map(dateLabel), 'JUMLAH / POSISI TERAKHIR'],
      ...block.lines.filter((l) => isGroup(l) || !l.hidden).map((line) => (isGroup(line) ? [line.label] : [line.def.label, ...line.cells.map((c) => c.value), line.total])),
    ])
  return (
    <section aria-label="Tabel arus kas" className="min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <KartuMetrik key={c.label} label={c.label} icon={c.icon} nilai={c.value === null ? '—' : fmtRp(c.value)} catatan={c.note} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Baris penjualan dan jasa di Kas masuk bebas diubah: ganti nama dan nilai, gabungkan, hapus, atau pecah menjadi baris sebanyak apa pun. Jumlah kas masuk tetap sama; yang belum terbagi tampil sebagai “{SELISIH}”.{(BARIS_RINCI as readonly string[]).some((k) => hidden(lembar, k)) && (<> <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={restore}>Tampilkan baris asli</button></>)}
        </p>
        <Button variant="outline" onClick={exportReport} disabled={!records.length}>
          <Download className="h-4 w-4" /> Unduh arus kas
        </Button>
      </div>
      <FinancialSheetTable block={block} days={days} weekLabel={(i) => weekRange(month, i)} onEdit={openEdit} onAddRow={() => undefined} tanpaTambah />
      <ArusKasRinciDialog
        target={target}
        onClose={() => setTarget(null)}
        onSave={onSave}
        onClearValue={onClearValue}
        onDeleteRow={onDeleteRow}
        onAddSplit={() => {
          setTarget(null)
          setAddTo(true)
        }}
      />
      <AddRowDialog group={addTo ? { tabel: RINCI_TABEL, grup: `${originalLabel(BARIS_RINCI[0])} / ${originalLabel(BARIS_RINCI[1])}` } : null} onClose={() => setAddTo(false)} onAdd={onAdd} />
    </section>
  )
}
