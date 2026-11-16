import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cacheLembarManual } from '@/lib/financialSheetCache'
import type { LembarManualResponse } from '@/api/financialReports'
import { toast } from 'sonner'

type Row = { id: string; label: string; parent_id: string | null; urut: number; aktif: boolean }
type Structure = { version: number; rows: Row[] }
export default function KelolaBarisKas({ month }: { month: string }) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState(month)
  return <><Button variant="outline" onClick={() => { setPeriod(month); setOpen(true) }}>Kelola Baris Kas</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Kelola Baris Kas</DialogTitle><DialogDescription>Perubahan berlaku pada bulan yang dipilih dan diwariskan ke bulan baru. Bulan tersimpan lainnya tetap utuh.</DialogDescription></DialogHeader>
      <label className="text-sm">Berlaku mulai bulan<Input type="month" value={period} min={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date())} onChange={e => setPeriod(e.target.value)} /></label>
      <Editor key={period} month={period} close={() => setOpen(false)} />
    </DialogContent></Dialog></>
}
function Editor({ month, close }: { month: string; close: () => void }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['kas-structure', month], queryFn: () => api.get<Structure>('/laporan-keuangan/struktur-kas', { params: { periode: month } }).then(r => r.data) })
  const [draft, setDraft] = useState<Row[] | null>(null)
  const rows = draft ?? q.data?.rows ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const edit = (id: string, patch: Partial<Row>) => { setDraft(rows.map(r => r.id === id ? { ...r, ...patch } : r)); setConfirmed(false) }
  const add = (parent_id: string | null) => { const id = `c:${crypto.randomUUID().replaceAll('-', '')}`; setDraft([...rows, { id, label: '', parent_id, urut: rows.length, aktif: true }]); setSelected(id); setConfirmed(false) }
  const move = (row: Row, step: number) => {
    const siblings = rows.filter(r => r.parent_id === row.parent_id).sort((a,b) => a.urut-b.urut)
    const i = siblings.findIndex(r => r.id === row.id), j = i + step
    if (j < 0 || j >= siblings.length) return
    ;[siblings[i], siblings[j]] = [siblings[j], siblings[i]]
    const orders = new Map(siblings.map((r, n) => [r.id, n]))
    setDraft(rows.map(r => orders.has(r.id) ? { ...r, urut: orders.get(r.id)! } : r)); setConfirmed(false)
  }
  const save = useMutation({ mutationFn: () => api.put<LembarManualResponse>('/laporan-keuangan/struktur-kas', { version: q.data!.version, rows }, { params: { periode: month } }).then(r => r.data),
    onSuccess: saved => { cacheLembarManual(qc, month, saved); void qc.invalidateQueries({ queryKey: ['kas-structure'] }); toast.success('Struktur Kas disimpan'); close() }, onError: e => toast.error(getApiError(e)) })
  const parents = rows.filter(r => !r.parent_id).sort((a,b) => a.urut-b.urut)
  const chosen = rows.find(r => r.id === selected)
  return <div className="space-y-3">
    {q.isPending && <p>Memuat struktur…</p>}{q.error && <p role="alert">{getApiError(q.error)}</p>}
    <div className="max-h-60 overflow-y-auto rounded-md border p-2 text-sm" aria-label="Struktur baris Kas">{parents.map(p => <div key={p.id} className="mb-2"><button className="w-full text-left font-medium p-1 hover:bg-muted" onClick={() => setSelected(p.id)}>{p.label || 'Induk baru'}{!p.aktif && ' (arsip)'}</button>{rows.filter(r => r.parent_id === p.id).sort((a,b) => a.urut-b.urut).map(r => <button className="block w-full pl-5 py-1 text-left hover:bg-muted" key={r.id} onClick={() => setSelected(r.id)}>{r.label || 'Subbaris baru'}{!r.aktif && ' (arsip)'}</button>)}</div>)}</div>
    <Button variant="outline" size="sm" disabled={!q.data} onClick={() => add(null)}>Tambah induk</Button>
    {chosen && <div className="space-y-2 rounded-md border p-3">
      <label className="block text-sm">Nama<Input value={chosen.label} maxLength={120} onChange={e => edit(chosen.id, { label: e.target.value })} /></label>
      {chosen.parent_id && <label className="block text-sm">Induk<select className="block w-full rounded-md border p-2 bg-background" value={chosen.parent_id} onChange={e => edit(chosen.id, { parent_id: e.target.value })}>{parents.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => move(chosen,-1)} aria-label="Naikkan urutan">↑</Button><Button size="sm" variant="outline" onClick={() => move(chosen,1)} aria-label="Turunkan urutan">↓</Button>{!chosen.parent_id && <Button size="sm" variant="outline" onClick={() => add(chosen.id)}>Tambah subbaris</Button>}<Button size="sm" variant="outline" onClick={() => edit(chosen.id, { aktif: !chosen.aktif })}>{chosen.aktif ? 'Arsipkan' : 'Aktifkan'}</Button></div>
    </div>}
    <p className="text-xs text-muted-foreground">Pemindahan atau arsip baris yang sudah dicatat dilakukan pada bulan berikutnya. Nilai serta histori tetap disimpan. Bulan berikutnya yang sudah tersimpan dikelola tersendiri.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Saya menyetujui perubahan struktur untuk bulan {month}.</label>
    <Button disabled={!draft || !confirmed || save.isPending || rows.some(r => !r.label.trim())} onClick={() => save.mutate()}>{save.isPending ? 'Menyimpan…' : 'Simpan struktur'}</Button>
  </div>
}
