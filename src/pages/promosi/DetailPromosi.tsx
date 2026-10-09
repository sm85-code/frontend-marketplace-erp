import UbahPromosiForm from './UbahPromosiForm'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { PromosiBarang } from '@/api/types'
import { TabelData, type KolomTabel } from '@/components/daftar'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'

import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ConfirmProvider'
import { hargaPromosi, labelPromosi } from '@/lib/promosi'
import { waktuRetur } from '@/lib/retur'
import BarangPromosiForm from './BarangPromosiForm'

const columns: KolomTabel<PromosiBarang>[] = [
  { kunci: 'nama', judul: 'Produk', tetap: true, kelas: 'min-w-[180px]', sel: (b) => b.nama },
  { kunci: 'varian', judul: 'Varian', sel: (b) => b.nama_varian || 'Tanpa varian' },
  { kunci: 'asli', judul: 'Harga Asli', rata: 'kanan', sel: (b) => hargaPromosi(b.harga_asli) },
  { kunci: 'promo', judul: 'Harga Promo', rata: 'kanan', sel: (b) => hargaPromosi(b.harga_promo) },
  { kunci: 'stok', judul: 'Stok Promo Shopee', sel: (b) => b.stok_promo ?? '—' },
  { kunci: 'batas', judul: 'Batas Pembelian', sel: (b) => b.batas_pembelian === 0 ? 'Tanpa batas' : b.batas_pembelian ?? '—' },
]
export default function DetailPromosi({ akun, id, close }: { akun: string; id: string; close: () => void }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [halaman, setHalaman] = useState(1)
  const [finished, setFinished] = useState(false)
  const [editPending, setEditPending] = useState(false)
  const [barangPending, setBarangPending] = useState(false)
  const detail = useQuery({ queryKey: ['promosi', akun, 'detail', id, halaman], queryFn: () => api.getPromosi(akun, id, halaman), retry: false })
  const end = useMutation({
    retry: false,
    mutationFn: (hapus: boolean) => api.akhiriPromosi(akun, id, hapus),
    onSuccess: () => { setFinished(true); qc.invalidateQueries({ queryKey: ['promosi', akun] }) },
  })
  async function finish(hapus: boolean) {
    if (await confirm({ title: hapus ? 'Hapus promosi dari Shopee?' : 'Akhiri promosi di Shopee?', description: `${detail.data?.nama}. Diskon produk terkait akan dihentikan. Stok ERP tidak berubah.`, destructive: true })) end.mutate(hapus)
  }
  const p = detail.data
  return <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{p?.nama ?? `Promosi #${id}`}</h1><Button variant="outline" disabled={end.isPending||barangPending||editPending} onClick={close}>Kembali ke Promosi</Button></div>
    {detail.error ? <QueryError error={detail.error} retry={detail.refetch} /> : !p ? <Spinner column label="Memuat detail…" /> : <div className="space-y-4 text-sm">
      <p>{labelPromosi(p.status)} · {waktuRetur(p.mulai_at)} — {waktuRetur(p.selesai_at)}</p>
      <p className="text-muted-foreground">Harga dalam mata uang toko Shopee. Pilih produk/varian tepat sebelum mengubah diskon. Gunakan pencarian jika produk belum terlihat.</p>
      {p.barang.length === 0 ? <p className="rounded-lg border bg-card p-3">Belum ada produk dalam promosi ini. Gunakan formulir di bawah untuk menambahkan produk/varian dan harga diskonnya.</p> : <TabelData label="Produk promosi" items={p.barang} kolom={columns} idDari={(b) => `${b.item_id}:${b.model_id}`} namaDari={(b) => b.nama} />}
      <div className="flex justify-between gap-2"><Button variant="outline" disabled={halaman <= 1 || detail.isFetching} onClick={() => setHalaman(halaman - 1)}>Sebelumnya</Button><span>Halaman produk {halaman}</span><Button variant="outline" disabled={!p.ada_lagi || detail.isFetching} onClick={() => setHalaman(halaman + 1)}>Berikutnya</Button></div>
      {!finished && <BarangPromosiForm akun={akun} id={id} blocked={end.isPending || editPending} onPending={setBarangPending} />}
      <div className="flex flex-wrap gap-2">
        <UbahPromosiForm akun={akun} promosi={p} blocked={end.isPending || barangPending || finished} onPending={setEditPending} />
        <Button variant="destructive" disabled={end.isPending || barangPending || editPending || finished} onClick={() => finish(false)}>Akhiri Promosi</Button>
        <Button variant="outline" disabled={end.isPending || barangPending || editPending || finished} onClick={() => finish(true)}>Hapus Promosi</Button>
        <Button variant="outline" disabled={detail.isFetching || end.isPending || barangPending || editPending} onClick={() => { void detail.refetch() }}>Segarkan Detail</Button>
      </div>
      <p className="text-muted-foreground">Hapus dipakai untuk promosi yang belum dimulai. Shopee memeriksa kelayakan tindakan; bila ditolak, pesan dan request ID ditampilkan.</p>
    </div>}
    {end.error && <p role="alert" className="break-words text-sm text-destructive">{getApiError(end.error)} Segarkan sebelum mencoba ulang.</p>}
    {end.data && <p role="status" className="text-sm">Perubahan dikonfirmasi Shopee. {end.data.warnings.join(' ')}</p>}
  </div>
}
