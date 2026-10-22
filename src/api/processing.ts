import api from './client'
export type ProcessingParty = {
  id: string
  nama: string
  alamat?: string
  keahlian?: string
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
  active?: boolean
  in_use?: boolean
  id: string
  kind: 'produksi' | 'pengecatan' | 'non_kayu' | 'packing'
  version: number
  jenis?: string
  kode?: string
  warna?: string
  color_id?: string
  production_price_id?: string
  packing_type?: 'biasa' | 'kayu'
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
  /** Manual products: any variants (name + value); `ukuran` is their one-line summary. */
  varian?: { nama: string; nilai: string }[]
  /** Empty only for manual products whose price is still to come. */
  harga?: string
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
/** A line of Cek Pesanan: an order item, with its mapping when it already has one (filter "dipetakan"). */
export type CandidateStatus = 'menunggu' | 'dikirim' | 'selesai' | 'semua' | 'dipetakan'
export type ProcessingCandidateItem = ProcessingCandidate & {
  status?: string
  job?: { id: string; version: number; route: 'tukang' | 'supplier'; stage: string; cancelled: boolean } | null
}
export type ProcessingStage = 'draft' | 'produksi' | 'supplier' | 'pengecatan' | 'packing' | 'siap_kirim'
export type ProcessingJob = Omit<ProcessingCandidate, 'item_id'> & {
  /** The order item the job was made from; absent for a legacy hand-typed job. */
  item_id?: string
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
  /** Packing is done once, by us or by a supplier (any supplier); a supplier is named so it gets paid. */
  packing_by?: 'internal' | 'supplier'
  packing_party_id?: string
  packing_party_name?: string
  production_done_at: string | null
  received_at: string | null
  painting_done_at: string | null
  packing_done_at: string | null
  production_total: string
  paint_total: string
  packing_total: string
  process_fee: string
  /** Ordinary packing of a painted wood product for a reseller is inside the paint price: not paid or billed apart. */
  packing_termasuk_cat?: boolean
  /** Reseller bill in components: the product, paint with ordinary packing, wood packing, and the process fee. */
  harga_produk_total?: string | null
  cat_packing_total?: string | null
  packing_kayu_total?: string
  reseller_total: string | null
  order_cancelled: boolean
  reference?: string
  seller_code?: string
  production_reference?: ProcessingPrice | null
  painting_reference?: ProcessingPrice | null
  production_sku?: string
  manual_order_code?: string
  catalog_mode?: 'manual' | 'otomatis'
  supplier_product_id?: string
  supplier_product_name?: string
  supplier_sku?: string
  supplier_reference?: SupplierCatalogProduct & { read_at: string }
  refresh_catalog_price?: boolean
  events: { action: string; actor: string; at: string }[]
}
export type ProcessingJobEdit = Pick<
  ProcessingJob,
  | 'version'
  | 'party_id'
  | 'price_id'
  | 'production_price'
  | 'production_sku'
  | 'catalog_mode'
  | 'supplier_product_id'
  | 'supplier_product_name'
  | 'supplier_sku'
  | 'refresh_catalog_price'
  | 'color'
  | 'paint_price_id'
  | 'paint_price'
  | 'packing_type'
  | 'packing_price'
  | 'packing_by'
  | 'packing_party_id'
>
export const getProcessingPrices = async () =>
  (await api.get<{ items: ProcessingPrice[] }>('/processing/prices')).data
export const getProcessingCatalogPrices = async () =>
  (await api.get<{ items: ProcessingPrice[] }>('/processing/prices', { params: { include_inactive: true } })).data
export const retireProcessingPrice = async (price: ProcessingPrice) =>
  (await api.delete<{ action: 'deleted' | 'deactivated' }>(`/processing/prices/${encodeURIComponent(price.id)}`, { params: { version: price.version } })).data
export const activateProcessingPrice = async (price: ProcessingPrice) =>
  (await api.post(`/processing/prices/${encodeURIComponent(price.id)}/activate`, null, { params: { version: price.version } })).data
export const saveProcessingPrice = async (price: ProcessingPrice) => {
  const { id, version, kind, produk, sku, ukuran, harga, catatan, jenis, warna, structure_model_id, packing_type, color_id, production_price_id, varian } = price
  return (
    await api.put(`/processing/prices/${encodeURIComponent(id)}`, {
      version,
      kind,
      produk,
      sku,
      ukuran,
      ...(kind === 'non_kayu' && !harga ? {} : { harga }),
      catatan,
      ...(kind === 'packing' ? { packing_type: packing_type || 'biasa' } : {}),
      ...(kind === 'non_kayu' ? { varian: varian ?? [] } : {}),
      ...(kind === 'produksi' ? { jenis: jenis ?? '', ...(structure_model_id ? { structure_model_id } : {}) } : kind === 'pengecatan' ? { warna: warna ?? '', ...(color_id ? { color_id } : {}), ...(production_price_id !== undefined ? { production_price_id } : {}) } : {}),
    })
  ).data
}
export const saveBulkProductionStructure = async (structure_model_id: string, items: { id: string; version: number; ukuran: string; harga: string }[]) =>
  (await api.post<{ count: number }>('/processing/prices/bulk-structure', { structure_model_id, items })).data
export const getProcessingJobs = async () =>
  (await api.get<{ items: ProcessingJob[] }>('/processing/jobs')).data
export const getProcessingCandidates = async (q: string, page: number, status: CandidateStatus = 'menunggu') =>
  (
    await api.get<{ items: ProcessingCandidateItem[]; total: number; page: number; per_page?: number }>('/processing/candidates', {
      params: { q, page, status },
    })
  ).data
/** Cancel the mapping of a manual order: it goes back to a draft, the order itself stays. */
export const resetProcessingJob = async (job: { id: string; version: number }) =>
  (await api.post(`/processing/jobs/${job.id}/reset`, null, { params: { version: job.version } })).data
export const releaseProcessingJob = async (job: { id: string; version: number }) =>
  (await api.post(`/processing/jobs/${job.id}/release`, null, { params: { version: job.version } })).data
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
  packing_by: 'internal' | 'supplier' = 'internal',
  packing_party_id = '',
) =>
  (await api.put(`/processing/jobs/${job.id}/packing`, { version: job.version, packing_type, packing_price, packing_by, packing_party_id }))
    .data

