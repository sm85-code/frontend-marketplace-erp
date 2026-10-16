import api from './client'
export type ProcessingParty = {
  id: string
  nama: string
  alamat?: string
  no_wa?: string
  no_rekening?: string
  nama_bank?: string
  catatan: string
  sumber: string
  version?: number
}
export type ProductionPrice = {
  id: string
  nomor: number
  jenis: string
  produk: string
  kode: string
  ukuran: string
  sku: string
  harga: string
  catatan: string
  sumber: string
}
export type ProcessingCatalog = {
  source_url: string
  source_title: string
  read_at: string
  tukang: ProcessingParty[]
  supplier: ProcessingParty[]
  harga_produksi: ProductionPrice[]
}
export const getProcessingData = async () =>
  (await api.get<{ data: ProcessingCatalog | null; imported_at?: string }>('/processing/data')).data
export const importProcessingData = async (payload: unknown) =>
  (await api.post('/processing/import', payload)).data

export type ProcessingPrice = {
  id: string
  kind: 'produksi' | 'pengecatan'
  version: number
  jenis?: string
  warna?: string
  structure_model_id?: string
  category_id?: string
  product_id?: string
  kategori_kode?: string
  sku_induk?: string
  model?: string
  model_kode?: string
  produk: string
  sku: string
  ukuran: string
  harga: string
  catatan: string
  sumber?: string
}
export type ProcessingCandidate = {
  item_id: string
  order_id: string
  order_number: string
  shop: string
  customer: string
  produk: string
  varian: string
  qty: number
  foto: string | null
  ordered_at: string
  deadline: string | null
  note: string
  source: 'erp' | 'reseller' | 'internal'
}
export type ProcessingStage = 'draft' | 'produksi' | 'supplier' | 'pengecatan' | 'packing' | 'siap_kirim'
export type ProcessingJob = Omit<ProcessingCandidate, 'item_id'> & {
  id: string
  version: number
  route: 'tukang' | 'supplier'
  stage: ProcessingStage
  color: string
  party_id: string
  party_name: string
  price_id: string
  production_price: string | null
  paint_price_id: string
  paint_price: string
  packing_type: 'biasa' | 'kayu'
  packing_price: string
  production_done_at: string | null
  received_at: string | null
  painting_done_at: string | null
  packing_done_at: string | null
  production_total: string
  paint_total: string
  packing_total: string
  process_fee: string
  reseller_total: string | null
  order_cancelled: boolean
  reference?: string
  events: { action: string; actor: string; at: string }[]
}
export type ProcessingJobEdit = Pick<
  ProcessingJob,
  | 'version'
  | 'party_id'
  | 'price_id'
  | 'production_price'
  | 'color'
  | 'paint_price_id'
  | 'paint_price'
  | 'packing_type'
  | 'packing_price'
>
export const getProcessingPrices = async () =>
  (await api.get<{ items: ProcessingPrice[] }>('/processing/prices')).data
export const saveProcessingPrice = async (price: ProcessingPrice) => {
  const { id, version, kind, produk, sku, ukuran, harga, catatan, jenis, warna, structure_model_id } = price
  return (
    await api.put(`/processing/prices/${encodeURIComponent(id)}`, {
      version,
      kind,
      produk,
      sku,
      ukuran,
      harga,
      catatan,
      ...(kind === 'produksi' ? { jenis: jenis ?? '', ...(structure_model_id ? { structure_model_id } : {}) } : { warna: warna ?? '' }),
    })
  ).data
}
export const getProcessingJobs = async () =>
  (await api.get<{ items: ProcessingJob[] }>('/processing/jobs')).data
export const getProcessingCandidates = async (q: string, page: number) =>
  (
    await api.get<{ items: ProcessingCandidate[]; total: number; page: number }>('/processing/candidates', {
      params: { q, page },
    })
  ).data
export const selectProcessingItems = async (route: 'tukang' | 'supplier', item_ids: string[]) =>
  (await api.post('/processing/jobs/select', { route, item_ids })).data
export const createManualProcessingOrder = async (payload: unknown) =>
  (await api.post('/processing/jobs/manual', payload)).data
export const editProcessingJob = async (id: string, payload: ProcessingJobEdit) =>
  (await api.put(`/processing/jobs/${id}`, payload)).data
export const transitionProcessingJob = async (
  job: ProcessingJob,
  stage: Exclude<ProcessingStage, 'draft' | 'siap_kirim'>,
  reopen = false,
) => (await api.post(`/processing/jobs/${job.id}/transition`, { version: job.version, stage, reopen })).data
export const removeProcessingDraft = async (job: ProcessingJob) =>
  (await api.delete(`/processing/jobs/${job.id}`, { params: { version: job.version } })).data
export const editProcessingPacking = async (
  job: ProcessingJob,
  packing_type: 'biasa' | 'kayu',
  packing_price: string,
) =>
  (await api.put(`/processing/jobs/${job.id}/packing`, { version: job.version, packing_type, packing_price }))
    .data

export const saveProcessingParty = async (kind: 'tukang' | 'supplier', party: ProcessingParty) =>
  (
    await api.put(`/processing/parties/${kind}/${encodeURIComponent(party.id)}`, {
      version: party.version ?? 0,
      nama: party.nama,
      alamat: party.alamat ?? '',
      no_wa: party.no_wa ?? '',
      no_rekening: party.no_rekening ?? '',
      nama_bank: party.nama_bank ?? '',
      catatan: party.catatan,
    })
  ).data

export type ProductionStructureNode = {
  id: string
  kind: 'kategori' | 'produk' | 'model'
  parent_id: string
  code: string
  name: string
  version: number
}
export const getProductionStructure = async () =>
  (await api.get<{ items: ProductionStructureNode[] }>('/processing/production-structure')).data
export const saveProductionStructure = async (node: ProductionStructureNode) => {
  const { id, ...body } = node
  return (await api.put(`/processing/production-structure/${encodeURIComponent(id)}`, body)).data
}
