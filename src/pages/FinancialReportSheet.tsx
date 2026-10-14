import type { Overview, Report } from '@/api/financialReports'
import { fmtRp } from '@/api/client'
import { exportCsv } from '@/lib/exportData'
import { Button } from '@/components/ui/button'

export type SheetRow = { label: string; value: (r: Report) => string; total?: 'sum' | 'first' | 'last'; emphasis?: boolean }
const input = (key: keyof Report['input']) => (r: Report) => String(r.input[key] ?? '0')
const result = (key: 'pemasukan_toko' | 'perubahan_piutang' | 'pemasukan' | 'pengeluaran' | 'laba' | 'kas_masuk' | 'kas_keluar' | 'transfer_antar_kas') => (r: Report) => r.hasil[key]
const end = (key: keyof Report['hasil']['saldo_akhir']) => (r: Report) => r.hasil.saldo_akhir[key]
const before = (key: keyof Report['hasil']['saldo_awal']) => (r: Report) => r.hasil.saldo_awal[key]

// Preserve cents for column totals without rounding through floating-point arithmetic.
export function sumAmounts(values: string[]): string {
  const cents = values.reduce((sum, value) => {
    const negative = value.startsWith('-')
    const [whole, fraction = ''] = value.replace(/^-/, '').split('.')
    const n = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
    return sum + (negative ? -n : n)
  }, 0n)
  const magnitude = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}`
}

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

export default function FinancialReportSheet({ data, month }: { data: Overview; month: string }) {
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
    <p className="text-xs text-muted-foreground sm:hidden">Geser tabel ke samping untuk melihat minggu berikutnya dan jumlah.</p>
    <div className="max-w-full overflow-x-auto rounded-xl border bg-background">
      <div style={{minWidth:220+(days.length+1)*142}}>
        {sections.map(section=><table key={section.title} className="w-full table-fixed border-collapse text-sm">
          <colgroup><col style={{width:220}}/>{days.map(d=><col key={d} style={{width:142}}/>)}<col style={{width:142}}/></colgroup>
          <thead><tr><th colSpan={days.length+2} className="border-b border-t bg-emerald-900 px-3 py-3 text-left font-semibold text-white">{section.title}</th></tr>
            <tr><th className="sticky left-0 z-10 border-b border-r bg-emerald-50 p-3 text-left text-emerald-950">URAIAN</th>{days.map((d,i)=><th key={d} className="border-b border-r bg-emerald-50 p-2 text-center text-emerald-950"><span className="block">{['I','II','III','IV','V','VI','VII'][i]} · {months[Number(month.slice(5))-1]}</span><span className="block text-xs font-normal">{dateLabel(d)}</span></th>)}<th className="border-b bg-emerald-100 p-2 text-center text-emerald-950">{section.title.startsWith('E.')?'POSISI TERAKHIR':'JUMLAH'}</th></tr>
          </thead><tbody>{section.rows.map(row=><tr key={row.label} className={row.emphasis?'font-semibold':'hover:bg-muted/40'}><th scope="row" className={`sticky left-0 z-10 border-b border-r px-3 py-2.5 text-left ${row.emphasis?'bg-emerald-50':'bg-background font-normal'}`}>{row.label}</th>{days.map(d=>{const r=records.find(r=>r.tanggal===d);return <td key={d} className={`border-b border-r px-2 py-2.5 text-right whitespace-nowrap tabular-nums ${row.emphasis?'bg-emerald-50':''}`}>{r?fmtRp(row.value(r)):'—'}</td>})}<td className="border-b bg-emerald-50/70 px-2 py-2.5 text-right whitespace-nowrap tabular-nums">{fmtRp(columnTotal(row,records))}</td></tr>)}</tbody>
        </table>)}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Jumlah pemasukan, pengeluaran dan laba merupakan akumulasi periode terisi. Saldo kas dan neraca memakai posisi terakhir, bukan penjumlahan saldo mingguan.</p>
  </section>
}
