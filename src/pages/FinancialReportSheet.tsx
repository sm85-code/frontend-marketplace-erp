import type { ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Download } from 'lucide-react'
import type { Overview, Report } from '@/api/financialReports'
import { sumAmounts } from '@/lib/financialAmounts'
export { sumAmounts } from '@/lib/financialAmounts'
import FinancialShopeeIncome from './FinancialShopeeIncome'
import FinancialSellerBalance from './FinancialSellerBalance'
import FinancialShippingReceivables from './FinancialShippingReceivables'
import FinancialPendingReconciliation from './FinancialPendingReconciliation'
import { fmtRp } from '@/api/client'
import { exportCsv } from '@/lib/exportData'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type SheetRow = {
  label: string
  value: (r: Report) => string
  total?: 'sum' | 'first' | 'last'
  emphasis?: boolean
  group?: boolean
}
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
const sentenceCase = (label: string) =>
  label.toLocaleLowerCase('id-ID').replace(/^./, (letter) => letter.toLocaleUpperCase('id-ID'))
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

export function sheetSections(data: Overview): { title: string; rows: SheetRow[] }[] {
  const shopNames = [...new Set(data.laporan.flatMap((r) => (r.rincian_toko ?? []).map((s) => s.nama)))]
  const shopRows: SheetRow[] = shopNames.length
    ? shopNames.map((label) => ({
        label,
        value: (r) => {
          if (r.rincian_toko) return r.rincian_toko.find((s) => s.nama === label)?.nominal ?? '0'
          return '0'
        },
      }))
    : [{ label: 'Penarikan saldo toko', value: result('pemasukan_toko') }]
  if (shopNames.length && data.laporan.some((r) => !r.rincian_toko && Number(r.hasil.pemasukan_toko) !== 0)) {
    shopRows.push({
      label: 'Penarikan toko lainnya',
      value: (r) => (r.rincian_toko ? '0' : r.hasil.pemasukan_toko),
    })
  }
  const row = (
    label: string,
    value: SheetRow['value'],
    total: SheetRow['total'] = 'sum',
    emphasis = false,
  ): SheetRow => ({ label, value, total, emphasis })
  const group = (label: string): SheetRow => ({ label, value: () => '0', group: true })
  const debt = (r: Report) => r.hasil.neraca.utang
  const equity = (r: Report) => r.hasil.neraca.ekuitas
  return [
    {
      title: 'A. PEMASUKAN',
      rows: [
        group('Penarikan saldo toko'),
        ...shopRows,
        group('Penjualan dan jasa'),
        row('Penjualan produk kayu', input('pendapatan_produk')),
        row('Jasa proses pesanan', input('jasa_proses')),
        row('Jasa pengecatan & packing', input('jasa_cat_packing')),
        row('Jasa pengecatan saja', input('jasa_cat')),
        group('Penyesuaian piutang'),
        row('Perubahan piutang (lihat neraca)', result('perubahan_piutang')),
        row('Jumlah pemasukan', result('pemasukan'), 'sum', true),
      ],
    },
    {
      title: 'B. PENGELUARAN',
      rows: [
        group('Harga pokok penjualan'),
        row('Pembayaran tukang kayu', input('bayar_tukang')),
        row('Pembelian produk & packing', input('pembelian')),
        ...(data.laporan.some((r) => Number(r.hasil.penyesuaian_stok) !== 0)
          ? [row('Penyesuaian persediaan', (r) => r.hasil.penyesuaian_stok)]
          : []),
        ...(data.laporan.some((r) => Number(r.hasil.penyesuaian_utang) !== 0)
          ? [row('Penyesuaian utang usaha', (r) => r.hasil.penyesuaian_utang)]
          : []),
        group('Beban operasional'),
        row('Operasional', input('operasional')),
        row('Langganan rutin', input('langganan')),
        row('Gaji karyawan', input('gaji')),
        row('Pemakaian iklan', (r) => r.hasil.biaya_iklan),
        row('Jumlah pengeluaran', result('pengeluaran'), 'sum', true),
      ],
    },
    {
      title: 'C. LABA / RUGI',
      rows: [
        row('Pemasukan', result('pemasukan')),
        row('Pengeluaran', result('pengeluaran')),
        row('Laba bersih', result('laba'), 'sum', true),
      ],
    },
    {
      title: 'D. ARUS KAS',
      rows: [
        row('Saldo awal kas utama', before('kas_utama'), 'first', true),
        group('Kas masuk'),
        row('Saldo toko', result('pemasukan_toko')),
        row('Penjualan produk + proses', (r) =>
          sumAmounts([String(r.input.pendapatan_produk ?? 0), String(r.input.jasa_proses ?? 0)]),
        ),
        row('Jasa cat + packing', (r) =>
          sumAmounts([String(r.input.jasa_cat_packing ?? 0), String(r.input.jasa_cat ?? 0)]),
        ),
        row('Jumlah kas masuk', result('kas_masuk'), 'sum', true),
        group('Kas keluar'),
        row('Bayar tukang kayu', input('bayar_tukang')),
        row('Pembelian produk', input('pembelian')),
        row('Operasional', input('operasional')),
        row('Langganan rutin', input('langganan')),
        row('Top-up iklan', input('topup_iklan')),
        row('Jumlah kas keluar', result('kas_keluar'), 'sum', true),
        group('Transfer antar kas'),
        row('Transfer dari kas operasional (+)', input('transfer_kas_ops')),
        row('Penyisihan ke kas gaji (−)', (r) => sumAmounts([`-${r.input.transfer_kas_gaji ?? '0'}`])),
        ...(data.laporan.some((r) => Number(r.input.tambahan_modal) !== 0)
          ? [row('Tambahan modal', input('tambahan_modal'))]
          : []),
        row('Jumlah transfer antar kas', result('transfer_antar_kas'), 'sum', true),
        row('Saldo akhir kas utama', end('kas_utama'), 'last', true),
      ],
    },
    {
      title: 'E. POSISI KEUANGAN / NERACA',
      rows: [
        group('Aset'),
        row('Kas utama', end('kas_utama'), 'last'),
        row('Stok produk', end('stok'), 'last'),
        row('Kas operasional', end('kas_operasional'), 'last'),
        row('Saldo iklan prabayar', end('iklan_prabayar'), 'last'),
        row('Piutang pesanan dalam pengiriman', end('piutang_pengiriman'), 'last'),
        row('Saldo tertahan toko / Shopee', end('saldo_toko'), 'last'),
        row('Kas gaji (disisihkan)', end('kas_gaji'), 'last'),
        row('Jumlah aset', (r) => r.hasil.neraca.aset, 'last', true),
        group('Kewajiban'),
        row('Utang gaji', end('utang_gaji'), 'last'),
        row('Utang usaha / operasional berjalan', end('utang_usaha'), 'last'),
        row('Jumlah kewajiban / utang', debt, 'last', true),
        group('Ekuitas'),
        row('Modal', end('modal'), 'last'),
        row('Saldo laba/rugi periode lalu', before('saldo_laba'), 'first'),
        row('Laba/rugi periode berjalan', result('laba'), 'sum'),
        row('Jumlah ekuitas', equity, 'last', true),
        row('Jumlah kewajiban & ekuitas', (r) => sumAmounts([debt(r), equity(r)]), 'last', true),
        row('Cek selisih neraca', (r) => r.hasil.neraca.selisih, 'last', true),
      ],
    },
  ]
}

