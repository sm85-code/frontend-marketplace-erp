import { applyRinci } from '@/lib/arusKasRinci'
import { isGroup, type Block, type Cell, type GroupDef, type Lembar, type Line, type RowDef } from '@/lib/sheetEngine'
import { KATEGORI_BAWAAN, KELOMPOK_BAWAAN, type Kelompok as KelompokTabel, type KelompokDaftar, type KategoriTransaksi } from '@/api/kategori'
import { GRUP_KELUAR, GRUP_MASUK, kategoriDari, kategoriRincian } from '@/lib/kategoriKeuangan'

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)
const sum = (values: (number | null)[]) => round(values.reduce<number>((a, v) => a + (v ?? 0), 0))

/**
 * Amounts of one Arus Kas group (cash in / cash out) per category and period. A row without sub-rows files its own figure
 * under its category; a row with sub-rows files each sub-row's figure under that sub-row's category (which follows the
 * row until another is chosen), so one row can feed several components.
 */
function perKategori(arus: Block, grup: string, lembar: Lembar, w: number, daftar: KategoriTransaksi[]) {
  const out = new Map<string, { n: number; total: number }>()
  const punyaRincian = new Set(arus.lines.flatMap((l) => (!isGroup(l) && l.def.induk ? [l.def.induk] : [])))
  let current = ''
  for (const l of arus.lines) {
    if (isGroup(l)) {
      current = l.label
      continue
    }
    if (current !== grup || l.def.emphasis || punyaRincian.has(l.def.key)) continue
    const id = l.def.induk ? kategoriRincian(lembar, l.def.key, l.def.induk, grup, daftar) : kategoriDari(lembar, l.def.key, grup, daftar)
    const prev = out.get(id) ?? { n: 0, total: 0 }
    out.set(id, { n: prev.n + 1, total: prev.total + (l.cells[w].value ?? 0) })
  }
  return out
}

type Komponen = {
  key: string
  label: string
  /** Category id of Arus Kas rows that feed this component; without any such row it is filled by hand. */
  kategori?: string
  /** Row of the old tables whose figure is the manual starting point. */
  lama?: string
  autoHide?: boolean
}
/** `label` is the group's stable identity in the sheet (what rows added to it are filed under); `tampil` is its current name. */
type Kelompok = { label: string; tampil?: string; komponen: Komponen[] }

/** Groups that existed before they had ids keep the title they were filed under in saved sheets; new ones are `kel:<id>`. */
const LABEL_LAMA: Record<string, string> = { pemasukan: 'Pemasukan', hpp: 'Harga pokok penjualan', beban: 'Beban operasional' }
const labelKelompok = (g: KelompokTabel) => LABEL_LAMA[g.id] ?? `kel:${g.id}`

/** Gaji and iklan keep the keys they had, so figures typed under them before categories became editable stay put. */
const LAMA_KEY = new Set(['gaji', 'iklan'])
const komponenDari = (daftar: KategoriTransaksi[], arah: KategoriTransaksi['arah'], kelompokId: string): Komponen[] =>
  daftar
    .filter((k) => k.arah === arah && k.kelompok_id === kelompokId)
    .sort((x, y) => x.urut - y.urut)
    .map((k) => ({ key: LAMA_KEY.has(k.id) ? k.id : `p:${k.id}`, label: k.nama, kategori: k.id, lama: LAMA_KEY.has(k.id) ? k.id : undefined, autoHide: k.auto_sembunyi || !k.aktif }))

const PEMASUKAN = (daftar: KategoriTransaksi[], kelompok: KelompokDaftar): Kelompok[] => [
  ...kelompok.masuk.map((g) => ({ label: labelKelompok(g), tampil: g.nama, komponen: komponenDari(daftar, 'masuk', g.id) })),
  { label: 'Penyesuaian piutang', komponen: [{ key: 'piutang_chg', label: 'Perubahan piutang (lihat neraca)', lama: 'piutang_chg' }] },
]
const PENGELUARAN = (daftar: KategoriTransaksi[], kelompok: KelompokDaftar, adaStok: boolean, adaUtang: boolean): Kelompok[] =>
  kelompok.keluar.map((g) => ({
    label: labelKelompok(g),
    tampil: g.nama,
    komponen: [
      ...komponenDari(daftar, 'keluar', g.id),
      // The inventory and payable adjustments belong with the cost of goods, the first group of expenses.
      ...(g.id === 'hpp' && adaStok ? [{ key: 'adj_stok', label: 'Penyesuaian persediaan', lama: 'adj_stok' }] : []),
      ...(g.id === 'hpp' && adaUtang ? [{ key: 'adj_utang', label: 'Penyesuaian utang usaha', lama: 'adj_utang' }] : []),
    ],
  }))

/**
 * Pemasukan, Pengeluaran and Laba/Rugi in summarized form. Every component takes its figure from the Arus Kas rows
 * filed under its category (each Arus Kas row picks one); a component with no such row is filled by hand (a component
 * of the old tables keeps its figure there), which is where the non-cash side of the accrual basis goes.
 */
