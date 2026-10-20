import { applyRinci } from '@/lib/arusKasRinci'
import { isGroup, type Block, type Cell, type GroupDef, type Lembar, type Line, type RowDef } from '@/lib/sheetEngine'
import { GRUP_KELUAR, GRUP_MASUK, kategoriDari } from '@/lib/kategoriKeuangan'

const round = (n: number) => Math.round(n * 100) / 100
const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : 0)
const sum = (values: (number | null)[]) => round(values.reduce<number>((a, v) => a + (v ?? 0), 0))

/** Amounts of the rows of one Arus Kas group (cash in / cash out), per category and period. Sub-rows are already summed into their row. */
function perKategori(arus: Block, grup: string, lembar: Lembar, w: number) {
  const out = new Map<string, { n: number; total: number }>()
  let current = ''
  for (const l of arus.lines) {
    if (isGroup(l)) {
      current = l.label
      continue
    }
    if (current !== grup || l.def.emphasis || l.def.induk) continue
    const id = kategoriDari(lembar, l.def.key, grup)
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
  return plain.map((b) => (b.tabel === 'pemasukan' ? pemasukan : b.tabel === 'pengeluaran' ? pengeluaran : b.tabel === 'laba_rugi' ? labaRugi : b))
}
