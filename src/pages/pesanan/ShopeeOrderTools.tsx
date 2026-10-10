import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/commerce'
import { fmtDateTime, fmtMoney, getApiError } from '@/api/client'
import type { Pesanan } from '@/api/types'
import { useAuth } from '@/lib/auth'
import { useConfirm } from '@/components/ConfirmProvider'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const incomeLabels: Record<string, string> = { original_price: 'Harga awal', original_cost_of_goods_sold: 'Nilai barang', seller_discount: 'Diskon penjual', seller_voucher: 'Voucher penjual', commission_fee: 'Komisi', service_fee: 'Biaya layanan', seller_transaction_fee: 'Biaya transaksi', actual_shipping_fee: 'Ongkir aktual', escrow_amount: 'Pendapatan bersih', final_shipping_fee: 'Ongkir akhir', buyer_total_amount: 'Total pembayaran pembeli' }
export default function ShopeeOrderTools({ order }: { order: Pesanan }) {
  const { user } = useAuth()
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [packageNumber, setPackageNumber] = useState('')
  const [appliedPackage, setAppliedPackage] = useState('')
  const tracking = useQuery({ queryKey: ['order-tracking', order.id, appliedPackage], queryFn: () => api.tracking(order.id, appliedPackage), enabled: trackingOpen, retry: false })
  const income = useQuery({ queryKey: ['order-income', order.id], queryFn: () => api.orderIncome(order.id), enabled: incomeOpen && user?.role === 'admin', retry: false })
  return <section className="space-y-3 rounded-xl border bg-card p-4"><Note key={order.note ?? ''} order={order} /><details onToggle={e => setTrackingOpen(e.currentTarget.open)}><summary className="cursor-pointer py-2 font-medium">Pelacakan pengiriman</summary>{trackingOpen && <div className="space-y-3 pt-2"><form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (packageNumber === appliedPackage) void tracking.refetch(); else setAppliedPackage(packageNumber) }}><div className="min-w-0 flex-1 space-y-1"><Label htmlFor="tracking-package">Nomor paket · opsional</Label><Input id="tracking-package" value={packageNumber} maxLength={100} onChange={e => setPackageNumber(e.target.value)} /></div><Button type="submit" variant="outline" disabled={tracking.isFetching}>Refresh</Button></form>{tracking.isPending && <Spinner column />}{tracking.error && <QueryError error={tracking.error} retry={tracking.refetch} />}{tracking.data && <><p className="text-sm font-medium">{tracking.data.logistics_status}</p><ol className="space-y-2">{[...tracking.data.tracking_info].sort((a, b) => b.update_time - a.update_time).map((r, i) => <li key={`${r.update_time}:${i}`} className="rounded-lg bg-muted p-3"><p className="break-words">{r.description}</p><p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(new Date(r.update_time * 1000).toISOString())} WIB</p></li>)}</ol>{!tracking.data.tracking_info.length && <p className="text-sm text-muted-foreground">Belum ada riwayat pengiriman.</p>}</>}</div>}</details>{user?.role === 'admin' && <details onToggle={e => setIncomeOpen(e.currentTarget.open)}><summary className="cursor-pointer py-2 font-medium">Rincian pendapatan Shopee</summary>{incomeOpen && <div className="space-y-2 pt-2">{income.isPending && <Spinner column />}{income.error && <QueryError error={income.error} retry={income.refetch} />}{income.data && <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(incomeLabels).filter(([key]) => income.data!.order_income[key] != null).map(([key, label]) => <div key={key} className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-nowrap font-medium">{fmtMoney(String(income.data!.order_income[key]), order.currency)}</dd></div>)}</dl>}</div>}</details>}</section>
}
function Note({ order }: { order: Pesanan }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(order.note ?? '')
  const confirm = useConfirm(), qc = useQueryClient()
  const m = useMutation({ retry: false, mutationFn: () => api.setNote(order.id, note), onSuccess: result => { toast.success('Catatan penjual disimpan di Shopee'); result.warnings.forEach(w => toast.warning(w)); void qc.invalidateQueries({ queryKey: ['pesanan'] }); setEditing(false) } })
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><h2 className="font-medium">Catatan internal penjual</h2><Button variant="outline" size="sm" disabled={m.isPending} onClick={() => setEditing(v => !v)}>{editing ? 'Batal' : 'Edit catatan'}</Button></div>{editing ? <form className="space-y-2" onSubmit={async e => { e.preventDefault(); if (await confirm({ title: 'Simpan catatan penjual ke Shopee?', description: order.id_eksternal })) m.mutate() }}><Textarea aria-label="Catatan internal penjual" maxLength={500} value={note} disabled={m.isPending} onChange={e => setNote(e.target.value)} />{m.error && <p role="alert" className="text-sm text-destructive">{getApiError(m.error)}</p>}<Button type="submit" disabled={m.isPending || note === (order.note ?? '')}>Simpan ke Shopee</Button></form> : <p className="rounded-lg bg-muted p-3 whitespace-pre-wrap break-words font-semibold">{order.note || '—'}</p>}</div>
}
