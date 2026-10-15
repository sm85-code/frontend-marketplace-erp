import api from './client'
export type ProcessingParty = {id:string;nama:string;catatan:string;sumber:string}
export type ProductionPrice = {id:string;nomor:number;jenis:string;produk:string;kode:string;ukuran:string;sku:string;harga:string;catatan:string;sumber:string}
export type ProcessingCatalog = {source_url:string;source_title:string;read_at:string;tukang:ProcessingParty[];supplier:ProcessingParty[];harga_produksi:ProductionPrice[]}
export const getProcessingData = async () => (await api.get<{data:ProcessingCatalog|null;imported_at?:string}>('/processing/data')).data
export const importProcessingData = async (payload:unknown) => (await api.post('/processing/import',payload)).data
