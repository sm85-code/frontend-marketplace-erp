import type { Overview, Report } from '@/api/financialReports'
import { sumAmounts } from '@/lib/financialAmounts'
import type { Dep, GroupDef, RowDef, SectionDef } from '@/lib/sheetEngine'

const input = (key: keyof Report['input']) => (r: Report) => String(r.input[key] ?? '0')
const result =
  (
    key:
      | 'pemasukan_toko'
      | 'perubahan_piutang'
      | 'pemasukan'
      | 'pengeluaran'
      | 'laba'
      | 'kas_masuk'
      | 'kas_keluar'
      | 'transfer_antar_kas',
  ) =>
  (r: Report) =>
    r.hasil[key]
const end = (key: keyof Report['hasil']['saldo_akhir']) => (r: Report) => r.hasil.saldo_akhir[key]
const before = (key: keyof Report['hasil']['saldo_awal']) => (r: Report) => r.hasil.saldo_awal[key]

const G = (tabel: string, grup: string) => ({ group: `${tabel}|${grup}` })
const cum = (row: string, sign: 1 | -1 = 1): Dep => ({ row, sign, mode: 'cum' })
const prior = (row: string, sign: 1 | -1 = 1): Dep => ({ row, sign, mode: 'cumBefore' })
const C = (tabel: string, grup: string): Dep => ({ custom: `${tabel}|${grup}` })

