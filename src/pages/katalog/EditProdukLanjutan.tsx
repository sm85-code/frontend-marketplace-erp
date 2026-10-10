import Spinner from '@/components/Spinner'
import { toast } from 'sonner'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/management'
import * as workflow from '@/api/workflows'
import { getApiError } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FormDialog from '@/components/FormDialog'
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QueryError from '@/components/QueryError'
import { useConfirm } from '@/components/ConfirmProvider'
import Attributes from '../publication/Attributes'
const inputClass = 'w-full rounded-lg border bg-background p-2'
export default function EditProdukLanjutan({ detail }: { detail: KatalogDetail }) {
  const [open, setOpen] = useState(false)
  const q = useQuery({ queryKey: ['pengaturan-produk', detail.id], queryFn: () => api.settings(detail.id), enabled: open, retry: false })
  return <div className="space-y-2"><Button variant="outline" onClick={()=>{void q.refetch();setOpen(true)}}>Edit Informasi / Varian</Button>{open && q.error && <QueryError error={q.error} retry={q.refetch}/>}{open && q.isFetching && <Spinner column label="Memuat pengaturan terbaru…" />}{open && q.data && <Editor detail={detail} initial={q.data} close={()=>setOpen(false)} />}</div>
}
function Editor({ detail, initial, close }: { detail: KatalogDetail; initial: api.ItemSettings; close: ()=>void }) {
  const confirm = useConfirm(), qc = useQueryClient()
  const [tab, setTab] = useState<'item'|'model'|'tier'>('item')
  const [name, setName] = useState(initial.item_name)
  const [description, setDescription] = useState(initial.description??'')
  const [category, setCategory] = useState(initial.category_id)
  const [attributes, setAttributes] = useState(initial.attribute_list??[])
  const [brand, setBrand] = useState(initial.brand??{brand_id:0,original_brand_name:'No Brand'})
  const [images, setImages] = useState(initial.image?.image_id_list??[])
  const [weight, setWeight] = useState(initial.weight == null?'':String(initial.weight))
  const [dimension, setDimension] = useState(initial.dimension??{package_length:0,package_width:0,package_height:0})
  const [preorder, setPreorder] = useState(initial.pre_order??{is_pre_order:false,days_to_ship:2})
  const [allModels, setAllModels] = useState(false)
  const [modelIndex, setModelIndex] = useState(0)
  const [modelSku, setModelSku] = useState(initial.models[0]?.model_sku??'')
  const [modelWeight, setModelWeight] = useState(initial.models[0]?.weight==null?'':String(initial.models[0].weight))
  const [modelPreorder, setModelPreorder] = useState(initial.models[0]?.pre_order??{is_pre_order:false,days_to_ship:2})
  const [tiers, setTiers] = useState(()=>initial.tiers.map(t=>({variation_id:0,variation_name:t.name,variation_option_list:t.option_list.map(o=>({variation_option_id:0,variation_option_name:o.option,...(o.image?.image_id?{image_id:o.image.image_id}:{})}))})))
  const [error, setError] = useState('')
  const meta = useQuery({ queryKey:['listing-metadata',detail.akun_id,category],queryFn:()=>workflow.listingMetadata(detail.akun_id,category),retry:false })
  const brands = useQuery({queryKey:['edit-listing-brands',detail.akun_id,category],queryFn:()=>workflow.listingBrands(detail.akun_id,category,0),retry:false})
  const changed = (a:unknown,b:unknown)=>JSON.stringify(a)!==JSON.stringify(b)
  const mutation = useMutation({retry:false,mutationFn:async()=>{
    if(tab==='model') { const m=initial.models[modelIndex];if(!m)throw Error('Pilih varian');return api.editModels(detail.id,[{model_id:m.model_id,model_sku:modelSku,...(modelWeight!==String(m.weight??'')?{weight:Number(modelWeight)}:{}),...(changed(modelPreorder,m.pre_order??{is_pre_order:false,days_to_ship:2})?{pre_order:modelPreorder}:{})}]) }
    if(tab==='tier')return api.editTiers(detail.id,{standardise_tier_variation:tiers,model_list:initial.models.map(m=>({model_id:m.model_id,tier_index:m.tier_index}))})
    const body:api.ItemEdit={}
    if(name!==initial.item_name)body.item_name=name
    if(description!==(initial.description??''))body.description=description
    if(category!==initial.category_id){body.category_id=category;body.attribute_list=attributes}
    if(changed(attributes,initial.attribute_list??[]))body.attribute_list=attributes
    if(changed(brand,initial.brand??{brand_id:0,original_brand_name:'No Brand'}))body.brand=brand
    if(changed(images,initial.image?.image_id_list??[]))body.image_ids=images
    if(weight!==String(initial.weight??''))body.weight=Number(weight)
    if(changed(dimension,initial.dimension??{package_length:0,package_width:0,package_height:0}))body.dimension=dimension
    if(changed(preorder,initial.pre_order??{is_pre_order:false,days_to_ship:2}))body.pre_order=preorder
    if(allModels)body.apply_to_all_models=true
    if(!Object.keys(body).some(k=>k!=='apply_to_all_models'))throw Error('Belum ada perubahan')
    return api.editItem(detail.id,body)
  },onSuccess:r=>{toast.success('Perubahan dikonfirmasi Shopee');r.warnings.forEach(w=>toast.warning(w));void qc.invalidateQueries({queryKey:['katalog']});void qc.invalidateQueries({queryKey:['diagnosis-produk',detail.id]});void qc.invalidateQueries({queryKey:['pengaturan-produk',detail.id]});close()}})
  const upload = useMutation({retry:false,mutationFn:(file:File)=>workflow.uploadListingPhoto(detail.akun_id,file),onSuccess:r=>setImages(v=>[...v,r.image_id])})
  const busy=mutation.isPending||upload.isPending
  async function submit(){setError('');if(await confirm({title:'Ubah produk existing di Shopee?',description:`${detail.nama}. Perubahan berlaku langsung pada toko. Stok tidak dipindahkan ke gudang.`}))mutation.mutate()}
  return <FormDialog open onOpenChange={v=>{if(!v)close()}} values={{tab,name,description,category,attributes,brand,images,weight,dimension,preorder,modelSku,modelWeight,modelPreorder,tiers}} busy={busy}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Edit Produk Shopee</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e=>{e.preventDefault();void submit()}}><div className="space-y-2"><Label htmlFor="advanced-tab">Bagian</Label><select id="advanced-tab" className={inputClass} value={tab} disabled={busy} onChange={e=>{setTab(e.target.value as typeof tab);mutation.reset()}}><option value="item">Informasi produk</option>{initial.models.length>0&&<option value="model">SKU / pengiriman varian</option>}{tiers.length>0&&<option value="tier">Nama pilihan varian</option>}</select></div>
    {tab==='item'&&<><div className="space-y-2"><Label htmlFor="advanced-name">Judul</Label><Input id="advanced-name" required maxLength={255} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="advanced-description">Deskripsi</Label><Textarea id="advanced-description" required maxLength={12000} value={description} disabled={busy} onChange={e=>setDescription(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="advanced-category">Kategori</Label><select id="advanced-category" className={inputClass} value={category} disabled={busy||meta.isFetching} onChange={e=>{setCategory(Number(e.target.value));setAttributes([]);setBrand({brand_id:0,original_brand_name:'No Brand'})}}><option value={category}>{meta.data?.categories.find(c=>c.category_id===category)?.original_category_name??`Kategori ${category}`}</option>{meta.data?.categories.filter(c=>!c.has_children&&c.category_id!==category).map(c=><option key={c.category_id} value={c.category_id}>{c.original_category_name}</option>)}</select></div>{meta.error&&<QueryError error={meta.error} retry={meta.refetch}/ >}{meta.data&&<Attributes nodes={meta.data.attributes} values={attributes} change={setAttributes}/ >}<div className="space-y-2"><Label htmlFor="advanced-brand">Merek</Label><select id="advanced-brand" className={inputClass} disabled={busy} value={brand.brand_id} onChange={e=>{const b=brands.data?.brand_list.find(b=>b.brand_id===Number(e.target.value));if(b)setBrand(b);else if(e.target.value==='0')setBrand({brand_id:0,original_brand_name:'No Brand'})}}><option value="0">Tanpa merek</option>{brand.brand_id!==0&&!brands.data?.brand_list.some(b=>b.brand_id===brand.brand_id)&&<option value={brand.brand_id}>{brand.original_brand_name}</option>}{brands.data?.brand_list.filter(b=>b.brand_id!==0).map(b=><option key={b.brand_id} value={b.brand_id}>{b.original_brand_name}</option>)}</select></div>{brands.error&&<QueryError error={brands.error} retry={brands.refetch}/ >}<div className="space-y-2"><Label htmlFor="advanced-weight">Berat induk (kg)</Label><Input id="advanced-weight" type="number" min="0.001" step="0.001" value={weight} disabled={busy} onChange={e=>setWeight(e.target.value)}/></div><div className="grid grid-cols-3 gap-2">{(['package_length','package_width','package_height'] as const).map((k,i)=><div key={k} className="space-y-2"><Label htmlFor={k}>{['Panjang','Lebar','Tinggi'][i]} (cm)</Label><Input id={k} type="number" min="1" step="1" value={dimension[k]||''} disabled={busy} onChange={e=>setDimension(v=>({...v,[k]:Number(e.target.value)}))}/></div>)}</div>{initial.models.length>0&&<label className="flex gap-2 text-sm"><input type="checkbox" className="size-4 shrink-0" disabled={busy} checked={allModels} onChange={e=>setAllModels(e.target.checked)}/>Saya memahami berat/dimensi induk menimpa semua varian</label>}<div className="space-y-2"><label className="flex items-center gap-2"><input className="size-4 shrink-0" type="checkbox" disabled={busy} checked={preorder.is_pre_order} onChange={e=>setPreorder(v=>({...v,is_pre_order:e.target.checked}))}/>Preorder</label>{preorder.is_pre_order&&<Input aria-label="Hari proses produk" type="number" min="1" max="180" value={preorder.days_to_ship} disabled={busy} onChange={e=>setPreorder(v=>({...v,days_to_ship:Number(e.target.value)}))}/>}</div><div className="space-y-2"><Label htmlFor="advanced-image">Foto ({images.length}/9)</Label><Input id="advanced-image" type="file" accept="image/*" disabled={busy||images.length>=9} onChange={e=>{const f=e.target.files?.[0];if(f)upload.mutate(f);e.target.value=''}}/><div className="flex flex-wrap gap-2">{images.map((id,i)=><div key={id} className="space-y-1 rounded-lg border p-2"><img src={initial.image?.image_url_list?.[initial.image.image_id_list.indexOf(id)]} alt={`Foto ${i+1}`} className="size-16 object-cover"/><Button type="button" size="sm" variant="outline" disabled={busy||images.length<=1} onClick={()=>setImages(v=>v.filter(x=>x!==id))}>Hapus foto {i+1}</Button></div>)}</div></div></>}
    {tab==='model'&&<><select aria-label="Varian" className={inputClass} value={modelIndex} disabled={busy} onChange={e=>{const i=Number(e.target.value),m=initial.models[i];setModelIndex(i);setModelSku(m.model_sku??'');setModelWeight(String(m.weight??''));setModelPreorder(m.pre_order??{is_pre_order:false,days_to_ship:2})}}>{initial.models.map((m,i)=><option key={m.model_id} value={i}>{m.model_name||m.model_id}</option>)}</select><div className="space-y-2"><Label htmlFor="model-sku">SKU varian</Label><Input id="model-sku" value={modelSku} maxLength={100} disabled={busy} onChange={e=>setModelSku(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="model-weight">Berat varian (kg)</Label><Input id="model-weight" type="number" min="0.001" step="0.001" value={modelWeight} disabled={busy} onChange={e=>setModelWeight(e.target.value)}/></div><label className="flex items-center gap-2"><input type="checkbox" className="size-4 shrink-0" checked={modelPreorder.is_pre_order} disabled={busy} onChange={e=>setModelPreorder(v=>({...v,is_pre_order:e.target.checked}))}/>Preorder varian</label>{modelPreorder.is_pre_order&&<Input aria-label="Hari proses varian" type="number" min="1" max="180" value={modelPreorder.days_to_ship} disabled={busy} onChange={e=>setModelPreorder(v=>({...v,days_to_ship:Number(e.target.value)}))}/>}</>}
    {tab==='tier'&&tiers.map((t,i)=><div key={i} className="space-y-2"><Input aria-label={`Nama variasi ${i+1}`} required value={t.variation_name} disabled={busy} onChange={e=>setTiers(v=>v.map((x,j)=>j===i?{...x,variation_name:e.target.value}:x))}/>{t.variation_option_list.map((o,j)=><Input key={j} aria-label={`Pilihan ${i+1}-${j+1}`} required value={o.variation_option_name} disabled={busy} onChange={e=>setTiers(v=>v.map((x,k)=>k===i?{...x,variation_option_list:x.variation_option_list.map((p,l)=>l===j?{...p,variation_option_name:e.target.value}:p)}:x))}/>)}<Button type="button" variant="outline" size="sm" disabled={busy||t.variation_option_list.length>=50} onClick={()=>setTiers(v=>v.map((x,k)=>k===i?{...x,variation_option_list:[...x.variation_option_list,{variation_option_id:0,variation_option_name:''}]}:x))}>Tambah pilihan</Button></div>)}
    {(error||mutation.error||upload.error)&&<p role="alert" className="text-sm text-destructive break-words">{error||getApiError(mutation.error||upload.error)} Periksa data terbaru sebelum mengulang.</p>}<Button type="submit" disabled={busy||meta.isFetching||(tab==='item'&&!!meta.error)}>{busy?'Memproses…':'Simpan ke Shopee'}</Button></form></DialogContent></FormDialog>
}
