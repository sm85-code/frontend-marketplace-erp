import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { pesananApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { useConfirm } from '@/components/ConfirmProvider'
import PesananActions from '@/components/PesananActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { akunName, produkName, useAkunList, useById, useProdukList } from '@/hooks/queries'
import { fmtDateTime, fmtNumber, fmtRp } from '@/lib/format'
import { platformLabel, STATUS_PESANAN_LABEL, statusPesananLabel, statusPesananTone } from '@/lib/labels'
import { canDeletePesanan } from '@/lib/pesanan'
import { cn } from '@/lib/utils'

const PIPELINE = ['unpaid', 'to_ship', 'shipped', 'completed'] as const

export default function PesananDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const q = useQuery({ queryKey: qk.pesananDetail(id), queryFn: () => pesananApi.get(id), enabled: Boolean(id) })
  const akunMap = useById(useAkunList().data)
  const produkMap = useById(useProdukList().data)

  const remove = useMutation({
    mutationFn: () => pesananApi.remove(id),
    onSuccess: () => {
      toast.success('Pesanan dihapus')
      qc.invalidateQueries({ queryKey: qk.pesananAll })
      navigate('/pesanan', { replace: true })
    },
    onError: (err) => toast.error(getApiError(err, 'Gagal menghapus pesanan')),
  })

  const back = (
    <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
      <Link to="/pesanan">
        <ArrowLeft /> Kembali ke inbox
      </Link>
    </Button>
  )

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data)
    return (
      <>
        {back}
        <ErrorState message={getApiError(q.error, 'Pesanan tidak ditemukan')} onRetry={() => q.refetch()} />
      </>
    )

  const p = q.data
  const stepIndex = PIPELINE.indexOf(p.status as (typeof PIPELINE)[number])

  return (
    <>
      {back}
      <PageHeader
        title={`Pesanan ${p.id_eksternal}`}
        description={`${platformLabel(p.platform)} · ${akunName(akunMap, p.akun_id)} · dibuat ${fmtDateTime(p.created_at)}`}
        actions={
          <>
            <PesananActions pesanan={p} size="default" />
            {canDeletePesanan(p.status) ? (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Hapus pesanan?',
                    description: 'Hanya pesanan “Belum Bayar” yang boleh dihapus. Untuk yang lain, gunakan Batalkan.',
                    confirmLabel: 'Hapus',
                    destructive: true,
                  })
                  if (ok) remove.mutate()
                }}
              >
                <Trash2 /> Hapus
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Item pesanan</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU induk</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada item
                    </TableCell>
                  </TableRow>
                ) : (
                  p.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.nama_produk}</TableCell>
                      <TableCell className="text-xs">
                        {it.produk_id ? (
                          produkName(produkMap, it.produk_id)
                        ) : (
                          <span className="text-warning">Belum dipetakan</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtRp(it.harga_satuan)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(it.qty)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtRp(it.subtotal)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(p.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <StatusBadge tone={statusPesananTone(p.status)}>{statusPesananLabel(p.status)}</StatusBadge>
              {p.status === 'cancelled' ? (
                <p className="text-muted-foreground">Pesanan dibatalkan.</p>
              ) : (
                <ol className="grid gap-2">
                  {PIPELINE.map((s, i) => (
                    <li key={s} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex size-5 items-center justify-center rounded-full border text-[10px] font-bold',
                          i <= stepIndex ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className={cn(i <= stepIndex ? 'font-medium' : 'text-muted-foreground')}>
                        {STATUS_PESANAN_LABEL[s]}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-xs text-muted-foreground">Diperbarui {fmtDateTime(p.updated_at)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Pembeli</dt>
                <dd>{p.nama_pembeli || '-'}</dd>
                <dt className="text-muted-foreground">Platform</dt>
                <dd>{platformLabel(p.platform)}</dd>
                <dt className="text-muted-foreground">Toko</dt>
                <dd>{akunName(akunMap, p.akun_id)}</dd>
                <dt className="text-muted-foreground">Sinkron</dt>
                <dd>
                  {p.tersinkron_marketplace ? (
                    <StatusBadge tone="success">Tersinkron</StatusBadge>
                  ) : p.catatan_sinkron ? (
                    <StatusBadge tone="warning">Belum sinkron</StatusBadge>
                  ) : (
                    '-'
                  )}
                </dd>
              </dl>
              {p.catatan_sinkron ? (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs">{p.catatan_sinkron}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
