import { useQueries, useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import api, { fmtDateTime, fmtMoney, getApiError } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { sumAmounts } from '@/lib/financialAmounts'

const shops = ['BUMI TANI IND', 'BUMI LESTARI INDONESIA', 'RESTU BUMI IND', 'MAJAPAHIT STORE IND', 'CAHAYA LANGIT IND', 'AZFA Furniture Official']
const key = (value: string) => value.normalize('NFKC').toLocaleLowerCase('id-ID').trim().replace(/\s+/gu, ' ')
type Balance = { saldo_terakhir: string | null; transaksi_at: number | null; diperiksa_at: string; currency: string | null; cutoff: string }
const label = (date: string) => new Date(date+'T12:00:00+07:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'})

export default function FinancialSellerBalance({month,columns}:{month:string;columns:number}) {
  const accounts = useQuery({queryKey:['akun'],queryFn:()=>listAkun()})
  const matched = shops.map(name=>(accounts.data ?? []).filter(a=>a.platform==='shopee' && key(a.nama_toko)===key(name)))
  const selected = matched.map(list=>list.length===1?list[0]:null)
  const first = new Date(month+'-01T12:00:00Z')
  first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7+6)
  const dates = Array.from({length:columns},(_,i)=>{const d=new Date(first);d.setUTCDate(d.getUTCDate()+i*7);return d.toISOString().slice(0,10)})
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const today = ['year','month','day'].map(type=>parts.find(p=>p.type===type)?.value).join('-')
  const lastClosed = dates.findLastIndex(d=>d<today)
  const queries = useQueries({queries:selected.flatMap((account,index)=>dates.map(cutoff=>({
    queryKey:['financial-wallet-cutoff',account?.id??shops[index],cutoff],
    queryFn:()=>api.get<Balance>(`/laporan-keuangan/saldo-wallet-shopee/${account!.id}`,{params:{tanggal:cutoff}}).then(r=>r.data),
    enabled:!!account?.id_toko_eksternal && cutoff<today,
    retry:false,
    staleTime:300_000,
  })))})
  const get = (shop:number,week:number) => week<0?undefined:queries[shop*columns+week]
  const usable = (shop:number,week:number) => {const q=get(shop,week);return q && !q.error && q.data?.saldo_terakhir!=null && !!q.data.currency}
  const amount = (shop:number,week:number) => {
    if(week<0 || dates[week]>=today) return 'Belum tutup minggu'
    const q=get(shop,week)!
    if(accounts.isPending || q.isFetching) return 'Memuat…'
    return usable(shop,week)?fmtMoney(q.data!.saldo_terakhir!,q.data!.currency!):'Belum tersedia'
  }
  const totals = (week:number) => {
    if(week<0 || dates[week]>=today) return 'Belum tutup minggu'
    const grouped=new Map<string,string[]>()
    shops.forEach((_,i)=>{if(usable(i,week)){const d=get(i,week)!.data!;grouped.set(d.currency!,[...(grouped.get(d.currency!)??[]),d.saldo_terakhir!])}})
    const complete=shops.every((_,i)=>usable(i,week))
    return <>{[...grouped].map(([currency,values])=><div key={currency}>{fmtMoney(sumAmounts(values),currency)}</div>)}{!complete && <span className="block whitespace-normal text-xs font-normal">{grouped.size?'Sebagian data belum tersedia':'Belum tersedia'}</span>}</>
  }
  const busy=accounts.isFetching || queries.some(q=>q.isFetching)
  return <Card className="mt-4"><CardHeader>
    <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Saldo penjual (Shopee)</CardTitle><Button variant="outline" disabled={busy} onClick={()=>{void accounts.refetch();selected.forEach((account,i)=>{if(account?.id_toko_eksternal)dates.forEach((d,w)=>{if(d<today)void get(i,w)?.refetch()})})}}>{busy?'Memuat…':'Perbarui saldo'}</Button></div>
    <p className="text-sm text-muted-foreground">Saldo tersisa pada tiap Minggu pukul 23.59 WIB, setelah mutasi dan penarikan yang tercatat sampai cut-off.</p>
  </CardHeader><CardContent className="space-y-3">
    {accounts.error && <p role="alert">{getApiError(accounts.error)}</p>}
    <div className="max-w-full overflow-x-auto rounded-lg border"><Table className="table-fixed" style={{minWidth:220+(columns+1)*165}} aria-label="SALDO PENJUAL (SHOPEE)">
      <colgroup><col style={{width:220}}/>{dates.map(d=><col key={d} style={{width:165}}/>)}<col style={{width:165}}/></colgroup>
      <TableHeader className="bg-muted"><TableRow><TableHead className="sticky left-0 z-10 bg-muted">Toko</TableHead>
        {dates.map((d,i)=><TableHead key={d} className="text-center"><span className="block">{['I','II','III','IV','V','VI','VII'][i]} · {new Date(month+'-01T12:00:00Z').toLocaleDateString('id-ID',{month:'long'})}</span><span className="block text-xs font-normal">Minggu {label(d)} · 23.59</span></TableHead>)}
        <TableHead className="text-right">Saldo terakhir{lastClosed>=0 && <span className="block text-xs font-normal">{label(dates[lastClosed])}</span>}</TableHead>
      </TableRow></TableHeader><TableBody>
        {shops.map((name,i)=><TableRow key={name}><TableCell className="sticky left-0 z-10 bg-card">{name}
          {!accounts.isPending && !accounts.error && (!selected[i] || !selected[i]?.id_toko_eksternal) && <span className="block whitespace-normal text-xs text-muted-foreground">{matched[i].length>1?'Nama cocok dengan lebih dari satu akun ERP':selected[i]?'Toko belum terhubung':'Akun toko ERP belum ditemukan'}</span>}
        </TableCell>{dates.map((d,w)=><TableCell key={d} className="text-right tabular-nums">{amount(i,w)}
          {usable(i,w) && get(i,w)!.data!.transaksi_at != null && <span className="block whitespace-normal text-xs text-muted-foreground">Mutasi {fmtDateTime(new Date(get(i,w)!.data!.transaksi_at!*1000).toISOString())}</span>}
          {get(i,w)?.error && <span className="block whitespace-normal text-xs text-destructive">{getApiError(get(i,w)!.error)}</span>}
        </TableCell>)}<TableCell className="bg-muted/40 text-right tabular-nums">{amount(i,lastClosed)}</TableCell></TableRow>)}
        <TableRow className="bg-muted/50 font-semibold"><TableCell className="sticky left-0 z-10 bg-muted">Total</TableCell>{dates.map((d,w)=><TableCell key={d} className="text-right tabular-nums">{totals(w)}</TableCell>)}<TableCell className="text-right tabular-nums">{totals(lastClosed)}</TableCell></TableRow>
      </TableBody>
    </Table></div>
    <p className="text-xs text-muted-foreground">Saldo berasal dari mutasi terakhir sampai Minggu 23.59 WIB, dengan pencarian 14 hari ke belakang dari tiap cut-off. Riwayat tidak tersedia ditandai, tanpa memakai saldo saat ini. Saldo mingguan tidak dijumlahkan; kolom terakhir memakai posisi minggu terakhir yang sudah tutup. Total antar toko dipisahkan menurut mata uang. Sumber belum memisahkan saldo tersedia untuk ditarik dan tertahan.</p>
  </CardContent></Card>
}
