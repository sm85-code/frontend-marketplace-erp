import { PaginasiLanjut } from '@/components/daftar/Paginasi'
import TableShell from '@/components/TableShell'
import Spinner from '@/components/Spinner'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { penalties } from '@/api/management'
import QueryError from '@/components/QueryError'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
export default function PenaltiToko({ akun }: { akun: string }) {
  const [page, setPage] = useState(1)
  const q = useQuery({ queryKey: ['penalti-toko', akun, page], queryFn: () => penalties(akun, page), retry: false })
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Riwayat Penalti · Kuartal Berjalan</h2>{q.error && <QueryError error={q.error} retry={q.refetch} />}{q.isPending && <Spinner column label="Memuat riwayat…" />}{q.data && <>{q.data.items.length ? <TableShell label="Riwayat penalti toko" minWidth={640}><Table><TableHeader><TableRow><TableHead>Waktu (WIB)</TableHead><TableHead>Pelanggaran</TableHead><TableHead className="text-right">Poin awal</TableHead><TableHead className="text-right">Poin terkini</TableHead></TableRow></TableHeader><TableBody>{q.data.items.map((r, i) => <TableRow key={r.reference_id ?? i}><TableCell className="whitespace-nowrap">{new Date(r.issue_time * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</TableCell><TableCell>{({5:'Pengiriman terlambat',6:'Pesanan tidak terpenuhi',9:'Listing terlarang',10:'Pelanggaran hak kekayaan intelektual',11:'Spam',21:'Chat tidak dibalas',3058:'Kategori produk salah',4130:'Kualitas produk buruk'} as Record<number,string>)[r.violation_type] ?? `Kode ${r.violation_type}`}</TableCell><TableCell className="text-right">{r.original_point_num ?? '—'}</TableCell><TableCell className="text-right">{r.latest_point_num ?? '—'}</TableCell></TableRow>)}</TableBody></Table></TableShell> : <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">Tidak ada riwayat penalti pada halaman ini.</p>}{(page > 1 || q.data.ada_lagi) && <nav aria-label="Halaman riwayat penalti" className="paginasi"><PaginasiLanjut halaman={page} bisaMundur={!(page === 1 || q.isFetching)} bisaMaju={!(!q.data.ada_lagi || q.isFetching)} onMundur={() => setPage(page-1)} onMaju={() => setPage(page+1)} /></nav>}</>}</section>
}
