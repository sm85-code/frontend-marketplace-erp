import { fmtMoney } from '@/api/client'

const moneyKeys=/^(total_omzet|omzet|subtotal|harga_min|harga_max|saldo|saldo_terakhir|saldo_tersedia|saldo_tertahan|current_balance|balance|amount|expense|direct_gmv|budget|anggaran|modal_rp|rata_rata_pesanan)$/
function valueText(key:string,value:unknown,currency:string|undefined,row=false):string {
 if(value==null)return '—'
 if((moneyKeys.test(key)||(row&&key==='total'))&&(typeof value==='number'||typeof value==='string'))return fmtMoney(value,currency)
 return typeof value==='object'?JSON.stringify(value):String(value)
}
export default function AssistantInternalData({value}:{value:unknown}) {
 if(!value||typeof value!=='object')return null
 const record=value as Record<string,unknown>
 const currency='currency' in record?(typeof record.currency==='string'?record.currency:undefined):'IDR'
 const items=Array.isArray(value)?value:Array.isArray(record.items)?record.items:Array.isArray(record.kampanye)?record.kampanye:Array.isArray(record.per_toko)?record.per_toko:Array.isArray(record.conversations)?record.conversations:Array.isArray(record.messages)?record.messages:[]
 const rows=items.filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)).slice(0,20)
 const keys=[...new Set(rows.flatMap(Object.keys))].filter(k=>rows.some(r=>r[k]!=null&&typeof r[k]!=='object')).slice(0,8)
 const summary=Array.isArray(value)?[]:Object.entries(record).filter(([key,v])=>!['draft_id','execution_turn_id'].includes(key)&&v!=null&&typeof v!=='object').slice(0,12)
 return <div className="mt-3 space-y-3 text-sm">
   {summary.length>0&&<dl className="grid gap-2 sm:grid-cols-2">{summary.map(([k,v])=><div key={k} className="min-w-0 rounded-lg bg-muted/50 p-2"><dt className="text-xs text-muted-foreground">{k.replaceAll('_',' ')}</dt><dd className="break-words">{valueText(k,v,currency)}</dd></div>)}</dl>}
   {rows.length>0&&keys.length>0&&<div role="region" aria-label="Hasil data internal" tabIndex={0} className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="bg-muted"><tr>{keys.map(k=><th key={k} className="whitespace-nowrap p-2">{k.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t">{keys.map(k=><td key={k} className="max-w-64 break-words p-2">{valueText(k,row[k],currency,true)}</td>)}</tr>)}</tbody></table></div>}
   {items.length>20&&<p className="text-xs text-muted-foreground">Menampilkan 20 baris. Rincian lengkap ada di catatan tindakan.</p>}
 </div>
}
