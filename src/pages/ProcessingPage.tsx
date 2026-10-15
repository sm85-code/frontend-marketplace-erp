import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getProcessingData, importProcessingData, type ProcessingParty, type ProductionPrice } from '@/api/processing'
import { fmtDateTime, fmtRp, getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { readProcessingCapsule } from '@/lib/processingImport'
import { BarHalaman, TabelLokal, type KolomTabel } from '@/components/daftar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Spinner from '@/components/Spinner'

const includes=(values:unknown[],search:string)=>values.join(' ').toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID'))
const partyColumns:KolomTabel<ProcessingParty>[]=[
  {kunci:'nama',judul:'Nama',tetap:true,nilai:r=>r.nama,sel:r=>r.nama},
  {kunci:'catatan',judul:'Keterangan',sel:r=>r.catatan||'—'},
  {kunci:'sumber',judul:'Baris sumber',sel:r=>r.sumber},
]
function PartyTable({title,items}:{title:string;items:ProcessingParty[]}) {
  const [search,setSearch]=useState('')
  return <Card className="min-w-0"><CardHeader><CardTitle>{title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span></CardTitle></CardHeader><CardContent className="space-y-3">
    <Input aria-label={`Cari ${title}`} placeholder="Cari nama atau keterangan" value={search} onChange={e=>setSearch(e.target.value)}/>
    <TabelLokal label={title} items={items.filter(r=>includes([r.nama,r.catatan],search))} kolom={partyColumns} idDari={r=>r.id} namaDari={r=>r.nama} minWidth={560}/>
  </CardContent></Card>
}
const priceColumns:KolomTabel<ProductionPrice>[]=[
  {kunci:'nomor',judul:'No.',nilai:r=>r.nomor,sel:r=>r.nomor},
  {kunci:'produk',judul:'Nama produk',tetap:true,nilai:r=>r.produk,sel:r=>r.produk},
  {kunci:'jenis',judul:'Jenis produk',nilai:r=>r.jenis,sel:r=>r.jenis},
  {kunci:'kode',judul:'Kode',sel:r=>r.kode},
  {kunci:'ukuran',judul:'Ukuran',nilai:r=>r.ukuran,sel:r=>r.ukuran},
  {kunci:'sku',judul:'SKU',nilai:r=>r.sku,sel:r=>r.sku},
  {kunci:'harga',judul:'Harga produksi',rata:'kanan',nilai:r=>Number(r.harga),sel:r=><>{fmtRp(r.harga)}{Number(r.harga)===0 && <span className="block text-xs text-destructive">Perlu diperiksa</span>}</>},
  {kunci:'catatan',judul:'Keterangan',sel:r=>r.catatan||'—'},
  {kunci:'sumber',judul:'Baris sumber',sel:r=>r.sumber},
]
function PriceTable({items}:{items:ProductionPrice[]}) {
  const [search,setSearch]=useState('')
  return <Card className="min-w-0"><CardHeader><CardTitle>Daftar Harga Produksi <span className="text-sm font-normal text-muted-foreground">({items.length})</span></CardTitle><p className="text-sm text-muted-foreground">Mengikuti kolom Harga Modal pada tab Data sumber. Harga nol dan SKU berulang dipertahankan untuk diperiksa.</p></CardHeader><CardContent className="space-y-3">
    <Input aria-label="Cari harga produksi" placeholder="Cari produk, SKU, kode, atau ukuran" value={search} onChange={e=>setSearch(e.target.value)}/>
    <TabelLokal label="Daftar Harga Produksi" items={items.filter(r=>includes([r.produk,r.jenis,r.sku,r.kode,r.ukuran,r.catatan],search))} kolom={priceColumns} idDari={r=>r.id} namaDari={r=>r.sku} minWidth={1300}/>
  </CardContent></Card>
}
export default function ProcessingPage() {
  const {user}=useAuth()
  const allowed=user?.role==='admin'
  const location=useLocation()
  const navigate=useNavigate()
  const qc=useQueryClient()
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const started=useRef<string|null>(null)
  const privateKey=new URLSearchParams(location.hash.slice(1)).get('import')
  const q=useQuery({queryKey:['processing-data'],queryFn:getProcessingData,enabled:allowed})
  const save=useCallback(async(payload:unknown)=>{await importProcessingData(payload);await qc.invalidateQueries({queryKey:['processing-data']});toast.success('Data Processing dari Drive sudah tersimpan');navigate('/processing',{replace:true})},[qc,navigate])
  useEffect(()=>{
    if(!allowed || !privateKey || started.current===privateKey)return
    started.current=privateKey
    setBusy(true)
    void readProcessingCapsule(privateKey).then(save).catch(err=>setError(getApiError(err,'Data Drive belum dapat dimuat. Buka kembali tautan impor yang diberikan.'))).finally(()=>setBusy(false))
  // Only an admin opening the explicit private import link triggers this one-time import.
  },[allowed,privateKey,save])
  if(!allowed)return <p role="alert">Processing hanya dapat diakses admin.</p>
  const data=q.data?.data
  return <div className="min-w-0 space-y-4">
    <BarHalaman judul="Processing" deskripsi="Data referensi produksi dan penyiapan pemetaan order."/>
    <Tabs defaultValue="data" className="min-w-0"><TabsList className="section-tabs"><TabsTrigger value="data">Data</TabsTrigger><TabsTrigger value="pemetaan">Pemetaan Order</TabsTrigger></TabsList>
      <TabsContent value="data" className="min-w-0 space-y-4">
        {busy && <Spinner label="Memasukkan data referensi dari Google Drive…"/>}
        {error && <p role="alert">{error}</p>}
        {q.isLoading && <Spinner label="Memuat data Processing…"/>}
        {q.error && <div role="alert">{getApiError(q.error)}<Button variant="outline" onClick={()=>void q.refetch()}>Coba lagi</Button></div>}
        {data && <><p className="text-sm text-muted-foreground">Sumber: <a className="underline" href={data.source_url} target="_blank" rel="noreferrer">{data.source_title}</a> · Dibaca {fmtDateTime(data.read_at)}</p>
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2"><PartyTable title="Daftar Tukang Kayu" items={data.tukang}/><PartyTable title="Supplier" items={data.supplier}/></div><PriceTable items={data.harga_produksi}/></>}
        {!q.isLoading && !data && !busy && <Card><CardHeader><CardTitle>Data referensi belum dimuat</CardTitle></CardHeader><CardContent><p className="text-sm">Buka tautan impor Processing yang sudah disiapkan untuk memuat data Drive tanpa mengetik ulang.</p></CardContent></Card>}
        <details><summary className="cursor-pointer text-sm font-medium">Impor berkas data Drive</summary><div className="pt-3"><Input type="file" accept=".json,application/json" aria-label="Berkas data Processing" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');try{if(file.size>2_000_000)throw new Error('Berkas maksimal 2 MB');await save(JSON.parse(await file.text()))}catch(err){setError(getApiError(err))}finally{setBusy(false)}}}/><p className="pt-2 text-xs text-muted-foreground">Impor tidak menimpa data yang sudah tersimpan.</p></div></details>
      </TabsContent>
      <TabsContent value="pemetaan"><Card><CardHeader><CardTitle>Pemetaan Order</CardTitle><p className="text-sm text-muted-foreground">Pengaitan order ke tukang, supplier, dan harga produksi disiapkan pada tab ini.</p></CardHeader><CardContent><div className="overflow-x-auto rounded-lg border"><Table aria-label="Pemetaan Order" style={{minWidth:780}}><TableHeader className="bg-muted"><TableRow>{['Nomor order','Produk / SKU','Tukang kayu','Supplier','Harga produksi','Status pemetaan'].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada pemetaan order.</TableCell></TableRow></TableBody></Table></div></CardContent></Card></TabsContent>
    </Tabs>
  </div>
}
