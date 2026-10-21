import { applyRinci } from '@/lib/arusKasRinci'
import { isGroup, type Block, type Cell, type GroupDef, type Lembar, type Line, type RowDef } from '@/lib/sheetEngine'
import { GRUP_KELUAR, GRUP_MASUK, kategoriDari, kategoriRincian } from '@/lib/kategoriKeuangan'

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)
const sum = (values: (number | null)[]) => round(values.reduce<number>((a, v) => a + (v ?? 0), 0))

/**
 * Amounts of one Arus Kas group (cash in / cash out) per category and period. A row without sub-rows files its own figure
 * under its category; a row with sub-rows files each sub-row's figure under that sub-row's category (which follows the
 * row until another is chosen), so one row can feed several components.
 */
function perKategori(arus: Block, grup: string, lembar: Lembar, w: number) {
  const out = new Map<string, { n: number; total: number }>()
  const punyaRincian = new Set(arus.lines.flatMap((l) => (!isGroup(l) && l.def.induk ? [l.def.induk] : [])))
  let current = ''
  for (const l of arus.lines) {
    if (isGroup(l)) {
      current = l.label
      continue
    }
    if (current !== grup || l.def.emphasis || punyaRincian.has(l.def.key)) continue
    const id = l.def.induk ? kategoriRincian(lembar, l.def.key, l.def.induk, grup) : kategoriDari(lembar, l.def.key, grup)
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
type Kelompok = { label: string; komponen: Komponen[] }

const PEMASUKAN: Kelompok[] = [
  {
    label: 'Pemasukan',
    komponen: [
      { key: 'p:saldo_toko', label: 'Saldo toko', kategori: 'saldo_toko' },
      { key: 'p:produk', label: 'Penjualan produk', kategori: 'produk' },
      { key: 'p:cat', label: 'Jasa cat', kategori: 'cat' },
      { key: 'p:packing', label: 'Jasa packing', kategori: 'packing' },
      { key: 'p:proses', label: 'Jasa proses pesanan', kategori: 'proses' },
      // Combined figures some rows are kept in; shown only once a row is filed under them.
      { key: 'p:produk_proses', label: 'Penjualan produk + proses', kategori: 'produk_proses', autoHide: true },
      { key: 'p:cat_packing', label: 'Jasa cat + packing', kategori: 'cat_packing', autoHide: true },
      { key: 'p:lain_masuk', label: 'Pemasukan lainnya', kategori: 'lain_masuk', autoHide: true },
    ],
  },
  { label: 'Penyesuaian piutang', komponen: [{ key: 'piutang_chg', label: 'Perubahan piutang (lihat neraca)', lama: 'piutang_chg' }] },
]
const PENGELUARAN = (adaStok: boolean, adaUtang: boolean): Kelompok[] => [
  {
    label: 'Harga pokok penjualan',
    komponen: [
      { key: 'p:tukang', label: 'Tukang', kategori: 'tukang' },
      { key: 'p:non_kayu', label: 'Produk non kayu', kategori: 'non_kayu' },
      { key: 'p:bahan_cat', label: 'Bahan dan perlengkapan cat', kategori: 'bahan_cat' },
      { key: 'p:perl_packing', label: 'Perlengkapan packing', kategori: 'perl_packing' },
      { key: 'p:ongkir', label: 'Ongkir manual', kategori: 'ongkir' },
      ...(adaStok ? [{ key: 'adj_stok', label: 'Penyesuaian persediaan', lama: 'adj_stok' }] : []),
      ...(adaUtang ? [{ key: 'adj_utang', label: 'Penyesuaian utang usaha', lama: 'adj_utang' }] : []),
    ],
  },
  {
    label: 'Beban operasional',
    komponen: [
      { key: 'gaji', label: 'Gaji', kategori: 'gaji', lama: 'gaji' },
      { key: 'iklan', label: 'Iklan', kategori: 'iklan', lama: 'iklan' },
      { key: 'p:langganan', label: 'Langganan', kategori: 'langganan' },
      { key: 'p:lain_keluar', label: 'Operasional lainnya', kategori: 'lain_keluar', autoHide: true },
    ],
  },
]

/**
 * Pemasukan, Pengeluaran and Laba/Rugi in summarized form. Every component takes its figure from the Arus Kas rows
 * filed under its category (each Arus Kas row picks one); a component with no such row is filled by hand (a component
 * of the old tables keeps its figure there), which is where the non-cash side of the accrual basis goes.
 */
export function ringkasDariArusKas(plain: Block[], days: string[], lembar: Lembar): Block[] {
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
    const perPeriode = days.map((_, w) => perKategori(arus, sumber.grup, lembar, w))
    for (const g of kelompok) {
      lines.push({ group: true, label: g.label, tabel })
      for (const k of g.komponen) {
        const dipakai = perPeriode.some((m) => (m.get(k.kategori ?? '')?.n ?? 0) > 0)
        const cells = days.map((d, w): Cell => {
          if (dipakai) {
            const found = perPeriode[w].get(k.kategori!)
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

  const pemasukan = bangun('pemasukan', 'A. PEMASUKAN', PEMASUKAN, { grup: GRUP_MASUK }, 'jml_pemasukan', 'Jumlah pemasukan')
  const pengeluaran = bangun('pengeluaran', 'B. PENGELUARAN', PENGELUARAN(!!lama('adj_stok'), !!lama('adj_utang')), { grup: GRUP_KELUAR }, 'jml_pengeluaran', 'Jumlah pengeluaran')
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
