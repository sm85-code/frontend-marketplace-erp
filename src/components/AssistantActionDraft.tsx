import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { getApiError } from '@/api/client'
import { decideAction, type AiAction } from '@/api/assistant'

export default function AssistantActionDraft({action,shop,busy}:{action:AiAction;shop:string;busy:boolean}) {
 const qc=useQueryClient(),{user}=useAuth()
 const [allVariants,setAllVariants]=useState(false)
 const changes=action.arguments.perubahan as {apply_to_all_models?:boolean}|undefined
 const needsVariants=action.tool==='ubah_produk'&&changes?.apply_to_all_models===true
 const mutation=useMutation({mutationFn:(decision:'confirm'|'cancel')=>decideAction(action.id,decision,allVariants),retry:false,onSuccess:turn=>{
   qc.setQueryData(['assistant-history',user?.id,turn.conversation_id,1],(old:{items:typeof turn[];ada_lagi:boolean}|undefined)=>({items:[...(old?.items.filter(t=>t.id!==turn.id)??[]),turn],ada_lagi:old?.ada_lagi??false}))
   void qc.invalidateQueries({queryKey:['assistant-history']});void qc.invalidateQueries({queryKey:['assistant-status']})
 }})
 return <div className="mt-3 space-y-3 rounded-xl border border-primary/30 bg-background p-3">
   <p className="text-sm font-medium">Draf · {shop}</p>
   <p className="text-xs text-muted-foreground">Belum ada perubahan. Pastikan sasaran, nilai, dan jadwal di rincian draf sudah benar. Draf berlaku 10 menit.</p>
   <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">{JSON.stringify(action.arguments,null,2)}</pre>
   {needsVariants&&<label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={allVariants} disabled={mutation.isPending} onChange={e=>setAllVariants(e.target.checked)}/>Saya menyetujui perubahan berat/dimensi untuk seluruh varian produk ini.</label>}
   {mutation.error&&<p role="alert" className="text-sm text-destructive">{getApiError(mutation.error)} Jika koneksi terputus, periksa atau tekan tombol yang sama; tindakan tidak dikirim dua kali.</p>}
   <div className="flex flex-wrap gap-2"><Button type="button" className="min-h-11" disabled={busy||mutation.isPending||(needsVariants&&!allVariants)} onClick={()=>mutation.mutate('confirm')}>{mutation.isPending?'Memproses…':'Konfirmasi dan jalankan'}</Button><Button type="button" variant="outline" className="min-h-11" disabled={busy||mutation.isPending} onClick={()=>mutation.mutate('cancel')}>Batal</Button></div>
 </div>
}
