import { useQueries, useQuery } from '@tanstack/react-query'
import { listAkun } from '@/api/endpoints'
import api, { fmtDateTime, fmtMoney } from '@/api/client'
import { TabelData, type KolomTabel } from '@/components/daftar'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import QueryError from '@/components/QueryError'
import Bantuan from '@/components/Bantuan'
import { getApiError } from '@/api/client'

interface Saldo {
  akun_id: string
  nama_toko: string
  saldo_terakhir: string | null
  transaksi_at: number | null
  diperiksa_at: string
  currency: string | null
  saldo_tersedia: string | null
  saldo_tertahan: string | null
}
export default function SaldoToko() {
  const shops = useQuery({ queryKey: ['akun'], queryFn: () => listAkun() })
  const available = (shops.data ?? []).filter(
    (s) => s.platform === 'shopee' && s.id_toko_eksternal,
  )
  const queries = useQueries({
    queries: available.map((shop) => ({
      queryKey: ['saldo-toko', shop.id],
      queryFn: () =>
        api.get<Saldo>(`/akun/${shop.id}/saldo-toko`).then((r) => r.data),
      retry: false,
      staleTime: 300_000,
    })),
  })
  const rows = available.map((shop, index) => ({ shop, query: queries[index] }))
  type Row = (typeof rows)[number]
  const amount = (
    value: string | null | undefined,
    currency: string | null | undefined,
  ) =>
    value == null ? 'Belum tersedia' : fmtMoney(value, currency ?? undefined)
  const cols: KolomTabel<Row>[] = [
    {
      kunci: 'toko',
      judul: 'Toko',
      tetap: true,
      kelas: 'min-w-[160px]',
      sel: (r) => r.shop.nama_toko,
    },
    {
      kunci: 'saldo',
      judul: 'Saldo terakhir tercatat',
      rata: 'kanan',
      sel: (r) =>
        r.query.isFetching
          ? 'Memuat…'
          : amount(r.query.data?.saldo_terakhir, r.query.data?.currency),
    },
    {
      kunci: 'tersedia',
      judul: 'Tersedia untuk ditarik',
      rata: 'kanan',
      sel: (r) => amount(r.query.data?.saldo_tersedia, r.query.data?.currency),
    },
    {
      kunci: 'tertahan',
      judul: 'Saldo tertahan',
      rata: 'kanan',
      sel: (r) => amount(r.query.data?.saldo_tertahan, r.query.data?.currency),
    },
    {
      kunci: 'waktu',
      judul: 'Waktu transaksi saldo',
      kelas: 'whitespace-nowrap',
      sel: (r) =>
        r.query.data?.transaksi_at
          ? fmtDateTime(
              new Date(r.query.data.transaksi_at * 1000).toISOString(),
            )
          : '—',
    },
    {
      kunci: 'cek',
      judul: 'Terakhir diperiksa',
      kelas: 'whitespace-nowrap',
      sel: (r) =>
        r.query.data?.diperiksa_at
          ? fmtDateTime(r.query.data.diperiksa_at)
          : '—',
    },
    {
      kunci: 'status',
      judul: 'Status data',
      kelas: 'min-w-[180px]',
      sel: (r) =>
        r.query.error ? (
          <span className="text-destructive">{getApiError(r.query.error)}</span>
        ) : r.query.data?.saldo_terakhir == null ? (
          'Tidak ada saldo pada mutasi 15 hari terakhir'
        ) : (
          'Saldo tercatat, bukan konfirmasi saldo siap tarik'
        ),
    },
  ]
  const totals = new Map<string, number>()
  for (const r of rows) {
    const d = r.query.data
    if (!r.query.error && d?.currency && d.saldo_terakhir != null)
      totals.set(
        d.currency,
        (totals.get(d.currency) ?? 0) + Number(d.saldo_terakhir),
      )
  }
  const complete = rows.every(
    (r) =>
      !r.query.error &&
      r.query.data?.saldo_terakhir != null &&
      r.query.data.currency,
  )
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Saldo Toko</h2>
        <Button
          disabled={!rows.length || queries.some((q) => q.isFetching)}
          onClick={() => {
            for (const q of queries) void q.refetch()
          }}
        >
          Sinkronisasi seluruh toko
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Saldo terakhir tercatat; belum merupakan konfirmasi dana siap ditarik.
      </p>
      <Bantuan>
        Saldo berasal dari transaksi terbaru dalam 15 hari terakhir. API yang
        didokumentasikan belum menyediakan saldo tersedia/tertahan. Total
        dipisahkan menurut mata uang dan tidak memasukkan toko yang datanya
        belum tersedia.
      </Bantuan>
      {shops.error && <QueryError error={shops.error} retry={shops.refetch} />}
      <TabelData
        label="Saldo toko"
        minWidth={1280}
        items={rows}
        kolom={cols}
        idDari={(r) => r.shop.id}
        namaDari={(r) => r.shop.nama_toko}
        aksi={(r) => (
          <Button
            variant="outline"
            size="sm"
            disabled={r.query.isFetching}
            onClick={() => void r.query.refetch()}
          >
            Sinkronisasi toko ini
          </Button>
        )}
        footer={
          <TableRow className="font-semibold">
            <TableCell>TOTAL{!complete && ' (data tersedia)'}</TableCell>
            <TableCell className="text-right">
              {totals.size
                ? [...totals].map(([currency, total]) => (
                    <div key={currency}>{fmtMoney(total, currency)}</div>
                  ))
                : 'Belum tersedia'}
            </TableCell>
            <TableCell className="text-right">Belum tersedia</TableCell>
            <TableCell className="text-right">Belum tersedia</TableCell>
            <TableCell colSpan={4} />
          </TableRow>
        }
      />
      {!rows.length && <p>Belum ada toko Shopee terhubung.</p>}
    </section>
  )
}
