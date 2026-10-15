import { useQuery } from '@tanstack/react-query'
import { shopeeIncome, shopeeReleasedFunds, type ShopeeIncomeCell } from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'
import { sumAmounts } from '@/lib/financialAmounts'

const labels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const dateLabel = (value: string) => new Date(value+'T12:00:00+07:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'})
function aggregate(cells: ShopeeIncomeCell[]): ShopeeIncomeCell {
  const estimasi = cells.some(c=>c.jumlah === null) ? null : sumAmounts(cells.map(c=>c.jumlah!))
  return {estimasi,riil:'0',belum_riil:0,jumlah:estimasi}
}
function Amount({cell}:{cell:ShopeeIncomeCell}) {
  return <span className="block whitespace-nowrap">{cell.jumlah === null ? 'Belum tersedia' : fmtRp(cell.jumlah)}</span>
}
export default function FinancialShopeeIncome({month,columns,released=false}:{month:string;columns:number;released?:boolean}) {
  const title = released ? 'SALDO PENJUAL (SHOPEE)' : 'PEMASUKAN (SHOPEE)'
  const q = useQuery({queryKey:[released?'financial-shopee-released':'financial-shopee-income',month,columns],queryFn:()=>(released?shopeeReleasedFunds:shopeeIncome)(month,columns),enabled:columns>0})
  const monthLabel = new Date(month+'-01T12:00:00+07:00').toLocaleDateString('id-ID',{month:'long'})
  return <Card className="mt-4"><CardHeader><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{released ? 'Dana pesanan yang sudah cair, dikelompokkan sesuai tanggal cair.' : 'Estimasi pesanan dalam pengiriman dan diterima tetapi belum selesai.'}</p></CardHeader><CardContent className="space-y-3">
    {q.isLoading && <Spinner label={released?'Memuat dana cair Shopee…':'Memuat pemasukan Shopee…'} />}
    {q.error && <div role="alert"><p>{getApiError(q.error)}</p><Button variant="outline" onClick={()=>void q.refetch()}>Coba lagi</Button></div>}
    {q.data && <>
      <div className="max-w-full overflow-x-auto rounded-lg border">
        <Table className="table-fixed" style={{minWidth:220+(columns+1)*142}} aria-label={title}>
          <colgroup><col style={{width:220}}/>{q.data.minggu.map(w=><col key={w.mulai} style={{width:142}}/>)}<col style={{width:142}}/></colgroup>
          <TableHeader className="bg-muted"><TableRow><TableHead className="sticky left-0 z-10 bg-muted">Uraian</TableHead>
            {q.data.minggu.map((w,i)=><TableHead key={w.mulai} className="text-center"><span className="block">{labels[i]} · {monthLabel}</span><span className="block text-xs font-normal">{dateLabel(w.mulai)}–{dateLabel(w.akhir)}</span></TableHead>)}
            <TableHead className="text-right">Jumlah</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.data.toko.map(shop=><TableRow key={shop.id}><TableCell className="sticky left-0 z-10 bg-card">{shop.nama}{shop.akun_ditemukan === false && <span className="block whitespace-normal text-xs text-muted-foreground">Akun toko ERP belum ditemukan</span>}</TableCell>
              {shop.minggu.map((c,i)=><TableCell key={i} className="text-right tabular-nums"><Amount cell={c}/></TableCell>)}
              <TableCell className="bg-muted/40 text-right tabular-nums"><Amount cell={aggregate(shop.minggu)}/></TableCell>
            </TableRow>)}
            <TableRow className="bg-muted/50 font-semibold"><TableCell className="sticky left-0 z-10 bg-muted">TOTAL</TableCell>
              {q.data.minggu.map((w,i)=><TableCell key={w.mulai} className="text-right tabular-nums"><Amount cell={aggregate(q.data!.toko.map(s=>s.minggu[i]))}/></TableCell>)}
              <TableCell className="text-right tabular-nums"><Amount cell={aggregate(q.data.toko.flatMap(s=>s.minggu))}/></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {!q.data.toko.length && <p className="text-sm text-muted-foreground">Belum ada toko Shopee di ERP.</p>}
      <p className="text-xs text-muted-foreground">{q.data.catatan}</p>
    </>}
  </CardContent></Card>
}
