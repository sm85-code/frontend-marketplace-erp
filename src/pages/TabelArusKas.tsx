import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useLabel } from '@/api/pengaturanUi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import * as reports from '@/api/financialReports'
import { getApiError } from '@/api/client'
import { exportCsv } from '@/lib/exportData'
import { ANAK, anakDari, applyRinci, keyKategori, keyNama, keyNilaiDasar, keySelesai, keySembunyi, RINCI_TABEL, splitsOf } from '@/lib/arusKasRinci'
import { useKategori } from '@/api/kategori'
import { bulanFinal, useAwalBulan } from '@/lib/awalBulan'
import { denganOperasional, kunciKasKecil } from '@/lib/operasionalArusKas'
import { geser, sekategori, urutkanKasKeluar } from '@/lib/urutArusKas'
import { kategoriDari, kategoriRincian, opsiKategori, setKategori } from '@/lib/kategoriKeuangan'
import { computeSheet, hariBerisi, emptyLembar, isGroup, type GroupDef, type Lembar, type Line } from '@/lib/sheetEngine'
import { sheetDays } from '@/lib/sheetDays'
import { namai, setNamaGrup } from '@/lib/namaBaris'
import { periodeBerjalan, weekRange } from '@/lib/tanggal'
import { GRUP_PEMBAGIAN, KEY_PEMBAGIAN } from '@/config/pembagianLaba'
import { GRUP_KAS_KECIL, sheetSections } from '@/lib/sheetSections'
import { AksiHalaman } from '@/components/daftar'
import { Button } from '@/components/ui/button'
import FinancialSheetTable, { rentangBulan } from './FinancialSheetTable'
import { AddRowDialog, RenameDialog } from './FinancialSheetDialogs'
import ArusKasRinciDialog, { type RinciTarget } from './ArusKasRinciDialog'

const dateLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** The cash-flow table with everything Arus Kas offers (rename, split, delete, done tick, numbering); shared by the Arus Kas page and the Laporan Keuangan tab. */
export default function TabelArusKas({ data, month, tanpaUnduh, tanpaCentang, hanyaLihat, denganBulanan, tanpaUbah }: { data: reports.Overview; month: string; tanpaUnduh?: boolean; tanpaCentang?: boolean; hanyaLihat?: boolean; denganBulanan?: boolean; tanpaUbah?: boolean }) {
  const t = useLabel()
  const adminCentang = useAuth().user?.role === 'admin'
  const { records, days } = sheetDays(data, month)
  const qc = useQueryClient()
  const manual = useQuery({ queryKey: ['financial-manual-sheet', month], queryFn: () => (hanyaLihat ? reports.lembarArusKas(month) : reports.lembarManual(month)) })
  const lembar: Lembar = manual.data?.lembar ?? emptyLembar()
  // The read-only page (opened by staff) does not know the profit sharing: its figures are those without it. What is saved still keeps the admin's entries.
  const lembarHitung: Lembar = useMemo(() => (hanyaLihat ? { ...lembar, sel: Object.fromEntries(Object.entries(lembar.sel).filter(([k]) => !KEY_PEMBAGIAN.has(k.split('|')[0]))) } : lembar), [lembar, hanyaLihat]) // eslint-disable-line react-hooks/exhaustive-deps
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
  const daftarKat = useKategori()
  // A month with no closed report yet opens with the previous month's closing figures.
  const awalBulan = useAwalBulan(month, data)
  // The Operasional entries of the month fill their rows; a figure typed by hand in a cell wins over them.
  const operasional = useQuery({ queryKey: ['operasional-arus-kas', month, !!hanyaLihat], queryFn: () => reports.operasionalBulan(month, !!hanyaLihat) })
  const plain = useMemo(
    () => computeSheet(sheetSections(data), records, days, lembarHitung, awalBulan).find((b) => b.tabel === 'arus_kas')!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, lembarHitung, days.join('|'), awalBulan],
  )
  const lembarTampil = useMemo(
    () => denganOperasional(lembarHitung, days, operasional.data ?? [], daftarKat, plain),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lembarHitung, days.join('|'), operasional.data, daftarKat, plain],
  )
  // Weeks still open whose only figures come from Operasional entries are worked out too (row totals, closing cash).
  const plainIsi = useMemo(
    () => computeSheet(sheetSections(data), records, days, lembarHitung, awalBulan, hariBerisi(lembarTampil, days)).find((b) => b.tabel === 'arus_kas')!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, lembarHitung, days.join('|'), awalBulan, lembarTampil],
  )
  // Kas keluar rows follow the category order of Kategori Transaksi, then their own up / down order (display only).
  // Kas keluar rows that hold only Kas Kecil spending: paid out of Kas Kecil, shown as "Belanja Kas Kecil" in its section.
  const kasKecil = useMemo(() => kunciKasKecil(lembarHitung, plain, daftarKat), [lembarHitung, plain, daftarKat])
  const block = useMemo(() => urutkanKasKeluar(namai([applyRinci(plainIsi, days, lembarTampil, kasKecil)], lembarHitung, t)[0], lembarHitung, daftarKat), [plainIsi, days, lembarTampil, lembarHitung, t, daftarKat, kasKecil])
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
    if (line.def.key.endsWith(':selisih') || saldoKasKecil(line.def.key)) return
    const grup = grupDari(line.def.key)
    const adaRincian = anakDari(lembar, line.def.key).length > 0
    // A row with sub-rows has no category of its own: each sub-row (1.1, 1.2, ...) picks where its figure goes.
    const opsi = line.def.emphasis || adaRincian ? undefined : opsiKategori(grup, daftarKat)
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
      kategori: !opsi ? undefined : line.def.induk ? kategoriRincian(lembar, line.def.key, line.def.induk, grup, daftarKat) : kategoriDari(lembar, line.def.key, grup, daftarKat),
      kategoriDiRincian: adaRincian && !!opsiKategori(grup, daftarKat),
      week,
    })
  }
  /** The component a row's (or sub-row's) figure is filed under, shown after its name. A row with sub-rows shows none: they do. */
  const ketKategori = (line: Line) => {
    if (line.def.emphasis || anakDari(lembar, line.def.key).length > 0) return undefined
    const grup = grupDari(line.def.key)
    const opsi = opsiKategori(grup, daftarKat)
    if (!opsi) return undefined
    const id = line.def.induk ? kategoriRincian(lembar, line.def.key, line.def.induk, grup, daftarKat) : kategoriDari(lembar, line.def.key, grup, daftarKat)
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
    const bawaan = target.child ? kategoriDari(lembar, indukDari(target.key), grup, daftarKat) : undefined
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
  // Kas Kecil balances are worked out (opening + top-up - spending), never typed or ticked.
  const saldoKasKecil = (key: string) => key === 'kk_awal' || key === 'kk_akhir'
  // Sub-rows (each spending entry) can be ticked too, by the admin only; a tick never changes a figure (ok:<id>|<day>).
  const bisaCentang = (line: Line) => !line.def.emphasis && (line.def.induk ? adminCentang : line.def.kind === 'input') && !saldoKasKecil(line.def.key)
  const restore = () => save.mutate({ ...lembar, baris: lembar.baris.filter((b) => !b.id.startsWith('c:hide-')) })
  const onAdd = (label: string) => {
    const grup = addChildTo ? `${ANAK}${addChildTo}` : addTo?.label
    if (!grup) return
    save.mutate({ ...lembar, baris: [...lembar.baris, { id: `c:${crypto.randomUUID().slice(0, 8)}`, tabel: RINCI_TABEL, grup, label }] })
    setAddTo(null)
    setAddChildTo(null)
  }
  const nameOfKey = (key: string) => block.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)?.def.label ?? ''

  const tampil = useMemo(() => {
    // Laporan Keuangan and the read-only /arus-kas page show the same layout and figures.
    {
      // Laporan Keuangan: the profit sharing has its own table below, so its group is left out here (display only; saldo akhir
      // comes from the report). Saldo akhir Kas Utama stays, followed by Kas Kecil.
      // Transfer antar kas and Kas Kecil are one section, in transaction order: Saldo awal Kas Kecil, top-up, spending,
      // money returned, (other rows), Saldo akhir Kas Kecil. The two Kas Kecil balances are info only: Jumlah transfer
      // antar kas is worked out from the transfer rows and does not count them.
      let g = ''
      const grupOf = new Map<unknown, string>()
      for (const l of block.lines) { if (isGroup(l)) g = l.label; grupOf.set(l, g) }
      const key = (l: (typeof block.lines)[number]) => (isGroup(l) ? '' : l.def.key)
      const byKey = (k: string) => block.lines.find((l) => key(l) === k)
      const tr = block.lines.filter((l) => grupOf.get(l) === 'Transfer antar kas' && !isGroup(l) && key(l) !== 'transfer')
      // Order (imprest): Saldo awal, Belanja Kas Kecil (+ its breakdown), Saldo sebelum isi ulang, Isi ulang dari Kas Utama
      // (= the week's spending, at the closing), Pengembalian ke Kas Utama, (other rows), Saldo akhir. The old automatic
      // give-back row (tr_kk) shows only if a figure was typed in it.
      const urut = ['tr_packing', 'tr_ops']
      const kkKosong = (l: (typeof block.lines)[number] | undefined) => !l || isGroup(l) || l.cells.every((c) => !c.value)
      const belanja = block.lines.filter((l) => !isGroup(l) && (kasKecil.has(l.def.key) || (!!l.def.induk && kasKecil.has(l.def.induk))))
      // The spending row reads "Belanja Kas Kecil" (with the holder in brackets, e.g. [NURUL]); its sub-rows list each spending.
      const namaBelanja = (label: string) => (/^belanja kas kecil/i.test(label) ? label : `Belanja Kas Kecil${/\[[^\]]+\]/.exec(label)?.[0] ? ` ${/\[[^\]]+\]/.exec(label)![0]}` : ''}`)
      const belanjaTampil = new Map(belanja.map((l) => [l, isGroup(l) || l.def.induk ? l : { ...l, def: { ...l.def, label: namaBelanja(l.def.label) } }]))
      const kkAwal = byKey('kk_awal')
      const induk = belanja.filter((l) => !isGroup(l) && !l.def.induk)
      const sebelum = kkAwal && !isGroup(kkAwal) && induk.length
        ? { ...kkAwal, def: { ...kkAwal.def, key: 'kk_sebelum', label: 'Saldo sebelum isi ulang', kind: 'calc' as const, emphasis: false }, custom: false,
            cells: kkAwal.cells.map((c, w) => ({ value: c.value === null ? null : Math.round((c.value - induk.reduce((t, l) => t + (isGroup(l) ? 0 : l.cells[w].value ?? 0), 0)) * 100) / 100, manual: false })),
            total: null as number | null }
        : undefined
      if (sebelum) { const v = sebelum.cells.map((c) => c.value).filter((x): x is number => x !== null); sebelum.total = v.length ? v.at(-1)! : null }
      const isi = [kkAwal, ...belanja.map((l) => belanjaTampil.get(l) ?? l), sebelum, ...urut.map(byKey), ...tr.filter((l) => !urut.includes(key(l)) && !(key(l) === 'tr_kk' && kkKosong(l))), byKey('kk_akhir')].filter((l): l is NonNullable<typeof l> => !!l)
      const lines: typeof block.lines = []
      for (const l of block.lines) {
        const gr = grupOf.get(l)
        if (gr === GRUP_KAS_KECIL || (gr === GRUP_PEMBAGIAN && key(l) !== 'akhir')) continue
        if (gr === 'Transfer antar kas' && !isGroup(l) && key(l) !== 'transfer') continue
        if (belanja.includes(l)) continue
        lines.push(l)
        if (isGroup(l) && l.label === 'Transfer antar kas') lines.push(...isi)
      }
      return { ...block, lines }
    }
  }, [block, kasKecil])
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
      <FinancialSheetTable ketBaris={ketKategori} block={tampil} days={days} weekLabel={(i) => weekRange(month, i)} onEdit={openEdit} onAddRow={setAddTo} hurufAsli bernomor hanyaLihat={hanyaLihat || tanpaUbah} tanpaTambah={hanyaLihat || tanpaUbah} bisaCentang={tanpaCentang ? undefined : bisaCentang} onCentang={tanpaCentang ? undefined : onCentang} periodeAwal={periodeBerjalan(month, days.length)} bulanan={denganBulanan ? { rentang: rentangBulan(month), final: bulanFinal(data, month) } : undefined} onRenameGroup={hanyaLihat || tanpaUbah ? undefined : (group) => setRen({ label: group.tampil ?? group.label, group })} />
      <ArusKasRinciDialog
        target={target}
        onClose={() => setTarget(null)}
        onSave={onSave}
        onClearValue={onClearValue}
        onDeleteRow={onDeleteRow}
        urutan={(() => {
          if (!target || target.total) return undefined
          if (target.child) {
            // Sub-rows (1.1, 1.2, ...) move within their row: their order is the order they are kept in the sheet.
            const ids = anakDari(lembar, indukDari(target.key)).map((b) => b.id)
            const i = ids.indexOf(target.key)
            if (i < 0 || ids.length < 2) return undefined
            const pindah = (arah: -1 | 1) => {
              const lain = ids[i + arah]
              const a = lembar.baris.findIndex((b) => b.id === target.key)
              const b = lembar.baris.findIndex((x) => x.id === lain)
              if (a < 0 || b < 0) return
              const baris = [...lembar.baris]
              ;[baris[a], baris[b]] = [baris[b], baris[a]]
              save.mutate({ ...lembar, baris })
            }
            return { label: 'Urutan di rinciannya:', naik: i > 0 ? () => pindah(-1) : undefined, turun: i < ids.length - 1 ? () => pindah(1) : undefined }
          }
          const ks = sekategori(block, lembar, daftarKat, target.key)
          const i = ks.indexOf(target.key)
          if (ks.length < 2) return undefined
          const pindah = (arah: -1 | 1) => {
            const next = geser(block, lembar, daftarKat, target.key, arah)
            if (next) save.mutate(next)
          }
          return { naik: i > 0 ? () => pindah(-1) : undefined, turun: i < ks.length - 1 ? () => pindah(1) : undefined }
        })()}
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