export function ringkasDariArusKas(plain: Block[], days: string[], lembar: Lembar, daftar: KategoriTransaksi[] = KATEGORI_BAWAAN, kelompok: KelompokDaftar = KELOMPOK_BAWAAN, tutup?: ReadonlySet<string>): Block[] {
  const kas = plain.find((b) => b.tabel === 'arus_kas')
  if (!kas) return plain
  const arus = applyRinci(kas, days, lembar)
  const lama = (key: string) => plain.flatMap((b) => b.lines).find((l): l is Line => !isGroup(l) && l.def.key === key)
  const hasData = days.map((_, w) => (arus.lines.find((l): l is Line => !isGroup(l) && l.def.key === 'kas_masuk')?.cells[w].value ?? null) !== null)
  const present = (w: number, key: string) => hasData[w] || lembar.sel[`${key}|${days[w]}`] !== undefined

  const total = (cells: Cell[], mode: RowDef['total'] = 'sum') => {
    const v = cells.map((c) => c.value).filter((x): x is number => x !== null)
    return !v.length ? null : mode === 'last' ? v.at(-1)! : mode === 'first' ? v[0] : sum(v)
  }
  const line = (tabel: string, grup: string, key: string, label: string, kind: RowDef['kind'], cells: Cell[], extra: Partial<RowDef> = {}): Line => ({
    def: { key, label, tabel, grup, kind, total: 'sum', base: () => '0', ...extra },
    custom: false,
    hidden: !!extra.autoHide && cells.every((c) => !c.value),
    cells,
    total: total(cells),
  })

  const bangun = (tabel: string, title: string, kelompok: Kelompok[], sumber: { grup: string }, totalKey: string, totalLabel: string): Block => {
    const lines: (Line | GroupDef)[] = []
    const baris: Line[] = []
    const perPeriode = days.map((_, w) => perKategori(arus, sumber.grup, lembar, w, daftar))
    for (const g of kelompok) {
      lines.push({ group: true, label: g.label, tabel, tampil: g.tampil })
      for (const k of g.komponen) {
        const dipakai = perPeriode.some((m) => (m.get(k.kategori ?? '')?.n ?? 0) > 0)
        const cells = days.map((d, w): Cell => {
          if (dipakai) {
            const found = perPeriode[w].get(k.kategori!)
            const old = k.lama ? lama(k.lama)?.cells[w] : undefined
            // A component that also has an old-table figure (gaji): a period saved before it became a cash-out keeps that figure.
            if (old && !found?.total && hasData[w]) return { value: old.value, manual: false }
            return { value: hasData[w] ? round(found?.total ?? 0) : null, manual: false }
          }
          // Filled by hand: the typed figure, else the figure of the old tables, else zero.
          const typed = lembar.sel[`${k.key}|${d}`]
          if (typed !== undefined) return { value: num(typed), manual: true }
          const old = k.lama ? lama(k.lama)?.cells[w] : undefined
          return { value: old ? old.value : present(w, k.key) ? 0 : null, manual: false }
        })
        const l = line(tabel, g.label, k.key, k.label, dipakai ? 'calc' : 'input', cells, { autoHide: k.autoHide })
        lines.push(l)
        baris.push(l)
      }
    }
    const cells = days.map((_, w): Cell => {
      const v = baris.map((l) => l.cells[w].value).filter((x): x is number => x !== null)
      return { value: v.length ? sum(v) : null, manual: false }
    })
    const jumlah = line(tabel, '__total', totalKey, totalLabel, 'calc', cells, { emphasis: true })
    lines.push(jumlah)
    return { title, tabel, lines }
  }

  const pemasukan = bangun('pemasukan', 'A. PEMASUKAN', PEMASUKAN(daftar, kelompok), { grup: GRUP_MASUK }, 'jml_pemasukan', 'Jumlah pemasukan')
  const pengeluaran = bangun('pengeluaran', 'B. PENGELUARAN', PENGELUARAN(daftar, kelompok, !!lama('adj_stok'), !!lama('adj_utang')), { grup: GRUP_KELUAR }, 'jml_pengeluaran', 'Jumlah pengeluaran')
  const tot = (b: Block, key: string) => b.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)!
  const masuk = tot(pemasukan, 'jml_pemasukan')
  const keluar = tot(pengeluaran, 'jml_pengeluaran')
  const cMasuk = line('laba_rugi', 'Ringkasan', 'c_masuk', 'Pemasukan', 'calc', masuk.cells.map((c) => ({ ...c })))
  const cKeluar = line('laba_rugi', 'Ringkasan', 'c_keluar', 'Pengeluaran', 'calc', keluar.cells.map((c) => ({ ...c })))
  const laba = line(
    'laba_rugi',
    'Ringkasan',
    'laba',
    'Laba bersih',
    'calc',
    days.map((_, w): Cell => ({ value: masuk.cells[w].value === null && keluar.cells[w].value === null ? null : round((masuk.cells[w].value ?? 0) - (keluar.cells[w].value ?? 0)), manual: false })),
    { emphasis: true },
  )
  const labaRugi: Block = { title: 'C. LABA / RUGI', tabel: 'laba_rugi', lines: [{ group: true, label: 'Ringkasan', tabel: 'laba_rugi' }, cMasuk, cKeluar, laba] }
  const neraca = (b: Block): Block => {
    const akhir = arus.lines.find((l): l is Line => !isGroup(l) && l.def.key === 'akhir')
    const lines = b.lines.map((l) => ({ ...l })) as (Line | GroupDef)[]
    const at = (key: string) => lines.find((l): l is Line => !isGroup(l) && l.def.key === key)
    const set = (l: Line | undefined, kind: RowDef['kind'], cells: Cell[]) => {
      if (!l) return
      l.def = { ...l.def, kind }
      l.cells = cells
      l.total = total(cells, l.def.total)
    }
    set(at('n_kas'), 'calc', days.map((_, w) => ({ value: akhir?.cells[w].value ?? null, manual: false })))
    set(at('n_laba_ini'), 'calc', laba.cells.map((c) => ({ ...c })))
    // Salary cash and salary owed follow the Gaji row of Arus Kas (typed over or not), the owed one through the Pengeluaran
    // tab's Gaji. A closed period keeps the figure of its report, moved by what was typed over its own; a period still open
    // is the balance before it plus that period's Gaji, so both balances grow by the same single figure.
    const tertutup = (w: number) => !tutup || tutup.has(days[w])
    const ikuti = (row: Line | undefined, own: Line | undefined, shown: Line | undefined) => {
      if (!row || !own || !shown) return
      let diubah = 0
      let saldo: number | null = null
      set(
        row,
        'calc',
        row.cells.map((c, w) => {
          const gaji = shown.cells[w].value ?? 0
          if (tertutup(w)) {
            diubah = round(diubah + gaji - (own.cells[w].value ?? 0))
            saldo = c.value === null ? null : round(c.value + diubah)
          } else saldo = c.value === null ? null : round((saldo ?? 0) + gaji)
          return { value: saldo, manual: false }
        }),
      )
    }
    const byKey = (blok: Block, key: string) => blok.lines.find((l): l is Line => !isGroup(l) && l.def.key === key)
    ikuti(at('n_kas_gaji'), lama('k_gaji'), byKey(arus, 'k_gaji'))
    ikuti(at('n_utang_gaji'), lama('gaji'), byKey(pengeluaran, 'gaji'))
    // Last period's profit carries into the next one's "earlier profit" unless it is typed over.
    const lalu = at('n_laba_lalu')
    const ini = at('n_laba_ini')
    if (lalu && ini) {
      const cells: Cell[] = []
      days.forEach((d, w) => {
        const typed = lembar.sel[`${lalu.def.key}|${d}`]
        const before = cells[w - 1]?.value
        const prevIni = ini.cells[w - 1]?.value
        const own = lalu.cells[w]
        cells.push(typed !== undefined ? { value: num(typed), manual: true } : w > 0 && before != null && prevIni != null && own.value !== null ? { value: round(before + prevIni), manual: false } : own)
      })
      set(lalu, 'input', cells)
    }
    // Section totals follow the rows again, and the balance check closes the books.
    const per = new Map<string, Line[]>()
    let grup = ''
    for (const l of lines) {
      if (isGroup(l)) grup = l.label
      else if (!l.def.emphasis) per.set(grup, [...(per.get(grup) ?? []), l])
    }
    const jumlah = (rows: Line[]): Cell[] =>
      days.map((_, w) => {
        const v = rows.map((l) => l.cells[w].value).filter((x): x is number => x !== null)
        return { value: v.length ? sum(v) : null, manual: false }
      })
    const aset = jumlah(per.get('Aset') ?? [])
    const utang = jumlah(per.get('Kewajiban') ?? [])
    const ekuitas = jumlah(per.get('Ekuitas') ?? [])
    const plus = (a: Cell[], b2: Cell[], sign = 1): Cell[] => a.map((c, w) => ({ value: c.value === null && b2[w].value === null ? null : round((c.value ?? 0) + sign * (b2[w].value ?? 0)), manual: false }))
    set(at('jml_aset'), 'calc', aset)
    set(at('jml_utang'), 'calc', utang)
    set(at('jml_ekuitas'), 'calc', ekuitas)
    set(at('jml_kew_ekuitas'), 'calc', plus(utang, ekuitas))
    set(at('selisih'), 'calc', plus(plus(aset, utang, -1), ekuitas, -1))
    return { ...b, lines }
  }
  return plain.map((b) =>
    b.tabel === 'pemasukan' ? pemasukan : b.tabel === 'pengeluaran' ? pengeluaran : b.tabel === 'laba_rugi' ? labaRugi : b.tabel === 'neraca' ? neraca(b) : b.tabel === 'arus_kas' ? arus : b,
  )
}
