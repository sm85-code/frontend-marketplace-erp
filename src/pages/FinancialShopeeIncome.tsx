import { useQuery } from '@tanstack/react-query'
import { shopeeIncome, type ShopeeIncomeCell } from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'
import { sumAmounts } from '@/lib/financialAmounts'

const labels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const dateLabel = (value: string) => new Date(value+'T12:00:00+07:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'})
function aggregate(cells: ShopeeIncomeCell[]): ShopeeIncomeCell {
  const estimasi = sumAmounts(cells.map(c=>c.estimasi))
  const riil = sumAmounts(cells.map(c=>c.riil))
  const belum_riil = cells.reduce((s,c)=>s+c.belum_riil,0)
  return {estimasi,riil,belum_riil,jumlah:belum_riil?null:sumAmounts([estimasi,riil])}
}
function Amount({cell}:{cell:ShopeeIncomeCell}) {
  return <><span className="block">{cell.jumlah === null ? 'Belum lengkap' : fmtRp(cell.jumlah)}</span>
    <span className="block text-xs font-normal text-muted-foreground">Estimasi {fmtRp(cell.estimasi)} · Riil {fmtRp(cell.riil)}</span>
    {!!cell.belum_riil && <span className="block text-xs font-normal text-muted-foreground">{cell.belum_riil} pesanan selesai belum ada pencairan riil</span>}</>
}
export default function FinancialShopeeIncome({month,columns}:{month:string;columns:number}) {
  const q = useQuery({queryKey:['financial-shopee-income',month,columns],queryFn:()=>shopeeIncome(month,columns),enabled:columns>0})
  const monthLabel = new Date(month+'-01T12:00:00+07:00').toLocaleDateString('id-ID',{month:'long'})
  return <Card className="mt-4"><CardHeader><CardTitle>PEMASUKAN (SHOPEE)</CardTitle></CardHeader><CardContent className="space-y-3">
    {q.isLoading && <Spinner label="Memuat pemasukan Shopee…" />}
    {q.error && <div role="alert"><p>{getApiError(q.error)}</p><Button variant="outline" onClick={()=>void q.refetch()}>Coba lagi</Button></div>}
    {q.data && <>
      <div className="max-w-full overflow-x-auto rounded-lg border">
        <Table className="table-fixed" style={{minWidth:220+(columns+1)*142}} aria-label="PEMASUKAN (SHOPEE)">
          <colgroup><col style={{width:220}}/>{q.data.minggu.map(w=><col key={w.mulai} style={{width:142}}/>)}<col style={{width:142}}/></colgroup>
          <TableHeader className="bg-muted"><TableRow><TableHead className="sticky left-0 z-10 bg-muted">Uraian</TableHead>
            {q.data.minggu.map((w,i)=><TableHead key={w.mulai} className="text-center"><span className="block">{labels[i]} · {monthLabel}</span><span className="block text-xs font-normal">{dateLabel(w.mulai)}–{dateLabel(w.akhir)}</span></TableHead>)}
            <TableHead className="text-right">Jumlah</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.data.toko.map(shop=><TableRow key={shop.id}><TableCell className="sticky left-0 z-10 bg-card">{shop.nama}</TableCell>
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
