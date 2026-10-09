import api from './client'
export type AiMode = 'tanya' | 'perintah'
export interface AiAction { id: string; tool: string; label: string; is_write: boolean; status: 'running'|'succeeded'|'rejected'|'failed'|'unknown'|'reviewed'; arguments: Record<string, unknown>; result: unknown }
export interface AiTurn { id: string; conversation_id: string; akun_id: string|null; mode: AiMode; prompt: string; status: 'queued'|'running'|'completed'|'partial'|'failed'|'unknown'; answer: string; model: string; input_tokens: number; output_tokens: number; cost_usd: string; created_at: string; finished_at: string|null; actions: AiAction[] }
export interface AiRequest { operation_id: string; conversation_id: string|null; akun_id: string|null; mode: AiMode; prompt: string }
export interface AiStatus { usd_idr?: string; unresolved?: {id:string;tool:string;akun_id:string|null}[]; available: boolean; model: string; daily_usd: string; turn_usd: string; spent_usd: string; reserved_usd: string; daily_turns: number; used_turns: number; max_writes: number; capabilities: {name: string; write: boolean; description: string}[] }
export const assistantStatus = () => api.get<AiStatus>('/asisten/status').then(r=>r.data)
export const conversations = (halaman: number) => api.get<{items: {id: string; title: string; created_at: string}[]; ada_lagi: boolean}>('/asisten/percakapan',{params:{halaman}}).then(r=>r.data)
export const history = (id: string, halaman=1) => api.get<{items: AiTurn[]; ada_lagi: boolean}>(`/asisten/percakapan/${encodeURIComponent(id)}`,{params:{halaman}}).then(r=>r.data)
export const sendMessage = (body: AiRequest) => api.post<AiTurn>('/asisten/pesan',body,{timeout:20000}).then(r=>r.data)
export const activeTurn = (turn: AiTurn) => turn.status==='queued'||turn.status==='running'

export const resolveAction = (id: string,note: string) => api.post(`/asisten/tindakan/${encodeURIComponent(id)}/selesai-periksa`,{note}).then(r=>r.data)
