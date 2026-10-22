import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import { shopeeDiagnostic } from '@/lib/shopeeDiagnostic'
import { fmtDateTime, getApiError } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'

export function ErrorDetails({ error, result }: { error?: unknown; result?: api.EngagementResult }) {
  const diagnostic = useMemo(() => result?.diagnostic || shopeeDiagnostic(error), [error, result?.diagnostic])
  if (!error && !result?.failures.length) return null
  return <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
    {!!error && <p>{getApiError(error)}</p>}
    {result?.failures.map(f => <p key={f.item_id || f.comment_id}>{f.item_id ? `Produk ${f.item_id}` : `Ulasan ${f.comment_id}`}: {f.message || f.error}</p>)}
    {diagnostic && <><p className="break-all text-xs">Kode: {diagnostic.error || 'Kegagalan per item'} · Request ID: {diagnostic.request_id || 'tidak tersedia'}</p><details><summary className="cursor-pointer py-2">Rincian untuk pemeriksaan</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(diagnostic, null, 2)}</pre><Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2)).then(() => toast.success('Diagnostik disalin. Bisa dibagikan untuk pemeriksaan.'), () => toast.error('Belum dapat menyalin. Salin teks rincian di atas.')) }}>Salin diagnostik error</Button></details></>}
  </div>
}

/** One part of the engagement tools of a product: `boost` (ask Shopee for more visibility) or `ulasan` (buyer reviews and replies). */
export default function ShopeeEngagement({ detail, bagian }: { detail: KatalogDetail; bagian: 'boost' | 'ulasan' }) {
  const reviewsOpen = bagian === 'ulasan'
  const [cursor, setCursor] = useState('')
  const [previous, setPrevious] = useState<string[]>([])
  const [now, setNow] = useState(Date.now())
  const confirm = useConfirm(), qc = useQueryClient()
  const boosted = useQuery({ queryKey: ['boosted-products', detail.akun_id], queryFn: () => api.boostedProducts(detail.akun_id), retry: false })
  const reviews = useQuery({ queryKey: ['product-comments', detail.id, cursor], queryFn: () => api.productComments(detail.id, cursor), enabled: reviewsOpen, retry: false })
  const seconds = boosted.data?.items.find(p => p.item_id === detail.item_id)?.cool_down_second ?? 0
  const cooldown = Math.max(0, seconds - Math.max(0, Math.floor((now - boosted.dataUpdatedAt) / 1000)))
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const boost = useMutation({ retry: false, mutationFn: () => api.boostProducts(detail.akun_id, [detail.id]), onSuccess: r => {
    if (r.ok) toast.success('Boost produk dikonfirmasi Shopee')
    else toast.warning('Shopee menolak boost. Periksa rincian di bawah.')
    void qc.invalidateQueries({ queryKey: ['boosted-products', detail.akun_id] })
  } })
  return <div>
    {bagian === 'boost' && <div className="space-y-2"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-medium">Boost produk</h3><p className="text-xs text-muted-foreground">{cooldown > 0 ? `Bisa dicoba lagi dalam ${Math.ceil(cooldown / 60)} menit.` : 'Minta Shopee menaikkan visibilitas produk ini.'}</p></div><Button variant="outline" size="sm" disabled={boost.isPending || cooldown > 0 || detail.status === 'SELLER_DELETE'} onClick={async () => { if (await confirm({ title: 'Boost produk ini?', description: `${detail.nama} di ${detail.nama_toko}. Shopee menentukan ketersediaan boost dan cooldown.` })) boost.mutate() }}>{boost.isPending ? 'Mengirim…' : 'Boost produk'}</Button></div>
      {boosted.error && <><ErrorDetails error={boosted.error} /><Button variant="ghost" size="sm" onClick={() => void boosted.refetch()}>Muat ulang status boost</Button></>}
      <ErrorDetails error={boost.error} result={boost.data} />
    </div>}
    {bagian === 'ulasan' && <div className="space-y-3">
      {reviews.isPending && <Spinner column label="Memuat ulasan…" />}
      {reviews.error && <><ErrorDetails error={reviews.error} /><Button variant="outline" size="sm" onClick={() => void reviews.refetch()}>Muat ulang ulasan</Button></>}
      {reviews.data?.items.map(row => <Review key={row.comment_id} productId={detail.id} row={row} />)}
      {reviews.data && !reviews.data.items.length && <p className="text-sm text-muted-foreground">Tidak ada ulasan pada halaman ini.</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!previous.length || reviews.isFetching} onClick={() => { setCursor(previous.at(-1) || ''); setPrevious(p => p.slice(0, -1)) }}>Sebelumnya</Button><Button variant="outline" size="sm" disabled={!reviews.data?.more || !reviews.data.next_cursor || reviews.data.next_cursor === cursor || reviews.isFetching} onClick={() => { setPrevious(p => [...p, cursor]); setCursor(reviews.data!.next_cursor) }}>Berikutnya</Button></div>
      {reviews.data?.more && (!reviews.data.next_cursor || reviews.data.next_cursor === cursor) && <p className="text-xs text-muted-foreground">Shopee belum menyediakan halaman berikutnya. API dapat membatasi ulasan hingga 500; periksa ulasan lain di Seller Centre.</p>}
    </div>}
  </div>
}

function Review({ productId, row }: { productId: string; row: api.ProductComment }) {
  const [text, setText] = useState('')
  const [balas, setBalas] = useState(false) // the reply box opens on demand, so a list of reviews is not a list of empty boxes
  const confirm = useConfirm(), qc = useQueryClient()
  const reply = useMutation({ retry: false, mutationFn: () => api.replyComment(productId, row.comment_id, text.trim()), onSuccess: r => {
    if (r.ok) { toast.success('Balasan dikonfirmasi Shopee'); setText('') }
    else toast.warning('Balasan ditolak Shopee. Periksa rincian di bawah.')
    void qc.invalidateQueries({ queryKey: ['product-comments', productId] })
  } })
  return <div className="space-y-2 rounded-lg border p-3 text-sm"><p className="font-medium">{row.buyer_username || 'Pembeli'} · {row.rating_star == null ? 'Rating tidak tersedia' : `${row.rating_star}/5`}</p><p className="whitespace-pre-wrap break-words">{row.comment || 'Ulasan tanpa teks'}</p>{row.create_time && <p className="text-xs text-muted-foreground">{fmtDateTime(new Date(row.create_time * 1000).toISOString())}</p>}
    {row.reply ? <div className="rounded bg-muted p-2"><p className="font-medium">Balasan toko</p><p className="whitespace-pre-wrap break-words">{row.reply}</p></div> : !balas ? <Button variant="outline" size="sm" onClick={() => setBalas(true)}>Balas ulasan</Button> : <><label className="block">Balasan untuk {row.buyer_username || 'pembeli'}<textarea aria-label={`Balasan ulasan ${row.comment_id}`} className="mt-1 min-h-20 w-full rounded-lg border bg-background p-2" value={text} onChange={e => setText(e.target.value)} maxLength={5000} disabled={reply.isPending} /></label><Button size="sm" disabled={!text.trim() || reply.isPending} onClick={async () => { if (await confirm({ title: 'Kirim balasan ulasan?', description: `Balasan untuk ${row.buyer_username || 'pembeli'}: ${text.trim()}` })) reply.mutate() }}>{reply.isPending ? 'Mengirim…' : 'Kirim balasan'}</Button></>}
    <ErrorDetails error={reply.error} result={reply.data} />
  </div>
}
