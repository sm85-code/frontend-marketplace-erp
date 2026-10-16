import { useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Download } from 'lucide-react'
import { SelectField } from './processingShared'
import type { Overview, Report } from '@/api/financialReports'
import { sumAmounts } from '@/lib/financialAmounts'
export { sumAmounts } from '@/lib/financialAmounts'
import FinancialShopeeIncome from './FinancialShopeeIncome'
import FinancialSellerBalance from './FinancialSellerBalance'
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
    : [{ label: 'Pemasukan Toko', value: result('pemasukan_toko') }]
  if (shopNames.length && data.laporan.some((r) => !r.rincian_toko && Number(r.hasil.pemasukan_toko) !== 0)) {
    shopRows.push({
      label: 'Pemasukan toko lainnya',
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
        ...shopRows,
        row('Penjualan Produk Kayu', input('pendapatan_produk')),
        row('Jasa Proses Pesanan', input('jasa_proses')),
        row('Jasa Pengecatan & Packing', input('jasa_cat_packing')),
        row('Jasa Pengecatan Saja', input('jasa_cat')),
        row('Perubahan Piutang (lihat neraca)', result('perubahan_piutang')),
        row('JUMLAH PEMASUKAN', result('pemasukan'), 'sum', true),
      ],
    },
    {
      title: 'B. PENGELUARAN',
      rows: [
        row('HPP: Pembayaran Tukang Kayu', input('bayar_tukang')),
        row('HPP: Pembelian Produk & Packing', input('pembelian')),
        ...(data.laporan.some((r) => Number(r.hasil.penyesuaian_stok) !== 0)
          ? [row('Penyesuaian Persediaan', (r) => r.hasil.penyesuaian_stok)]
          : []),
        ...(data.laporan.some((r) => Number(r.hasil.penyesuaian_utang) !== 0)
          ? [row('Penyesuaian Utang Usaha', (r) => r.hasil.penyesuaian_utang)]
          : []),
        row('OPS: Operasional', input('operasional')),
        row('OPS: Biaya Langganan Rutin', input('langganan')),
        row('OPS: Gaji Karyawan', input('gaji')),
        row('OPS: Iklan', (r) => r.hasil.biaya_iklan),
        row('JUMLAH PENGELUARAN', result('pengeluaran'), 'sum', true),
      ],
    },
    {
      title: 'C. LABA / RUGI',
      rows: [
        row('PEMASUKAN', result('pemasukan')),
        row('PENGELUARAN', result('pengeluaran')),
        row('LABA BERSIH', result('laba'), 'sum', true),
      ],
    },
    {
      title: 'D. ARUS KAS',
      rows: [
        row('SALDO AWAL KAS UTAMA', before('kas_utama'), 'first', true),
        group('Kas masuk'),
        row('Saldo toko', result('pemasukan_toko')),
        row('Penjualan produk + proses', (r) =>
          sumAmounts([String(r.input.pendapatan_produk ?? 0), String(r.input.jasa_proses ?? 0)]),
        ),
        row('Jasa cat + packing', (r) =>
          sumAmounts([String(r.input.jasa_cat_packing ?? 0), String(r.input.jasa_cat ?? 0)]),
        ),
        row('JUMLAH KAS MASUK', result('kas_masuk'), 'sum', true),
        group('Kas keluar'),
        row('Bayar tukang kayu', input('bayar_tukang')),
        row('Pembelian produk', input('pembelian')),
        row('Operasional', input('operasional')),
        row('Langganan rutin', input('langganan')),
        row('Top-up iklan', input('topup_iklan')),
        row('JUMLAH KAS KELUAR', result('kas_keluar'), 'sum', true),
        group('Transfer antar kas'),
        row('Transfer dari Kas Operasional (+)', input('transfer_kas_ops')),
        row('Penyisihan ke Kas Gaji (−)', (r) => sumAmounts([`-${r.input.transfer_kas_gaji ?? '0'}`])),
        ...(data.laporan.some((r) => Number(r.input.tambahan_modal) !== 0)
          ? [row('Tambahan Modal', input('tambahan_modal'))]
          : []),
        row('JUMLAH TRANSFER ANTAR KAS', result('transfer_antar_kas'), 'sum', true),
        row('SALDO AKHIR KAS UTAMA', end('kas_utama'), 'last', true),
      ],
    },
    {
      title: 'E. POSISI KEUANGAN / NERACA',
      rows: [
        row('Aset: Kas Utama', end('kas_utama'), 'last'),
        row('Aset: Stok Produk', end('stok'), 'last'),
        row('Aset: Kas Operasional', end('kas_operasional'), 'last'),
        row('Aset: Saldo Iklan Prabayar', end('iklan_prabayar'), 'last'),
        row('Aset: Piutang Pesanan dalam Pengiriman', end('piutang_pengiriman'), 'last'),
        row('Aset: Saldo Tertahan Toko / Shopee', end('saldo_toko'), 'last'),
        row('Aset: Kas Gaji (disisihkan)', end('kas_gaji'), 'last'),
        row('JUMLAH ASET', (r) => r.hasil.neraca.aset, 'last', true),
        row('Utang Gaji', end('utang_gaji'), 'last'),
        row('Utang Usaha / Operasional Berjalan', end('utang_usaha'), 'last'),
        row('JUMLAH KEWAJIBAN / UTANG', debt, 'last', true),
        row('Modal', end('modal'), 'last'),
        row('Saldo Laba/Rugi Periode Lalu', before('saldo_laba'), 'first'),
        row('Laba/Rugi Periode Berjalan', result('laba'), 'sum'),
        row('JUMLAH EKUITAS', equity, 'last', true),
        row('JUMLAH KEWAJIBAN & EKUITAS', (r) => sumAmounts([debt(r), equity(r)]), 'last', true),
        row('CEK SELISIH NERACA', (r) => r.hasil.neraca.selisih, 'last', true),
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
  const [mobilePeriod, setMobilePeriod] = useState('total')
  const selectedPeriod = days.includes(mobilePeriod) ? mobilePeriod : 'total'
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
        <p className="text-xs text-muted-foreground">
          {records.length
            ? `${records.length} periode tersimpan · sampai ${dateLabel(latest!.tanggal)}`
            : 'Belum ada laporan tersimpan'}
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <div className="hidden max-w-full overflow-x-auto rounded-xl border md:block">
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
                    <span className="block">
                      {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]} · {months[Number(month.slice(5)) - 1]}
                    </span>
                    <span className="block text-xs font-normal">{dateLabel(d)}</span>
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
        <div className="space-y-3 md:hidden">
          <SelectField
            aria-label={`Periode ${section.title.slice(3)}`}
            value={selectedPeriod}
            onChange={(e) => setMobilePeriod(e.target.value)}
          >
            <option value="total">
              {section.title.startsWith('E.') ? 'Posisi terakhir' : 'Rekap seluruh periode'}
            </option>
            {days.map((d, i) => (
              <option key={d} value={d}>
                Minggu {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]} · {dateLabel(d)}
              </option>
            ))}
          </SelectField>
          <dl className="overflow-hidden rounded-xl border">
            {section.rows.map((row) => {
              if (row.group) return (
                <div key={row.label} className="financial-row-group border-b px-3 py-2">
                  <dt>{row.emphasis ? sentenceCase(row.label) : row.label}</dt>
                  <dd className="sr-only">Golongan transaksi</dd>
                </div>
              )
              const report = records.find((r) => r.tanggal === selectedPeriod)
              const amount =
                selectedPeriod === 'total' ? columnTotal(row, records) : report ? row.value(report) : null
              return (
                <div
                  key={row.label}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b px-3 py-3 last:border-b-0 ${row.emphasis ? 'bg-primary/5 font-semibold' : ''}`}
                >
                  <dt className="text-xs leading-relaxed">{row.emphasis ? sentenceCase(row.label) : row.label}</dt>
                  <dd className="whitespace-nowrap text-xs tabular-nums">
                    {amount === null ? '—' : fmtRp(amount)}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </CardContent>
    </Card>
  )
  return (
    <section aria-label="Tabel laporan keuangan" className="min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaries.map((s) => (
          <div key={s.label} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="break-words text-base font-semibold tabular-nums sm:text-xl">
              {s.value === null ? '—' : fmtRp(s.value)}
            </p>
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{s.note}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Rekap {months[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest ? `Posisi laporan ${dateLabel(latest.tanggal)}` : 'Belum ada laporan tersimpan'}
          </p>
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
              <Tabs defaultValue="utama" className="min-w-0">
                <div className="min-w-0 overflow-x-auto py-1">
                  <TabsList className="h-auto w-max gap-1 bg-transparent p-0" aria-label="Rincian pemasukan">
                    <TabsTrigger
                      className="h-10 rounded-lg border border-transparent px-3 text-xs data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-none"
                      value="utama"
                    >
                      Rekap pemasukan
                    </TabsTrigger>
                    <TabsTrigger
                      className="h-10 rounded-lg border border-transparent px-3 text-xs data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-none"
                      value="estimasi"
                    >
                      Estimasi Shopee
                    </TabsTrigger>
                    <TabsTrigger
                      className="h-10 rounded-lg border border-transparent px-3 text-xs data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-none"
                      value="cair"
                    >
                      Dana cair
                    </TabsTrigger>
                    <TabsTrigger
                      className="h-10 rounded-lg border border-transparent px-3 text-xs data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-none"
                      value="saldo"
                    >
                      Saldo penjual
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="utama">{renderTable(section)}</TabsContent>
                <TabsContent value="estimasi">
                  <FinancialShopeeIncome until={latest?.tanggal} month={month} columns={days.length} />
                </TabsContent>
                <TabsContent value="cair">
                  <FinancialShopeeIncome
                    until={latest?.tanggal}
                    month={month}
                    columns={days.length}
                    released
                  />
                </TabsContent>
                <TabsContent value="saldo">
                  <FinancialSellerBalance month={month} columns={days.length} />
                </TabsContent>
              </Tabs>
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
