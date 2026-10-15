import type { ReactNode } from 'react'
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

export type SheetRow = { label: string; value: (r: Report) => string; total?: 'sum' | 'first' | 'last'; emphasis?: boolean }
const input = (key: keyof Report['input']) => (r: Report) => String(r.input[key] ?? '0')
const result = (key: 'pemasukan_toko' | 'perubahan_piutang' | 'pemasukan' | 'pengeluaran' | 'laba' | 'kas_masuk' | 'kas_keluar' | 'transfer_antar_kas') => (r: Report) => r.hasil[key]
const end = (key: keyof Report['hasil']['saldo_akhir']) => (r: Report) => r.hasil.saldo_akhir[key]
const before = (key: keyof Report['hasil']['saldo_awal']) => (r: Report) => r.hasil.saldo_awal[key]

const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const dateLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' })

export function sheetSections(data: Overview): { title: string; rows: SheetRow[] }[] {
  const shopNames = [...new Set(data.laporan.flatMap(r => (r.rincian_toko ?? []).map(s => s.nama)))]
  const shopRows: SheetRow[] = shopNames.length ? shopNames.map(label => ({ label, value:r => {
    if (r.rincian_toko) return r.rincian_toko.find(s => s.nama === label)?.nominal ?? '0'
    return '0'
  } })) : [{ label:'Pemasukan Toko', value:result('pemasukan_toko') }]
  if (shopNames.length && data.laporan.some(r => !r.rincian_toko && Number(r.hasil.pemasukan_toko) !== 0)) {
    shopRows.push({ label:'Pemasukan toko lainnya', value:r => r.rincian_toko ? '0' : r.hasil.pemasukan_toko })
  }
  const row = (label: string, value: SheetRow['value'], total: SheetRow['total'] = 'sum', emphasis = false): SheetRow => ({ label, value, total, emphasis })
  const debt = (r: Report) => r.hasil.neraca.utang
  const equity = (r: Report) => r.hasil.neraca.ekuitas
  return [
    {title:'A. PEMASUKAN',rows:[...shopRows,
      row('Penjualan Produk Kayu',input('pendapatan_produk')), row('Jasa Proses Pesanan',input('jasa_proses')),
      row('Jasa Pengecatan & Packing',input('jasa_cat_packing')),row('Jasa Pengecatan Saja',input('jasa_cat')),
      row('Perubahan Piutang (lihat neraca)',result('perubahan_piutang')),row('JUMLAH PEMASUKAN',result('pemasukan'),'sum',true)]},
    {title:'B. PENGELUARAN',rows:[row('HPP: Pembayaran Tukang Kayu',input('bayar_tukang')),
      row('HPP: Pembelian Produk & Packing',input('pembelian')),
      ...(data.laporan.some(r=>Number(r.hasil.penyesuaian_stok)!==0) ? [row('Penyesuaian Persediaan',r=>r.hasil.penyesuaian_stok)] : []),
      ...(data.laporan.some(r=>Number(r.hasil.penyesuaian_utang)!==0) ? [row('Penyesuaian Utang Usaha',r=>r.hasil.penyesuaian_utang)] : []),
      row('OPS: Operasional',input('operasional')),row('OPS: Biaya Langganan Rutin',input('langganan')),
      row('OPS: Gaji Karyawan',input('gaji')),row('OPS: Iklan',r=>r.hasil.biaya_iklan),row('JUMLAH PENGELUARAN',result('pengeluaran'),'sum',true)]},
    {title:'C. LABA / RUGI',rows:[row('PEMASUKAN',result('pemasukan')),row('PENGELUARAN',result('pengeluaran')),row('LABA BERSIH',result('laba'),'sum',true)]},
    {title:'D. ARUS KAS',rows:[row('SALDO AWAL KAS UTAMA',before('kas_utama'),'first',true),
      row('Kas Masuk: Saldo Toko',result('pemasukan_toko')),
      row('Kas Masuk: Penjualan Produk + Proses',r=>sumAmounts([String(r.input.pendapatan_produk ?? 0),String(r.input.jasa_proses ?? 0)])),
      row('Kas Masuk: Jasa Cat + Packing',r=>sumAmounts([String(r.input.jasa_cat_packing ?? 0),String(r.input.jasa_cat ?? 0)])),
      row('JUMLAH KAS MASUK',result('kas_masuk'),'sum',true),
      row('Kas Keluar: Bayar Tukang Kayu',input('bayar_tukang')),row('Kas Keluar: Pembelian Produk',input('pembelian')),
      row('Kas Keluar: Operasional',input('operasional')),row('Kas Keluar: Langganan Rutin',input('langganan')),
      row('Kas Keluar: Top-up Iklan',input('topup_iklan')),row('JUMLAH KAS KELUAR',result('kas_keluar'),'sum',true),
      row('Transfer dari Kas Operasional (+)',input('transfer_kas_ops')),
      row('Penyisihan ke Kas Gaji (−)',r=>sumAmounts([`-${r.input.transfer_kas_gaji ?? '0'}`])),
      ...(data.laporan.some(r=>Number(r.input.tambahan_modal)!==0) ? [row('Tambahan Modal',input('tambahan_modal'))] : []),
      row('JUMLAH TRANSFER ANTAR KAS',result('transfer_antar_kas'),'sum',true),
      row('SALDO AKHIR KAS UTAMA',end('kas_utama'),'last',true)]},
    {title:'E. POSISI KEUANGAN / NERACA',rows:[
      row('Aset: Kas Utama',end('kas_utama'),'last'),row('Aset: Stok Produk',end('stok'),'last'),
      row('Aset: Kas Operasional',end('kas_operasional'),'last'),row('Aset: Saldo Iklan Prabayar',end('iklan_prabayar'),'last'),
      row('Aset: Piutang Pesanan dalam Pengiriman',end('piutang_pengiriman'),'last'),row('Aset: Saldo Tertahan Toko / Shopee',end('saldo_toko'),'last'),
      row('Aset: Kas Gaji (disisihkan)',end('kas_gaji'),'last'),row('JUMLAH ASET',r=>r.hasil.neraca.aset,'last',true),
      row('Utang Gaji',end('utang_gaji'),'last'),row('Utang Usaha / Operasional Berjalan',end('utang_usaha'),'last'),row('JUMLAH KEWAJIBAN / UTANG',debt,'last',true),
      row('Modal',end('modal'),'last'),row('Saldo Laba/Rugi Periode Lalu',before('saldo_laba'),'first'),row('Laba/Rugi Periode Berjalan',result('laba'),'sum'),
      row('JUMLAH EKUITAS',equity,'last',true),row('JUMLAH KEWAJIBAN & EKUITAS',r=>sumAmounts([debt(r),equity(r)]),'last',true),
      row('CEK SELISIH NERACA',r=>r.hasil.neraca.selisih,'last',true)]},
  ]
}

