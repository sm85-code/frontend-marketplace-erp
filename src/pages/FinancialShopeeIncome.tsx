import { useQueries, useQuery } from '@tanstack/react-query'
import { shopeeIncome, shopeeReleasedFunds, shippingReceivables, pendingShippingReceivables, type ShopeeIncomeCell } from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'
import { sumAmounts } from '@/lib/financialAmounts'

const dateLabel = (value: string) => new Date(value+'T12:00:00+07:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'})
function aggregate(cells: ShopeeIncomeCell[]): ShopeeIncomeCell {
  const estimasi = cells.some(c=>c.jumlah === null) ? null : sumAmounts(cells.map(c=>c.jumlah!))
  return {estimasi,riil:'0',belum_riil:0,jumlah:estimasi}
}
function Amount({cell}:{cell:ShopeeIncomeCell}) {
  return <span className="block whitespace-nowrap">{cell.jumlah === null ? 'Belum tersedia' : fmtRp(cell.jumlah)}</span>
}
export default function FinancialShopeeIncome({month,columns,released=false,until}:{month:string;columns:number;released?:boolean;until?:string}) {
  const title = released ? 'DANA CAIR (SHOPEE)' : 'ESTIMASI DANA AKAN CAIR (SHOPEE)'
  const q = useQuery({queryKey:[released?'financial-shopee-released':'financial-shopee-income',month,columns,until],queryFn:()=>(released?shopeeReleasedFunds:shopeeIncome)(month,columns,until),enabled:columns>0})
  const meta = useQuery({queryKey:['financial-shipping-receivables',month,columns,until],queryFn:()=>shippingReceivables(month,columns,until),enabled:released && columns>0})
  const ids = meta.data?.toko.find(shop=>shop.nama==='BUMI TANI IND')?.akun_ids ?? []
  const fast = useQueries({queries:ids.map(id=>({queryKey:['financial-pending-shipping',id,month,columns,until],queryFn:()=>pendingShippingReceivables(id,month,columns,until),enabled:released,staleTime:60_000,retry:false}))})
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date())
  const cutoff = until && until<today ? until : today
  const data = q.data && {...q.data,toko:q.data.toko.map(shop=>!released || shop.nama!=='BUMI TANI IND' ? shop : {...shop,minggu:shop.minggu.map((cell,i)=>{
    const future = q.data!.minggu[i].mulai > cutoff
    const known = fast.length>0 && fast.every(result=>result.data?.dana_cepat && result.data.minggu[i]?.dana_cair != null)
    const amount = future ? '0' : known ? sumAmounts(fast.map(result=>result.data!.minggu[i].dana_cair!)) : null
    return {...cell,riil:amount ?? '0',jumlah:amount}
  })})}
  return <Card className="mt-4"><CardHeader><CardTitle>{released ? 'Dana cair (Shopee)' : 'Estimasi dana akan cair (Shopee)'}</CardTitle><p className="text-sm text-muted-foreground">{released ? 'Dana pesanan yang sudah cair, dikelompokkan sesuai tanggal cair.' : 'Estimasi pesanan dalam pengiriman dan diterima tetapi belum selesai, dikelompokkan sesuai tanggal dikirim.'}</p></CardHeader><CardContent className="space-y-3">
    {q.isLoading && <Spinner label={released?'Memuat dana cair Shopee…':'Memuat pemasukan Shopee…'} />}
    {released && fast.some(result=>result.error) && <div role="alert" className="flex items-center gap-2 text-sm"><span>Dana Cepat BUMI TANI IND belum terbaca.</span><Button variant="outline" onClick={()=>fast.forEach(result=>{void result.refetch()})}>Coba lagi</Button></div>}
    {q.error && <div role="alert"><p>{getApiError(q.error)}</p><Button variant="outline" onClick={()=>void q.refetch()}>Coba lagi</Button></div>}
    {until && <p className="text-sm text-muted-foreground">Data sampai {dateLabel(until)} {until.slice(0,4)}, mengikuti laporan terisi.</p>}
    {data && <>
      <div className="max-w-full overflow-x-auto rounded-lg border">
        <Table className="table-fixed" style={{minWidth:220+(columns+1)*142}} aria-label={title}>
          <colgroup><col style={{width:220}}/>{data.minggu.map(w=><col key={w.mulai} style={{width:142}}/>)}<col style={{width:142}}/></colgroup>
          <TableHeader className="bg-muted"><TableRow><TableHead className="sticky left-0 z-10 bg-muted">Uraian</TableHead>
            {data.minggu.map((w)=><TableHead key={w.mulai} className="text-center"><span className="block">Periode</span><span className="block text-xs font-normal">{dateLabel(w.mulai)}–{dateLabel(w.akhir)}</span></TableHead>)}
            <TableHead className="text-right">Jumlah</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.toko.map(shop=><TableRow key={shop.id}><TableCell className="sticky left-0 z-10 bg-card">{shop.nama}{released && shop.nama==='BUMI TANI IND' && <span className="block whitespace-normal text-xs text-muted-foreground">Dana Cepat · mutasi saldo aktual{fast.some(result=>result.isPending)?' · memuat…':fast.some(result=>result.error)?' · gagal membaca data':''}</span>}{!released && shop.nama==='BUMI TANI IND' && <span className="block whitespace-normal text-xs text-muted-foreground">Dana Cepat · estimasi tidak masuk laporan utama</span>}{shop.akun_ditemukan === false && <span className="block whitespace-normal text-xs text-muted-foreground">Akun toko ERP belum ditemukan</span>}</TableCell>
              {shop.minggu.map((c,i)=><TableCell key={i} className="text-right tabular-nums">{until && data!.minggu[i].mulai>until ? "—" : <Amount cell={c}/>}</TableCell>)}
              <TableCell className="bg-muted/40 text-right tabular-nums"><Amount cell={aggregate(shop.minggu)}/></TableCell>
            </TableRow>)}
            <TableRow className="bg-muted/50 font-semibold"><TableCell className="sticky left-0 z-10 bg-muted">Total</TableCell>
              {data.minggu.map((w,i)=><TableCell key={w.mulai} className="text-right tabular-nums">{until && w.mulai>until ? "—" : <Amount cell={aggregate(data!.toko.map(s=>s.minggu[i]))}/>}</TableCell>)}
              <TableCell className="text-right tabular-nums"><Amount cell={aggregate(data.toko.flatMap(s=>s.minggu))}/></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {!data.toko.length && <p className="text-sm text-muted-foreground">Belum ada toko Shopee di ERP.</p>}
      {!released && <p className="text-xs text-muted-foreground">{data.catatan}</p>}
    </>}
  </CardContent></Card>
}