export const saveProcessingParty = async (kind: 'tukang' | 'supplier', party: ProcessingParty) =>
  (
    await api.put(`/processing/parties/${kind}/${encodeURIComponent(party.id)}`, {
      version: party.version ?? 0,
      nama: party.nama,
      keahlian: party.keahlian ?? '',
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

export type SupplierCatalogProduct = { id: string; sku: string; name: string; category_name: string; unit_of_measure: string; sell_price: string; qty_on_hand: number }
export type SupplierCatalog = { unit_id: string; unit_name: string; read_at: string; items: SupplierCatalogProduct[] }
export const getSupplierCatalogConnection = async () => (await api.get<{connected: boolean; unit_name?: string}>('/processing/supplier-catalog/connection')).data
export const getSupplierCatalog = async () => (await api.get<SupplierCatalog>('/processing/supplier-catalog')).data
export const connectSupplierCatalog = async (username: string, password: string) => (await api.post('/processing/supplier-catalog/connect', {username, password})).data
export const disconnectSupplierCatalog = async () => (await api.delete('/processing/supplier-catalog/connection')).data

export type PaintColor = { id: string; name: string; version: number }
export const getPaintColors = async () => (await api.get<{ items: PaintColor[] }>('/processing/paint-colors')).data
export const savePaintColor = async ({id, ...body}: PaintColor) => (await api.put(`/processing/paint-colors/${encodeURIComponent(id)}`, body)).data