function columnTotal(row: SheetRow, records: Report[]) {
  if (!records.length) return null
  if (row.total === 'first') return row.value(records[0])
  if (row.total === 'last') return row.value(records.at(-1)!)
  return sumAmounts(records.map(row.value))
}

export default function FinancialReportSheet({
  data,
  month,
  comparison,
}: {
  data: Overview
  month: string
  comparison?: ReactNode
}) {
  const records = [...data.laporan].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const days = records.map((r) => r.tanggal)
  // Continue from the last actual report, keeping imported historical dates intact.
  if (data.berikutnya?.startsWith(month)) {
    let next = data.berikutnya
    for (let i = 0; i < 6 && next.startsWith(month); i++) {
      if (!days.includes(next)) days.push(next)
      const d = new Date(`${next}T12:00:00Z`)
      const untilSunday = (7 - d.getUTCDay()) % 7 || 7
      d.setUTCDate(d.getUTCDate() + untilSunday)
      const sunday = d.toISOString().slice(0, 10)
      next = next < data.akhir_bulan && sunday > data.akhir_bulan ? data.akhir_bulan : sunday
    }
  }
  if (!days.length) for (const w of data.mingguan) if (w.tanggal.startsWith(month)) days.push(w.tanggal)
  const sections = sheetSections(data)
  const title = `LAPORAN KEUANGAN · ${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`
  const exportReport = () =>
    exportCsv(`laporan-${month}.csv`, [
      [title],
      ['Uraian', ...days.map(dateLabel), 'JUMLAH / POSISI TERAKHIR'],
      ...sections.flatMap((s) => [
        [s.title],
        ...s.rows.map((row) => row.group ? [row.label] : [
          row.label,
          ...days.map((d) => {
            const r = records.find((r) => r.tanggal === d)
            return r ? row.value(r) : null
          }),
          columnTotal(row, records),
        ]),
      ]),
    ])
  const latest = records.at(-1)
  const summaries = [
    {
      label: 'Pemasukan',
      value: records.length ? sumAmounts(records.map((r) => r.hasil.pemasukan)) : null,
      icon: ArrowDownLeft,
      note: 'Akumulasi periode terisi',
    },
    {
      label: 'Pengeluaran',
      value: records.length ? sumAmounts(records.map((r) => r.hasil.pengeluaran)) : null,
      icon: ArrowUpRight,
      note: 'Akumulasi periode terisi',
    },
    {
      label: 'Laba / Rugi',
      value: records.length ? sumAmounts(records.map((r) => r.hasil.laba)) : null,
      icon: TrendingUp,
      note: 'Akumulasi periode terisi',
    },
    {
      label: 'Kas utama',
      value: latest?.hasil.saldo_akhir.kas_utama ?? data.saldo_awal?.saldo.kas_utama ?? null,
      icon: Wallet,
      note: 'Posisi terakhir',
    },
  ]
  const renderTable = (section: ReturnType<typeof sheetSections>[number]) => (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{sentenceCase(section.title.slice(3))}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <div className="max-w-full overflow-x-auto rounded-lg border">
          <Table
            className="table-fixed"
            style={{ minWidth: 220 + (days.length + 1) * 142 }}
            aria-label={section.title.slice(3)}
          >
            <colgroup>
              <col style={{ width: 220 }} />
              {days.map((d) => (
                <col key={d} style={{ width: 142 }} />
              ))}
              <col style={{ width: 142 }} />
            </colgroup>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-muted">Uraian</TableHead>
                {days.map((d, i) => (
                  <TableHead key={d} className="text-center">
                    <span className="block">Periode</span>
                    <span className="block text-xs font-normal">{weekRange(month, i)}</span>
                  </TableHead>
                ))}
                <TableHead className="text-right">
                  {section.title.startsWith('E.') ? 'Posisi terakhir' : 'Jumlah'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.rows.map((row) => row.group ? (
                <TableRow key={row.label} className="financial-row-group">
                  <TableHead colSpan={days.length + 2} scope="rowgroup">{row.label}</TableHead>
                </TableRow>
              ) : (
                <TableRow key={row.label} className={row.emphasis ? 'bg-muted/50 font-semibold' : undefined}>
                  <TableCell
                    className={`sticky left-0 z-10 ${row.emphasis ? 'bg-muted font-semibold' : 'bg-card'}`}
                  >
                    {row.emphasis ? sentenceCase(row.label) : row.label}
                  </TableCell>
                  {days.map((d) => {
                    const r = records.find((r) => r.tanggal === d)
                    return (
                      <TableCell key={d} className="text-right whitespace-nowrap tabular-nums">
                        {r ? fmtRp(row.value(r)) : '—'}
                      </TableCell>
                    )
                  })}
                  <TableCell className="bg-muted/40 text-right whitespace-nowrap tabular-nums">
                    {fmtRp(columnTotal(row, records))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
  return (
    <section aria-label="Tabel laporan keuangan" className="min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaries.map((s) => (
          <Card key={s.label} className="min-w-0">
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-inset)' }}>
                <s.icon className="size-4.5" style={{ color: 'var(--primary-dark, var(--primary))' }} />
              </div>
              <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              <p className="font-heading mt-1 text-lg font-bold tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
                {s.value === null ? '—' : fmtRp(s.value)}
              </p>
              <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{s.note}</p>
            </CardContent>
          </Card>
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
            {comparison && <TabsTrigger value="comparison">Pembanding ERP</TabsTrigger>}
          </TabsList>
        </div>
        {sections.map((section, i) => (
          <TabsContent key={section.title} value={String(i)} className="min-w-0">
            {i === 0 ? (
              <div className="min-w-0 space-y-5">
                {renderTable(section)}
                <FinancialShippingReceivables until={latest?.tanggal} month={month} columns={days.length} />
                <FinancialPendingReconciliation month={month} />
                <FinancialShopeeIncome
                  until={latest?.tanggal}
                  month={month}
                  columns={days.length}
                  released
                />
                <FinancialSellerBalance month={month} columns={days.length} />
              </div>
            ) : (
              renderTable(section)
            )}
          </TabsContent>
        ))}
        {comparison && (
          <TabsContent value="comparison" className="min-w-0">
            {comparison}
          </TabsContent>
        )}
      </Tabs>
    </section>
  )
}
