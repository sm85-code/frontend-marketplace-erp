import { PaginasiLanjut } from '@/components/daftar/Paginasi'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import { shopeeDiagnostic } from '@/lib/shopeeDiagnostic'
import { fmtDateTime } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/Spinner'

export function ErrorDetails({ error, result }: { error?: unknown; result?: api.EngagementResult }) {
  const diagnostic = useMemo(() => result?.diagnostic || shopeeDiagnostic(error), [error, result?.diagnostic])
  if (!error && !result?.failures.length) return null
  return <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
    <p>{result?.failures.length ? 'Sebagian atau seluruh item ditolak Shopee. Periksa status sebelum mengirim ulang.'
      : diagnostic?.source === 'erp_permission' ? 'Boost ditolak oleh izin ERP. Hubungi admin untuk akses Katalog Lanjutan.'
      : diagnostic?.source === 'erp_account_scope' ? 'Izin ERP kamu tidak mencakup toko ini. Hubungi admin.'
      : diagnostic?.source === 'erp_account_mismatch' ? 'Produk tidak cocok dengan toko yang dipilih. Muat ulang katalog.'
      : diagnostic?.source === 'shopee_permission' ? 'Izin API Shopee untuk fitur ini ditolak. Hubungi admin aplikasi Shopee Open Platform.'
      : diagnostic?.error === 'http_403' || diagnostic?.source === 'erp_forbidden' ? 'Penyebab penolakan belum terverifikasi. Hubungi dukungan dengan kode pemeriksaan.'
      : 'Hasil belum terkonfirmasi. Periksa status sebelum mengirim ulang.'}</p>
    {diagnostic?.source === 'client_fallback' && <p className="text-xs text-muted-foreground">Kode lokal dari browser, belum tercatat di log server. Sertakan waktu kejadian dan toko saat menghubungi dukungan.</p>}
    {diagnostic && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(diagnostic.diagnostic_id) && <>
      <p className="break-all text-xs">Kode pemeriksaan: {diagnostic.diagnostic_id}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(diagnostic.diagnostic_id).then(() => toast.success('Kode pemeriksaan disalin.'), () => toast.error('Belum dapat menyalin. Salin kode di atas.')) }}>Salin kode pemeriksaan</Button>
    </>}
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
      {boosted.error && <><ErrorDetails error={boosted.error} /><Button variant="ghost" size="sm" onClick={() => void boosted.refetch()}>Refresh status boost</Button></>}
      <ErrorDetails error={boost.error} result={boost.data} />
    </div>}
    {bagian === 'ulasan' && <div className="space-y-3">
      {reviews.isPending && <Spinner column label="Memuat ulasan…" />}
      {reviews.error && <><ErrorDetails error={reviews.error} /><Button variant="outline" size="sm" onClick={() => void reviews.refetch()}>Refresh ulasan</Button></>}
      {reviews.data?.items.map(row => <Review key={row.comment_id} productId={detail.id} row={row} />)}
      {reviews.data && !reviews.data.items.length && <p className="text-sm text-muted-foreground">Tidak ada ulasan pada halaman ini.</p>}
      <div className="flex flex-wrap gap-2"><PaginasiLanjut bisaMundur={!(!previous.length || reviews.isFetching)} bisaMaju={!(!reviews.data?.more || !reviews.data.next_cursor || reviews.data.next_cursor === cursor || reviews.isFetching)} onMundur={() => { setCursor(previous.at(-1) || ''); setPrevious(p => p.slice(0, -1)) }} onMaju={() => { setPrevious(p => [...p, cursor]); setCursor(reviews.data!.next_cursor) }} /></div>
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