/** The five report tables as row definitions; see sheetEngine for how `deps` keep totals and the balance sheet in step. */
export function sheetSections(data: Overview): SectionDef[] {
  const shopNames = [...new Set(data.laporan.flatMap((r) => (r.rincian_toko ?? []).map((s) => s.nama)))]
  const anyNonZero = (pick: (r: Report) => string) => data.laporan.some((r) => Number(pick(r)) !== 0)
  const section = (tabel: string, title: string) => {
    const rows: (RowDef | GroupDef)[] = []
    let grup = ''
    return {
      rows,
      title,
      tabel,
      group(label: string) {
        grup = label
        rows.push({ group: true, label, tabel })
      },
      row(
        key: string,
        label: string,
        base: RowDef['base'],
        opt: { kind?: 'input' | 'calc'; total?: RowDef['total']; emphasis?: boolean; deps?: Dep[]; total_row?: boolean; autoHide?: boolean; carry?: string[]; showCarried?: boolean } = {},
      ) {
        rows.push({
          key,
          label,
          tabel,
          grup: opt.total_row ? '__total' : grup,
          kind: opt.kind ?? 'input',
          total: opt.total ?? 'sum',
          emphasis: opt.emphasis,
          autoHide: opt.autoHide,
          carry: opt.carry,
          showCarried: opt.showCarried,
          deps: opt.deps,
          base,
        })
      },
      done(): SectionDef {
        return { title, tabel, rows }
      },
    }
  }
  const sum = (tabel: string, ...groups: string[]): Dep[] => groups.map((g) => G(tabel, g))
  const calcTotal = { kind: 'calc' as const, emphasis: true, total_row: true }

  const a = section('pemasukan', 'A. PEMASUKAN')
  a.group('Penarikan saldo toko')
  if (shopNames.length) {
    for (const nama of shopNames) a.row(`shop:${nama}`, nama, (r) => (r.rincian_toko ? (r.rincian_toko.find((s) => s.nama === nama)?.nominal ?? '0') : '0'))
    if (data.laporan.some((r) => !r.rincian_toko && Number(r.hasil.pemasukan_toko) !== 0))
      a.row('shop:lain', 'Penarikan toko lainnya', (r) => (r.rincian_toko ? '0' : r.hasil.pemasukan_toko))
  } else a.row('shop:semua', 'Penarikan saldo toko', result('pemasukan_toko'))
  a.group('Penjualan dan jasa')
  a.row('produk', 'Penjualan produk kayu', input('pendapatan_produk'))
  a.row('jasa_proses', 'Jasa proses pesanan', input('jasa_proses'))
  a.row('cat_packing', 'Jasa pengecatan & packing', input('jasa_cat_packing'))
  a.row('cat', 'Jasa pengecatan saja', input('jasa_cat'))
  a.group('Penyesuaian piutang')
  a.row('piutang_chg', 'Perubahan piutang (lihat neraca)', result('perubahan_piutang'))
  a.row('jml_pemasukan', 'Jumlah pemasukan', result('pemasukan'), { ...calcTotal, deps: sum('pemasukan', 'Penarikan saldo toko', 'Penjualan dan jasa', 'Penyesuaian piutang') })

  const b = section('pengeluaran', 'B. PENGELUARAN')
  b.group('Harga pokok penjualan')
  b.row('tukang', 'Pembayaran tukang kayu', input('bayar_tukang'))
  b.row('pembelian', 'Pembelian produk & packing', input('pembelian'))
  if (anyNonZero((r) => r.hasil.penyesuaian_stok)) b.row('adj_stok', 'Penyesuaian persediaan', (r) => r.hasil.penyesuaian_stok)
  if (anyNonZero((r) => r.hasil.penyesuaian_utang)) b.row('adj_utang', 'Penyesuaian utang usaha', (r) => r.hasil.penyesuaian_utang)
  b.group('Beban operasional')
  b.row('operasional', 'Operasional', input('operasional'))
  b.row('langganan', 'Langganan rutin', input('langganan'))
  b.row('gaji', 'Gaji karyawan', input('gaji'))
  b.row('iklan', 'Pemakaian iklan', (r) => r.hasil.biaya_iklan)
  b.row('jml_pengeluaran', 'Jumlah pengeluaran', result('pengeluaran'), { ...calcTotal, deps: sum('pengeluaran', 'Harga pokok penjualan', 'Beban operasional') })

  const c = section('laba_rugi', 'C. LABA / RUGI')
  c.group('Ringkasan')
  c.row('c_masuk', 'Pemasukan', result('pemasukan'), { kind: 'calc', deps: [{ row: 'jml_pemasukan' }] })
  c.row('c_keluar', 'Pengeluaran', result('pengeluaran'), { kind: 'calc', deps: [{ row: 'jml_pengeluaran' }] })
  c.row('laba', 'Laba bersih', result('laba'), { kind: 'calc', emphasis: true, deps: [{ row: 'c_masuk' }, { row: 'c_keluar', sign: -1 }] })

  const d = section('arus_kas', 'D. ARUS KAS')
  d.row('awal', 'Saldo awal kas utama', before('kas_utama'), {
    kind: 'calc',
    total: 'first',
    emphasis: true,
    total_row: true,
    carry: ['akhir'],
    showCarried: true,
    deps: [prior('kas_masuk'), prior('kas_keluar', -1), prior('transfer')],
  })
  d.group('Kas masuk')
  d.row('k_toko', 'Saldo toko', result('pemasukan_toko'), { kind: 'calc', deps: [G('pemasukan', 'Penarikan saldo toko')] })
  d.row('k_prod', 'Penjualan produk + proses', (r) => sumAmounts([String(r.input.pendapatan_produk ?? 0), String(r.input.jasa_proses ?? 0)]), { kind: 'calc', deps: [{ row: 'produk' }, { row: 'jasa_proses' }] })
  d.row('k_cat', 'Jasa cat + packing', (r) => sumAmounts([String(r.input.jasa_cat_packing ?? 0), String(r.input.jasa_cat ?? 0)]), { kind: 'calc', deps: [{ row: 'cat_packing' }, { row: 'cat' }] })
  d.row('k_lain', 'Pemasukan lainnya (baris manual)', () => '0', { kind: 'calc', autoHide: true, deps: [C('pemasukan', 'Penjualan dan jasa')] })
  d.row('kas_masuk', 'Jumlah kas masuk', result('kas_masuk'), { ...calcTotal, deps: [G('arus_kas', 'Kas masuk')] })
  d.group('Kas keluar')
  d.row('k_tukang', 'Bayar tukang kayu', input('bayar_tukang'), { kind: 'calc', deps: [{ row: 'tukang' }] })
  d.row('k_pembelian', 'Pembelian produk', input('pembelian'), { kind: 'calc', deps: [{ row: 'pembelian' }] })
  d.row('k_operasional', 'Operasional', input('operasional'), { kind: 'calc', deps: [{ row: 'operasional' }] })
  d.row('k_langganan', 'Langganan rutin', input('langganan'), { kind: 'calc', deps: [{ row: 'langganan' }] })
  // The salary set aside into the salary cash account leaves the main cash, so it is a cash-out. Reports closed before it
  // was listed here kept it under Transfer antar kas; it is shown here for them too (same figure, same closing cash).
  d.row('k_gaji', 'Gaji', (r) => String(r.hasil.kas_keluar_gaji ?? r.input.transfer_kas_gaji ?? '0'))
  d.row('k_topup', 'Top-up iklan', input('topup_iklan'))
  d.row('k_lain_keluar', 'Pengeluaran lainnya (baris manual)', () => '0', {
    kind: 'calc',
    autoHide: true,
    deps: [C('pengeluaran', 'Harga pokok penjualan'), C('pengeluaran', 'Beban operasional')],
  })
  d.row('kas_keluar', 'Jumlah kas keluar', (r) => (r.hasil.kas_keluar_gaji === undefined ? sumAmounts([r.hasil.kas_keluar, r.input.transfer_kas_gaji ?? '0']) : r.hasil.kas_keluar), { ...calcTotal, deps: [G('arus_kas', 'Kas keluar')] })
  d.group('Transfer antar kas')
  d.row('tr_ops', 'Transfer dari kas operasional packing (+)', input('transfer_kas_ops'))
  d.row('tr_packing', 'Transfer ke kas operasional packing (−)', (r) => sumAmounts([`-${r.input.transfer_ke_ops_packing ?? '0'}`]))
  if (anyNonZero((r) => String(r.input.tambahan_modal ?? 0))) d.row('tr_modal', 'Tambahan modal', input('tambahan_modal'))
  d.row('transfer', 'Jumlah transfer antar kas', (r) => (r.hasil.kas_keluar_gaji === undefined ? sumAmounts([r.hasil.transfer_antar_kas, r.input.transfer_kas_gaji ?? '0']) : r.hasil.transfer_antar_kas), { ...calcTotal, deps: [G('arus_kas', 'Transfer antar kas')] })
  d.row('akhir', 'Saldo akhir kas utama', end('kas_utama'), {
    ...calcTotal,
    total: 'last',
    deps: [cum('kas_masuk'), cum('kas_keluar', -1), cum('transfer')],
  })

  const e = section('neraca', 'E. POSISI KEUANGAN / NERACA')
  // Only Kas utama, Kas gaji, Utang gaji and the profit lines are filled in automatically; every other row is typed by hand
  // (a closed period keeps its report's figure, an open one carries the previous period's until it is typed over).
  e.group('Aset')
  e.row('n_kas', 'Kas utama', end('kas_utama'), { total: 'last', deps: [{ row: 'akhir' }] })
  e.row('n_stok', 'Stok produk', end('stok'), { total: 'last' })
  e.row('n_kas_ops', 'Kas operasional packing', end('kas_operasional'), { total: 'last' })
  e.row('n_iklan', 'Saldo iklan prabayar', end('iklan_prabayar'), { total: 'last' })
  e.row('n_piutang', 'Piutang pesanan dalam pengiriman', end('piutang_pengiriman'), { total: 'last' })
  e.row('n_saldo_toko', 'Saldo tertahan toko / Shopee', end('saldo_toko'), { total: 'last' })
  e.row('n_kas_gaji', 'Kas gaji (disisihkan)', end('kas_gaji'), { total: 'last', deps: [cum('k_gaji')] })
  e.row('jml_aset', 'Jumlah aset', (r) => r.hasil.neraca.aset, { ...calcTotal, total: 'last', deps: [G('neraca', 'Aset')] })
  e.group('Kewajiban')
  e.row('n_utang_gaji', 'Utang gaji', end('utang_gaji'), { total: 'last', deps: [cum('gaji')] })
  e.row('n_utang_usaha', 'Utang usaha / operasional berjalan', end('utang_usaha'), { total: 'last' })
  e.row('jml_utang', 'Jumlah kewajiban / utang', (r) => r.hasil.neraca.utang, { ...calcTotal, total: 'last', deps: [G('neraca', 'Kewajiban')] })
  e.group('Ekuitas')
  e.row('n_modal', 'Modal', end('modal'), { total: 'last' })
  e.row('n_laba_lalu', 'Saldo laba/rugi periode lalu', before('saldo_laba'), {
    total: 'first',
    carry: ['n_laba_lalu', 'n_laba_ini'],
    deps: [prior('laba')],
  })
  e.row('n_laba_ini', 'Laba/rugi periode berjalan', result('laba'), { kind: 'calc', deps: [{ row: 'laba' }] })
  e.row('jml_ekuitas', 'Jumlah ekuitas', (r) => r.hasil.neraca.ekuitas, { ...calcTotal, total: 'last', deps: [G('neraca', 'Ekuitas')] })
  e.row('jml_kew_ekuitas', 'Jumlah kewajiban & ekuitas', (r) => sumAmounts([r.hasil.neraca.utang, r.hasil.neraca.ekuitas]), {
    ...calcTotal,
    total: 'last',
    deps: [{ row: 'jml_utang' }, { row: 'jml_ekuitas' }],
  })
  e.row('selisih', 'Cek selisih neraca', (r) => r.hasil.neraca.selisih, {
    ...calcTotal,
    total: 'last',
    deps: [{ row: 'jml_aset' }, { row: 'jml_utang', sign: -1 }, { row: 'jml_ekuitas', sign: -1 }],
  })

  return [a, b, c, d, e].map((s) => s.done())
}
