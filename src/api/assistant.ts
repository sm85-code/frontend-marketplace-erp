import api from './client'
export type AiMode = 'tanya' | 'perintah'
export type AiAgent = 'auto' | 'operasional' | 'iklan' | 'coding' | 'desainer'
export interface AiAction { id: string; tool: string; label: string; is_write: boolean; status: 'draft'|'confirmed'|'cancelled'|'running'|'succeeded'|'rejected'|'failed'|'unknown'|'reviewed'; arguments: Record<string, unknown>; result: unknown }
export interface AiTurn { id: string; conversation_id: string; akun_id: string|null; mode: AiMode; prompt: string; status: 'queued'|'running'|'completed'|'partial'|'failed'|'unknown'; answer: string; model: string; input_tokens: number; output_tokens: number; cost_usd: string; created_at: string; finished_at: string|null; actions: AiAction[] }
export interface AiRequest { operation_id: string; conversation_id: string|null; akun_id: string|null; mode: AiMode; agent?: AiAgent; prompt: string; context?: {path:string;resource_id?:string} }
export interface AiStatus { manager?: {available:boolean;model:string}; specialist?: {available:boolean;model:string}; llm_available?: boolean; writes_require_confirmation?: boolean; usd_idr?: string; unresolved?: {id:string;tool:string;akun_id:string|null}[]; available: boolean; model: string; daily_usd: string; turn_usd: string; spent_usd: string; reserved_usd: string; daily_turns: number; used_turns: number; max_writes: number; designer?: AiDesigner; capabilities: {name: string; write: boolean; description: string}[] }
export const assistantStatus = () => api.get<AiStatus>('/asisten/status').then(r=>r.data)
export const conversations = (halaman: number) => api.get<{items: {id: string; title: string; created_at: string}[]; ada_lagi: boolean}>('/asisten/percakapan',{params:{halaman}}).then(r=>r.data)
export const history = (id: string, halaman=1) => api.get<{items: AiTurn[]; ada_lagi: boolean}>(`/asisten/percakapan/${encodeURIComponent(id)}`,{params:{halaman}}).then(r=>r.data)
export const sendMessage = (body: AiRequest) => api.post<AiTurn>('/asisten/pesan',body,{timeout:20000}).then(r=>r.data)
export const activeTurn = (turn: AiTurn) => turn.status==='queued'||turn.status==='running'
export const decideAction = (id: string, decision: 'confirm'|'cancel', all_variants=false) => api.post<AiTurn>(`/asisten/tindakan/${encodeURIComponent(id)}/keputusan`,{decision,all_variants},{timeout:20000}).then(r=>r.data)

export const resolveAction = (id: string,note: string) => api.post(`/asisten/tindakan/${encodeURIComponent(id)}/selesai-periksa`,{note}).then(r=>r.data)

export interface AiDesigner { prompt: string; prompt_bawaan: string; penyedia: 'otomatis'|'anthropic'|'openai'; model_anthropic: string; model_openai: string; pilihan_model_anthropic: string[]; pilihan_model_openai: string[]; riset_tersedia: boolean; foto_tersedia: boolean; anthropic_tersedia: boolean; openai_tersedia: boolean }
export interface AiProductDraft { id: string; akun_id: string|null; nama: string; deskripsi: string; kategori: string; category_id: number|null; atribut: {nama:string;nilai:string}[]; harga_saran: string; stok: number; berat_kg: string; gambar_ids: string[]; sumber: string[]; catatan_harga: string }
/** AI photos are behind the admin session, so they are fetched with the API client and shown as blob URLs. */
export const aiImage = (id: string) => api.get<Blob>(`/asisten/gambar/${encodeURIComponent(id)}`,{responseType:'blob'}).then(r=>r.data)
export const productDraft = (id: string) => api.get<AiProductDraft>(`/asisten/draf-produk/${encodeURIComponent(id)}`).then(r=>r.data)
