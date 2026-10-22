import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { assistantStatus } from '@/api/assistant'
import { getApiError } from '@/api/client'
import { useUbahTeks } from '@/api/pengaturanUi'
import InfoTip from '@/components/InfoTip'
import PilihNative from '@/components/PilihNative'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const ID = { prompt: 'ai:desainer:prompt', penyedia: 'ai:penyedia', anthropic: 'ai:model:anthropic', openai: 'ai:model:openai' }
const selectClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm'

/** Kelola Aplikasi › Asisten AI: provider, models and the product-designer playbook. Keys stay on the server. */
export default function PengaturanAsistenAI({ data, bisaUbah }: { data: Record<string, string>; bisaUbah: boolean }) {
  const status = useQuery({ queryKey: ['assistant-status'], queryFn: assistantStatus })
  const qc = useQueryClient()
  const ubah = useUbahTeks()
  const d = status.data?.designer
  const [draf, setDraf] = useState<string | null>(null)
  const prompt = draf ?? d?.prompt ?? ''
  const simpan = (id: string, teks: string | null) => ubah.mutate({ id, teks }, {
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['assistant-status'] }); toast.success('Tersimpan') },
    onError: (e) => toast.error(getApiError(e)),
  })
  if (status.isLoading) return <Spinner label="Memuat pengaturan AI…" />
  if (status.error) return <QueryError error={status.error} retry={status.refetch} />
  if (!d) return <p className="text-sm text-muted-foreground">Pengaturan desainer belum tersedia di server.</p>
  const kunci = [!d.anthropic_tersedia && 'ANTHROPIC_API_KEY', !d.openai_tersedia && 'OPENAI_API_KEY'].filter(Boolean)
  return <Card><CardContent className="space-y-4 pt-4">
    {kunci.length > 0 && <p role="alert" className="flex items-center gap-1 rounded-lg border border-destructive/40 p-3 text-sm">Kunci API belum dipasang di server: {kunci.join(', ')}<InfoTip teks="Kunci dipasang di pengaturan server (environment), tidak di halaman ini. Riset web memakai Anthropic atau OpenAI; foto produk memakai OpenAI." /></p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="ai-penyedia">Penyedia utama</Label>
        <PilihNative id="ai-penyedia" className={selectClass} disabled={!bisaUbah || ubah.isPending} value={data[ID.penyedia] ?? 'otomatis'} onChange={(e) => simpan(ID.penyedia, e.target.value === 'otomatis' ? null : e.target.value)}>
          <option value="otomatis">Otomatis</option><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option>
        </PilihNative></div>
      <div className="space-y-1"><Label htmlFor="ai-model-anthropic">Model Anthropic</Label>
        <PilihNative id="ai-model-anthropic" className={selectClass} disabled={!bisaUbah || ubah.isPending} value={d.model_anthropic} onChange={(e) => simpan(ID.anthropic, e.target.value)}>
          {d.pilihan_model_anthropic.map((m) => <option key={m} value={m}>{m}</option>)}
        </PilihNative></div>
      <div className="space-y-1"><Label htmlFor="ai-model-openai" className="flex items-center gap-1">Model OpenAI<InfoTip teks="Juga dipakai untuk membuat foto produk." /></Label>
        <PilihNative id="ai-model-openai" className={selectClass} disabled={!bisaUbah || ubah.isPending} value={d.model_openai} onChange={(e) => simpan(ID.openai, e.target.value)}>
          {d.pilihan_model_openai.map((m) => <option key={m} value={m}>{m}</option>)}
        </PilihNative></div>
    </div>
    <div className="space-y-1">
      <Label htmlFor="ai-desainer-prompt" className="flex items-center gap-1">Playbook desainer produk<InfoTip teks="Dipakai saat bidang bantuan Desainer produk. Hasilnya selalu draf; publikasi tetap Anda tekan sendiri di Publikasi." /></Label>
      <Textarea id="ai-desainer-prompt" className="min-h-72 font-mono text-xs" maxLength={8000} disabled={!bisaUbah} value={prompt} onChange={(e) => setDraf(e.target.value)} />
    </div>
    {bisaUbah && <div className="flex flex-wrap justify-end gap-2">
      {data[ID.prompt] !== undefined && <Button type="button" variant="outline" disabled={ubah.isPending} onClick={() => { setDraf(null); simpan(ID.prompt, null) }}>Kembalikan bawaan</Button>}
      <Button type="button" disabled={ubah.isPending || draf === null || !prompt.trim()} onClick={() => simpan(ID.prompt, prompt.trim() === d.prompt_bawaan ? null : prompt)}>Simpan</Button>
    </div>}
  </CardContent></Card>
}
