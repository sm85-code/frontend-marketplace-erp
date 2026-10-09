import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { penalties } from '@/api/management'
import { Button } from '@/components/ui/button'
import QueryError from '@/components/QueryError'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
export default function PenaltiToko({ akun }: { akun: string }) {
  const [page, setPage] = useState(1)
  const q = useQuery({ queryKey: ['penalti-toko', akun, page], queryFn: () => penalties(akun, page), retry: false })
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Riwayat Penalti · Kuartal Berjalan</h2>{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.isPending && <p>Memuat riwayat…</p>}{q.data && <><div className="overflow-x-auto rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Waktu (WIB)</TableHead><TableHead>Pelanggaran</TableHead><TableHead>Poin awal</TableHead><TableHead>Poin terkini</TableHead></TableRow></TableHeader><TableBody>{q.data.items.map((r, i) => <TableRow key={r.reference_id ?? i}><TableCell className="whitespace-nowrap">{new Date(r.issue_time * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</TableCell><TableCell>{({5:'Pengiriman terlambat',6:'Pesanan tidak terpenuhi',9:'Listing terlarang',10:'Pelanggaran hak kekayaan intelektual',11:'Spam',21:'Chat tidak dibalas',3058:'Kategori produk salah',4130:'Kualitas produk buruk'} as Record<number,string>)[r.violation_type] ?? `Kode ${r.violation_type}`}</TableCell><TableCell>{r.original_point_num ?? '—'}</TableCell><TableCell>{r.latest_point_num ?? '—'}</TableCell></TableRow>)}</TableBody></Table></div>{q.data.items.length === 0 && <p>Tidak ada riwayat penalti pada halaman ini.</p>}<div className="flex justify-between gap-2"><Button variant="outline" disabled={page === 1 || q.isFetching} onClick={() => setPage(page-1)}>Sebelumnya</Button><span>Halaman {page} · {q.data.total} catatan</span><Button variant="outline" disabled={!q.data.ada_lagi || q.isFetching} onClick={() => setPage(page+1)}>Berikutnya</Button></div></>}</section>
}
