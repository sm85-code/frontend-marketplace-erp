import { exportCsv } from '@/lib/exportData'
import { useTokoAktif } from '@/lib/tokoAktif'
import Bantuan from '@/components/Bantuan'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listAkun } from '@/api/endpoints'
import { walletTransactions, type WalletTransaction } from '@/api/workflows'
import { TabelData, type KolomTabel } from '@/components/daftar'
import QueryError from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rentangAwalRetur, validasiRentangRetur, waktuRetur } from '@/lib/retur'
const types: Record<string, string> = {
  WITHDRAWAL_CREATED: 'Penarikan dibuat',
  WITHDRAWAL_COMPLETED: 'Penarikan selesai',
  WITHDRAWAL_CANCELLED: 'Penarikan dibatalkan',
  ESCROW_VERIFIED_ADD: 'Penghasilan pesanan',
  '101': 'Escrow masuk',
  '102': 'Escrow negatif',
  '201': 'Penarikan dibuat',
  '202': 'Penarikan selesai',
  '203': 'Penarikan dibatalkan',
  '401': 'Penyesuaian masuk',
  '402': 'Penyesuaian keluar',
  '450': 'Biaya iklan',
  '451': 'Refund iklan',
}
const money = (v: string | null) => (v === null ? '—' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 8 }))
const columns: KolomTabel<WalletTransaction>[] = [
  { kunci: 'time', judul: 'Waktu (WIB)', tetap: true, kelas: 'whitespace-nowrap', sel: (r) => waktuRetur(r.create_time) },
  {
    kunci: 'type',
    judul: 'Jenis / Status',
    kelas: 'min-w-[180px]',
    sel: (r) => (
      <div title={r.transaction_type}>
        {types[r.transaction_type] || r.transaction_type.replaceAll('_', ' ')}
        <small className="block text-muted-foreground">{r.status === 'COMPLETED' ? 'Selesai' : r.status}</small>
      </div>
    ),
  },
  {
    kunci: 'flow',
    judul: 'Arus dana',
    kelas: 'whitespace-nowrap',
    sel: (r) => (r.money_flow === 'MONEY_IN' ? 'Masuk' : r.money_flow === 'MONEY_OUT' ? 'Keluar' : (r.money_flow ?? '—')),
  },
  { kunci: 'amount', judul: 'Nominal', rata: 'kanan', sel: (r) => money(r.amount) },
  { kunci: 'fee', judul: 'Biaya', rata: 'kanan', sel: (r) => money(r.transaction_fee) },
  { kunci: 'balance', judul: 'Saldo setelah transaksi', rata: 'kanan', sel: (r) => money(r.current_balance) },
  {
    kunci: 'order',
    judul: 'Pesanan / Refund',
    kelas: 'whitespace-nowrap',
    sel: (r) => (
      <div>
        {r.pesanan_id ? (
          <Link className="text-primary underline" to={`/pesanan/${encodeURIComponent(r.pesanan_id)}`}>
            {r.order_sn}
          </Link>
        ) : (
          r.order_sn || '—'
        )}
        <small className="block">{r.refund_sn}</small>
      </div>
    ),
  },
  {
    kunci: 'withdrawal',
    judul: 'Penarikan / Induk',
    kelas: 'whitespace-nowrap tabular-nums',
    sel: (r) => (
      <div>
        {r.withdrawal_id || '—'}
        <small className="block">{r.root_withdrawal_id}</small>
      </div>
    ),
  },
  { kunci: 'description', judul: 'Keterangan', kelas: 'max-w-[320px] whitespace-normal', sel: (r) => r.description || r.reason || '—' },
]
export default function TransaksiDana() {
  const [activeShop]=useTokoAktif(true)
  const [draft, setDraft] = useState({ shop: activeShop, ...rentangAwalRetur() })
  const [filter, setFilter] = useState<(typeof draft & { offset: number }) | null>(null)
  const [previous, setPrevious] = useState<number[]>([])
  const [error, setError] = useState('')
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  const rows = useQuery({
    queryKey: ['wallet', filter],
    queryFn: () => walletTransactions(filter!.shop, { dari: filter!.dari, sampai: filter!.sampai, offset: filter!.offset }),
    enabled: !!filter,
    retry: false,
  })
  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="font-semibold">Transaksi Saldo Penjual Shopee</h2>
      <Bantuan><p className="text-sm text-muted-foreground">
        Mutasi saldo, biaya dan penarikan langsung dari Shopee. Nominal memakai mata uang toko; API transaksi tidak menyertakan kode mata
        uang. Mutasi saldo bukan total pendapatan pesanan. Penarikan dibuat/selesai bukan dua pendapatan berbeda. Tampilan ini tidak
        mengubah pencatatan settlement ERP.
      </p></Bantuan>
      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          const validation = !draft.shop ? 'Pilih toko Shopee.' : validasiRentangRetur(draft.dari, draft.sampai)
          setError(validation || '')
          if (!validation) {
            setPrevious([])
            setFilter({ ...draft, offset: 0 })
          }
        }}
      >
        <div className="grid gap-2">
          <Label className="leading-5" htmlFor="wallet-shop">Toko</Label>
          <select
            id="wallet-shop"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={draft.shop}
            onChange={(e) => setDraft({ ...draft, shop: e.target.value })}
          >
            <option value="">Pilih toko</option>
            {shops.data
              ?.filter((s) => s.platform === 'shopee')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_toko}
                </option>
              ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label className="leading-5" htmlFor="wallet-from">Tanggal awal (WIB)</Label>
          <Input id="wallet-from" type="date" value={draft.dari} onChange={(e) => setDraft({ ...draft, dari: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label className="leading-5" htmlFor="wallet-to">Tanggal akhir (WIB)</Label>
          <Input id="wallet-to" type="date" value={draft.sampai} onChange={(e) => setDraft({ ...draft, sampai: e.target.value })} />
        </div>
        <Button className="self-end" disabled={rows.isFetching}>
          Tampilkan
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
      {rows.data&&<Button variant="outline" onClick={()=>exportCsv(`mutasi-saldo-${filter?.dari}.csv`,[['Waktu WIB','Jenis','Status','Nominal','Biaya','Saldo','Pesanan','Keterangan'],...rows.data!.items.map(r=>[waktuRetur(r.create_time),types[r.transaction_type]??r.transaction_type,r.status,r.amount,r.transaction_fee,r.current_balance,r.order_sn,r.description])])}>Export halaman ini (CSV)</Button>}
      {rows.error && <QueryError error={rows.error} retry={rows.refetch} />}
      {rows.isFetching && <p role="status">Memuat transaksi saldo…</p>}
      {rows.data && !rows.error && filter && (
        <>
          <p className="text-sm">
            {rows.data.nama_toko} · {filter.dari}–{filter.sampai} WIB
          </p>
          <TabelData
            label="Transaksi saldo penjual"
            items={rows.data.items}
            kolom={columns}
            idDari={(r) => `${filter.offset}:${rows.data.items.indexOf(r)}`}
            namaDari={(r) => `${r.transaction_type} ${r.order_sn ?? ''}`}
            minWidth={1150}
          />
          {!rows.data.items.length && <p className="text-sm text-muted-foreground">Tidak ada transaksi pada rentang ini.</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!previous.length || rows.isFetching}
              onClick={() => {
                setFilter({ ...filter, offset: previous[previous.length - 1] })
                setPrevious(previous.slice(0, -1))
              }}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              disabled={!rows.data.ada_lagi || rows.isFetching}
              onClick={() => {
                setPrevious([...previous, filter.offset])
                setFilter({ ...filter, offset: rows.data.next_offset })
              }}
            >
              Berikutnya
            </Button>
            <Button
              variant="outline"
              disabled={rows.isFetching}
              onClick={() => {
                void rows.refetch()
              }}
            >
              Refresh
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
