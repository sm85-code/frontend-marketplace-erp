import { useQueries, useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import api, { fmtDateTime, fmtMoney, getApiError } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { sumAmounts } from '@/lib/financialAmounts'

const shops = ['BUMI TANI IND', 'BUMI LESTARI INDONESIA', 'RESTU BUMI IND', 'MAJAPAHIT STORE IND', 'CAHAYA LANGIT IND', 'AZFA Furniture Official']
const key = (value: string) => value.normalize('NFKC').toLocaleLowerCase('id-ID').trim().replace(/\s+/gu, ' ')
type Balance = { saldo_terakhir: string | null; transaksi_at: number | null; diperiksa_at: string; currency: string | null }

export default function FinancialSellerBalance() {
  const accounts = useQuery({queryKey:['akun'],queryFn:()=>listAkun()})
  const matched = shops.map(name=>(accounts.data ?? []).filter(a=>a.platform==='shopee' && key(a.nama_toko)===key(name)))
  const selected = matched.map(list=>list.length===1?list[0]:null)
  const queries = useQueries({queries:selected.map((account,index)=>({
    queryKey:['saldo-toko',account?.id??shops[index]],
    queryFn:()=>api.get<Balance>(`/akun/${account!.id}/saldo-toko`).then(r=>r.data),
    enabled:!!account?.id_toko_eksternal,
    retry:false,
    staleTime:300_000,
  }))})
  const rows = shops.map((name,i)=>({name,account:selected[i],matches:matched[i].length,query:queries[i]}))
  const usable = (row:typeof rows[number]) => !!row.account?.id_toko_eksternal && !row.query.error && row.query.data?.saldo_terakhir != null && !!row.query.data.currency
  const complete = !accounts.isPending && !accounts.error && rows.every(usable)
  const totals = new Map<string,string[]>()
  for(const row of rows) if(usable(row)) {
    const d=row.query.data!
    totals.set(d.currency!,[...(totals.get(d.currency!)??[]),d.saldo_terakhir!])
  }
  const busy = accounts.isFetching || queries.some(q=>q.isFetching)
  return <Card className="mt-4">
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>SALDO PENJUAL (SHOPEE)</CardTitle>
      <Button variant="outline" disabled={busy} onClick={()=>{void accounts.refetch();for(const row of rows) if(row.account?.id_toko_eksternal) void row.query.refetch()}}>{busy?'Memuat…':'Perbarui saldo'}</Button>
    </div><p className="text-sm text-muted-foreground">Posisi saldo wallet terakhir setelah mutasi, termasuk penarikan yang sudah tercatat. Saldo terbaru tidak mengikuti bulan laporan.</p></CardHeader>
    <CardContent className="space-y-3">
      {accounts.error && <p role="alert">{getApiError(accounts.error)}</p>}
      <div className="max-w-full overflow-x-auto rounded-lg border">
        <Table style={{minWidth:760}} aria-label="SALDO PENJUAL (SHOPEE)">
          <TableHeader className="bg-muted"><TableRow><TableHead>Toko</TableHead><TableHead className="text-right">Saldo tersisa tercatat</TableHead><TableHead>Waktu transaksi saldo</TableHead><TableHead>Terakhir diperiksa</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(row=><TableRow key={row.name}><TableCell>{row.name}
              {!accounts.isPending && !accounts.error && (!row.account || !row.account.id_toko_eksternal) && <span className="block whitespace-normal text-xs text-muted-foreground">{row.matches>1?'Nama cocok dengan lebih dari satu akun ERP':row.account?'Toko belum terhubung':'Akun toko ERP belum ditemukan'}</span>}
              {row.query.error && <span className="block whitespace-normal text-xs text-destructive">{getApiError(row.query.error)}</span>}
            </TableCell>
              <TableCell className="text-right tabular-nums">{row.query.isFetching || accounts.isPending ? 'Memuat…' : usable(row)?fmtMoney(row.query.data!.saldo_terakhir!,row.query.data!.currency!):'Belum tersedia'}</TableCell>
              <TableCell>{usable(row) && row.query.data?.transaksi_at != null ? fmtDateTime(new Date(row.query.data.transaksi_at*1000).toISOString()):'—'}</TableCell>
              <TableCell>{row.query.data?.diperiksa_at?fmtDateTime(row.query.data.diperiksa_at):'—'}</TableCell>
            </TableRow>)}
            <TableRow className="bg-muted/50 font-semibold"><TableCell>TOTAL{!complete && ' (data tersedia)'}</TableCell><TableCell className="text-right tabular-nums">
              {totals.size?[...totals].map(([currency,values])=><div key={currency}>{fmtMoney(sumAmounts(values),currency)}</div>):'Belum tersedia'}
            </TableCell><TableCell colSpan={2}/></TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Sumber: saldo setelah transaksi terbaru dari mutasi Shopee dalam 14 hari terakhir. Saldo tersedia untuk ditarik dan saldo tertahan belum dipisahkan oleh sumber ini. Total dipisahkan menurut mata uang; data yang belum tersedia tidak dianggap nol.</p>
    </CardContent>
  </Card>
}