function columnTotal(row: SheetRow, records: Report[]) {
  if (!records.length) return null
  if (row.total === 'first') return row.value(records[0])
  if (row.total === 'last') return row.value(records.at(-1)!)
  return sumAmounts(records.map(row.value))
}

export default function FinancialReportSheet({ data, month, comparison }: { data: Overview; month: string; comparison?: ReactNode }) {
  const records = [...data.laporan].sort((a,b)=>a.tanggal.localeCompare(b.tanggal))
  const days = records.map(r=>r.tanggal)
  // Continue from the last actual report, keeping imported historical dates intact.
  if (data.berikutnya?.startsWith(month)) {
    let next = data.berikutnya
    for (let i=0; i<6 && next.startsWith(month); i++) {
      if (!days.includes(next)) days.push(next)
      const d = new Date(`${next}T12:00:00Z`)
      const untilSunday = (7-d.getUTCDay())%7 || 7
      d.setUTCDate(d.getUTCDate()+untilSunday)
      const sunday=d.toISOString().slice(0,10)
      next = next < data.akhir_bulan && sunday > data.akhir_bulan ? data.akhir_bulan : sunday
    }
  }
  if (!days.length) for(const w of data.mingguan) if(w.tanggal.startsWith(month)) days.push(w.tanggal)
  const sections=sheetSections(data)
  const title = `LAPORAN KEUANGAN · ${months[Number(month.slice(5))-1]} ${month.slice(0,4)}`
  const exportReport = () => exportCsv(`laporan-${month}.csv`, [[title], ['Uraian', ...days.map(dateLabel), 'JUMLAH / POSISI TERAKHIR'], ...sections.flatMap(s=>[[s.title], ...s.rows.map(row=>[row.label,...days.map(d=>{const r=records.find(r=>r.tanggal===d);return r?row.value(r):null}),columnTotal(row,records)])])])
  return <section aria-label="Tabel laporan keuangan" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{data.asal ? 'Buku utama Bumi Lestari' : 'Buku utama'} · {records.length ? `Terisi sampai ${dateLabel(records.at(-1)!.tanggal)}` : 'Data belum tersedia'}</p></div><Button variant="outline" onClick={exportReport} disabled={!records.length}>Unduh laporan</Button></div>
    <Tabs defaultValue="0">
      <TabsList className="section-tabs w-full" aria-label="Bagian laporan keuangan">
        {['Pemasukan', 'Pengeluaran', 'Laba/Rugi', 'Arus Kas', 'Neraca'].map((label, i) => <TabsTrigger key={label} value={String(i)}>{label}</TabsTrigger>)}
        {comparison && <TabsTrigger value="comparison">Pembanding ERP</TabsTrigger>}
      </TabsList>
      {sections.map((section, i) => <TabsContent key={section.title} value={String(i)}>
        <Card>
          <CardHeader><CardTitle>{section.title.slice(3)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground sm:hidden">Geser tabel ke samping untuk melihat minggu berikutnya dan jumlah.</p>
            <div className="max-w-full overflow-x-auto rounded-lg border">
              <Table className="table-fixed" style={{minWidth:220+(days.length+1)*142}} aria-label={section.title.slice(3)}>
                <colgroup><col style={{width:220}}/>{days.map(d=><col key={d} style={{width:142}}/>)}<col style={{width:142}}/></colgroup>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-muted">Uraian</TableHead>
                    {days.map((d,i)=><TableHead key={d} className="text-center"><span className="block">{['I','II','III','IV','V','VI','VII'][i]} · {months[Number(month.slice(5))-1]}</span><span className="block text-xs font-normal">{dateLabel(d)}</span></TableHead>)}
                    <TableHead className="text-right">{section.title.startsWith('E.')?'Posisi terakhir':'Jumlah'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{section.rows.map(row=><TableRow key={row.label} className={row.emphasis?'bg-muted/50 font-semibold':undefined}>
                  <TableCell className={`sticky left-0 z-10 ${row.emphasis?'bg-muted font-semibold':'bg-card'}`}>{row.label}</TableCell>
                  {days.map(d=>{const r=records.find(r=>r.tanggal===d);return <TableCell key={d} className="text-right whitespace-nowrap tabular-nums">{r?fmtRp(row.value(r)):'—'}</TableCell>})}
                  <TableCell className="bg-muted/40 text-right whitespace-nowrap tabular-nums">{fmtRp(columnTotal(row,records))}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {i === 0 && <><FinancialShopeeIncome until={records.at(-1)?.tanggal} month={month} columns={days.length} /><FinancialShopeeIncome until={records.at(-1)?.tanggal} month={month} columns={days.length} released /><FinancialSellerBalance month={month} columns={days.length} /></>}
      </TabsContent>)}
      {comparison && <TabsContent value="comparison">{comparison}</TabsContent>}
    </Tabs>
    <p className="text-xs text-muted-foreground">Jumlah pemasukan, pengeluaran dan laba merupakan akumulasi periode terisi. Saldo kas dan neraca memakai posisi terakhir, bukan penjumlahan saldo mingguan.</p>
  </section>
}
