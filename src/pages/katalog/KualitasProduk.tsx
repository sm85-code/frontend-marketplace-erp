import Spinner from '@/components/Spinner'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/api/management'
import { Button } from '@/components/ui/button'
import QueryError from '@/components/QueryError'
const levels = ['Tidak tersedia', 'Perlu diperbaiki', 'Memenuhi standar', 'Sangat baik']
const issues: Record<number, string> = { 1: 'Foto kurang', 2: 'Kategori', 3: 'Atribut kurang', 4: 'Panduan ukuran', 5: 'Varian standar', 6: 'Merek', 7: 'Deskripsi', 8: 'Judul', 9: 'Berat', 10: 'Video', 11: 'Kelengkapan atribut' }
export default function KualitasProduk({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['diagnosis-produk', id], queryFn: () => api.diagnosis(id), retry: false })
  return <section className="space-y-3 rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Kualitas Konten Produk</h2><Button variant="outline" disabled={q.isFetching} onClick={() => void q.refetch()}>Periksa ulang</Button></div>{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.isPending && <Spinner column label="Memuat diagnosis Shopee…" />}{q.data?.success_item_list.map(r => <div key={r.item_id} className="space-y-2"><p className="font-medium">{levels[r.quality_level]} · Penilaian Shopee</p>{r.unfinished_task.length ? <ul className="space-y-2">{r.unfinished_task.map((t, i) => <li key={`${t.issue_type}:${i}`} className="rounded-lg bg-muted p-3"><span className="font-medium">{issues[t.issue_type] ?? `Masalah ${t.issue_type}`}</span><p className="mt-1 text-sm break-words">{t.suggestion}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Tidak ada tugas perbaikan yang dikembalikan Shopee.</p>}</div>)}{q.data?.failure_item_list.map(r => <p role="alert" key={r.item_id}>{r.failed_reason}</p>)}</section>
}
