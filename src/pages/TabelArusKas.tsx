import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import * as reports from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { exportCsv } from '@/lib/exportData'
import { ANAK, anakDari, applyRinci, keyKategori, keyNama, keyNilaiDasar, keySelesai, keySembunyi, RINCI_TABEL, splitsOf } from '@/lib/arusKasRinci'
import { kategoriDari, kategoriRincian, opsiKategori, setKategori } from '@/lib/kategoriKeuangan'
import { computeSheet, emptyLembar, isGroup, type GroupDef, type Lembar, type Line } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { namai, setNamaGrup } from '@/lib/namaBaris'
import { periodeBerjalan, weekRange } from '@/lib/tanggal'
import { sheetSections } from '@/lib/sheetSections'
import { AksiHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import FinancialSheetTable from './FinancialSheetTable'
import { AddRowDialog, RenameDialog } from './FinancialSheetDialogs'
import ArusKasRinciDialog, { type RinciTarget } from './ArusKasRinciDialog'

const dateLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** The cash-flow table with everything Arus Kas offers (rename, split, delete, done tick, numbering); shared by the Arus Kas page and the Laporan Keuangan tab. */
export default function TabelArusKas({ data, month, tanpaUnduh, tanpaCentang, hanyaLihat }: { data: reports.Overview; month: string; tanpaUnduh?: boolean; tanpaCentang?: boolean; hanyaLihat?: boolean }) {
  const { records, days } = sheetDays(data, month)
  const qc = useQueryClient()
  const manual = useQuery({ queryKey: ['financial-manual-sheet', month], queryFn: () => (hanyaLihat ? reports.lembarArusKas(month) : reports.lembarManual(month)) })
  const lembar: Lembar = manual.data?.lembar ?? emptyLembar()
  const save = useMutation({
    mutationFn: (next: Lembar) => (hanyaLihat ? reports.saveLembarArusKas : reports.saveLembarManual)(month, manual.data?.version ?? 0, next),
    // Show the change at once (ticks especially); the saved version replaces it, an error reloads the real one.
    onMutate: (next: Lembar) => qc.setQueryData<reports.LembarManualResponse>(['financial-manual-sheet', month], (old) => (old ? { ...old, lembar: next } : old)),
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
  const childIds = new Set(lembar.baris.filter((b) => b.tabel === RINCI_TABEL && b.grup.startsWith(ANAK)).map((b) => b.id))
  // Rows whose name and figures are stored under their own id (added rows and sub-rows), unlike the report's own rows.
  const splitIds = new Set([...splitsOf(lembar).map((b) => b.id), ...childIds])
  const indukDari = (key: string) => lembar.baris.find((b) => b.id === key)?.grup.slice(ANAK.length) ?? ''
  const anyHidden = lembar.baris.some((b) => b.id.startsWith('c:hide-'))

  const [target, setTarget] = useState<(RinciTarget & { week: number }) | null>(null)
  const [addTo, setAddTo] = useState<GroupDef | null>(null)
  const [addChildTo, setAddChildTo] = useState<string | null>(null)
  const grupDari = (key: string) => {
    let group = ''
    for (const l of block.lines) {
      if (isGroup(l)) group = l.label
      else if (l.def.key === key) break
    }
    return group
  }
  const openEdit = (line: Line, week: number) => {
    if (line.def.key.endsWith(':selisih')) return
    const grup = grupDari(line.def.key)
    const adaRincian = anakDari(lembar, line.def.key).length > 0
    // A row with sub-rows has no category of its own: each sub-row (1.1, 1.2, ...) picks where its figure goes.
    const opsi = line.def.emphasis || adaRincian ? undefined : opsiKategori(grup)
    setTarget({
      key: line.def.key,
      label: line.def.label,
      period: weekRange(month, week),
      current: line.cells[week]?.value ?? null,
      manual: line.cells[week]?.manual ?? false,
      split: splitIds.has(line.def.key),
      child: childIds.has(line.def.key),
      anak: adaRincian,
      total: !!line.def.emphasis,
      opsi,
      kategori: !opsi ? undefined : line.def.induk ? kategoriRincian(lembar, line.def.key, line.def.induk, grup) : kategoriDari(lembar, line.def.key, grup),
      kategoriDiRincian: adaRincian && !!opsiKategori(grup),
      week,
    })
  }
  /** The component a row's (or sub-row's) figure is filed under, shown after its name. A row with sub-rows shows none: they do. */
  const ketKategori = (line: Line) => {
    if (line.def.emphasis || anakDari(lembar, line.def.key).length > 0) return undefined
    const grup = grupDari(line.def.key)
    const opsi = opsiKategori(grup)
    if (!opsi) return undefined
    const id = line.def.induk ? kategoriRincian(lembar, line.def.key, line.def.induk, grup) : kategoriDari(lembar, line.def.key, grup)
    return opsi.find((o) => o.id === id)?.label
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
  const onSave = (label: string, value: string, kategori?: string) => {
    if (!target) return
    const sel = target.total || target.anak ? lembar.sel : { ...lembar.sel, [cellId(target)]: value }
    const baris = target.split ? lembar.baris.map((b) => (b.id === target.key ? { ...b, label } : b)) : withName(target.key, label)
    const next = { ...lembar, sel, baris }
    const grup = grupDari(target.key)
    // A sub-row's default is its row's category; choosing that one again removes its own choice.
    const bawaan = target.child ? kategoriDari(lembar, indukDari(target.key), grup) : undefined
    commit(kategori ? setKategori(next, target.key, grup, kategori, bawaan) : next)
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
    // A row takes its sub-rows with it.
    const kids = anakDari(lembar, target.key).map((b) => b.id)
    const gone = new Set([target.key, ...kids, keyKategori(target.key), ...kids.map(keyKategori)])
    commit({
      ...lembar,
      baris: lembar.baris.filter((b) => !gone.has(b.id)),
      sel: Object.fromEntries(Object.entries(lembar.sel).filter(([k]) => ![...gone].some((id) => k.startsWith(`${id}|`)))),
    })
  }
  /** Tick = the cash transaction of that period was done. Only a marker; ticks made while ticking also froze the figure, which unticking still releases. */
  const onCentang = (line: Line, week: number, checked: boolean) => {
    const day = days[week]
    const valueKey = splitIds.has(line.def.key) ? `${line.def.key}|${day}` : `${keyNilaiDasar(line.def.key)}|${day}`
    const flag = keySelesai(line.def.key, day)
    const sel = { ...lembar.sel }
    if (checked) {
      sel[flag] = '1'
    } else {
      if (sel[flag] === '2') delete sel[valueKey] // older ticks froze the figure; unticking gives it back
      delete sel[flag]
    }
    save.mutate({ ...lembar, sel })
  }
  const bisaCentang = (line: Line) => !line.def.emphasis && line.def.kind === 'input' && !line.def.induk
  const restore = () => save.mutate({ ...lembar, baris: lembar.baris.filter((b) => !b.id.startsWith('c:hide-')) })
  const onAdd = (label: string) => {
    const grup = addChildTo ? `${ANAK}${addChildTo}` : addTo?.label
    if (!grup) return
    save.mutate({ ...lembar, baris: [...lembar.baris, { id: `c:${crypto.randomUUID().slice(0, 8)}`, tabel: RINCI_TABEL, grup, label }] })
    setAddTo(null)
    setAddChildTo(null)
  }
  const nameOfKey = (key: string) => block.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)?.def.label ?? ''

  // The Arus Kas page shows the main rows only; the sub-rows (breakdown) are seen and edited in Laporan Keuangan.
  const tampil = useMemo(() => (hanyaLihat ? { ...block, lines: block.lines.filter((l) => isGroup(l) || !l.def.induk) } : block), [block, hanyaLihat])
  const exportReport = () =>
    exportCsv(`arus-kas-${month}.csv`, [
      ['ARUS KAS'],
      ['Uraian', ...days.map(dateLabel), 'JUMLAH / POSISI TERAKHIR'],
      ...tampil.lines.filter((l) => isGroup(l) || !l.hidden).map((line) => (isGroup(line) ? [line.label] : [line.def.label, ...line.cells.map((c) => c.value), line.total])),
    ])
  return (
    <section aria-label="Tabel arus kas" className="min-w-0 space-y-5">
      {anyHidden && !hanyaLihat && (
        <button type="button" className="text-sm text-primary underline-offset-2 hover:underline" onClick={restore}>
          Tampilkan baris yang dihapus
        </button>
      )}
      {!tanpaUnduh && (
        <AksiHalaman>
          <Button variant="outline" onClick={exportReport} disabled={!records.length}>
            <Download className="h-4 w-4" /> Unduh arus kas
          </Button>
        </AksiHalaman>
      )}
      <FinancialSheetTable ketBaris={ketKategori} block={tampil} days={days} weekLabel={(i) => weekRange(month, i)} onEdit={openEdit} onAddRow={setAddTo} hurufAsli bernomor hanyaLihat={hanyaLihat} tanpaTambah={hanyaLihat} bisaCentang={tanpaCentang ? undefined : bisaCentang} onCentang={tanpaCentang ? undefined : onCentang} periodeAwal={periodeBerjalan(month, days.length)} onRenameGroup={hanyaLihat ? undefined : (group) => setRen({ label: group.tampil ?? group.label, group })} />
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
        onAddChild={() => {
          setAddChildTo(target ? (target.child ? indukDari(target.key) : target.key) : null)
          setTarget(null)
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
      <AddRowDialog
        group={addChildTo ? { tabel: RINCI_TABEL, grup: `Rincian dari ${nameOfKey(addChildTo)}` } : addTo ? { tabel: RINCI_TABEL, grup: addTo.label } : null}
        onClose={() => {
          setAddTo(null)
          setAddChildTo(null)
        }}
        onAdd={onAdd}
      />
    </section>
  )
}
