import { useState, type ReactNode } from 'react'
import type { Comparison } from '@/api/financialReports'
import { fmtRp, fmtDateTime } from '@/api/client'
import { Table, TableHeader, TableHead, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
const dateLabel = (value: string) =>
  new Date(value + 'T12:00:00+07:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
function Grid({ title, heads, rows }: { title: string; heads: string[]; rows: ReactNode[][] }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border">
      <Table aria-label={title} style={{ minWidth: 560 }}>
        <TableHeader className="bg-muted">
          <TableRow>
            {heads.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((value, j) => (
                <TableCell key={j}>{value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
export default function FinancialComparisonDetails({ data }: { data: Comparison }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const needle = search.trim().toLowerCase()
  const orders = data.erp.pesanan.filter(
    (p) => !needle || (p.nomor + ' ' + p.toko).toLowerCase().includes(needle),
  )
  return (
    <div className="space-y-3 pt-4">
      <p className="text-sm text-muted-foreground">
        Telusuri angka pengiriman ERP per toko, minggu, atau nomor pesanan. Totalnya memakai data yang sama
        dengan tabel Estimasi Dana Akan Cair, sampai tanggal laporan terisi.
      </p>
      {data.erp.rincian_saldo_tertahan && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">Rincian saldo tertahan tiga toko</summary>
          <div className="pt-2">
            <Grid
              title="Saldo tertahan tiga toko pada tanggal laporan"
              heads={['Toko', 'Saldo belum ditarik', 'Mutasi terakhir', 'Keterangan']}
              rows={[
                ...data.erp.rincian_saldo_tertahan.map((r) => [
                  r.nama,
                  r.nominal == null ? 'Belum tersedia' : fmtRp(r.nominal),
                  r.transaksi_at != null ? fmtDateTime(new Date(r.transaksi_at * 1000).toISOString()) : '—',
                  r.keterangan ?? 'Tersedia',
                ]),
                ['Total', data.erp.saldo_toko == null ? 'Belum lengkap' : fmtRp(data.erp.saldo_toko), '', ''],
              ]}
            />
          </div>
        </details>
      )}
      {data.erp.rincian_toko && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">Rincian enam toko</summary>
          <div className="pt-2">
            <Grid
              title="Rincian pembanding per toko"
              heads={['Toko', 'Jumlah pesanan', 'Estimasi bruto']}
              rows={[
                ...data.erp.rincian_toko.map((r) => [
                  <>
                    {r.nama}
                    {r.masuk_estimasi_drive === false && (
                      <span className="block whitespace-normal text-xs text-muted-foreground">
                        Dana Cepat · estimasi tidak masuk laporan utama
                      </span>
                    )}
                    {!r.akun_ditemukan && (
                      <span className="block text-xs text-muted-foreground">Akun ERP belum ditemukan</span>
                    )}
                  </>,
                  r.jumlah_pesanan,
                  r.akun_ditemukan ? fmtRp(r.nominal) : 'Belum tersedia',
                ]),
                [
                  data.erp.rincian_toko.some((r) => !r.akun_ditemukan) ? 'Total data tersedia' : 'Total',
                  data.erp.pesanan.length,
                  fmtRp(data.erp.piutang_pengiriman_bruto),
                ],
              ]}
            />
          </div>
        </details>
      )}
      {data.erp.rincian_minggu && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">Rincian per minggu</summary>
          <div className="pt-2">
            <Grid
              title="Rincian pembanding per minggu"
              heads={['Tanggal dikirim', 'Jumlah pesanan', 'Estimasi bruto']}
              rows={[
                ...data.erp.rincian_minggu.map((r) => [
                  dateLabel(r.mulai) + '–' + dateLabel(r.akhir),
                  r.jumlah_pesanan,
                  fmtRp(r.nominal),
                ]),
                ['Total', data.erp.pesanan.length, fmtRp(data.erp.piutang_pengiriman_bruto)],
              ]}
            />
          </div>
        </details>
      )}
      <details className="rounded-2xl border bg-card p-4" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer font-medium">
          Rincian nomor pesanan ({data.erp.pesanan.length})
        </summary>
        {open && (
          <div className="space-y-2 pt-2">
            <Input
              aria-label="Cari nomor pesanan atau toko pembanding"
              placeholder="Cari nomor pesanan atau toko"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Grid
              title="Pesanan pembentuk pembanding ERP"
              heads={['Nomor pesanan', 'Toko', 'Tanggal dikirim', 'Status', 'Estimasi bruto']}
              rows={orders.map((p) => [
                p.nomor,
                p.toko,
                p.tanggal_kirim ? dateLabel(p.tanggal_kirim) : '—',
                p.status === 'TO_CONFIRM_RECEIVE'
                  ? 'Menunggu konfirmasi diterima'
                  : p.status === 'SHIPPED' || p.status === 'shipped'
                    ? 'Dalam pengiriman'
                    : (p.status ?? '—'),
                fmtRp(p.total_bruto),
              ])}
            />
            {!orders.length && (
              <p className="text-sm text-muted-foreground">Tidak ada pesanan yang sesuai.</p>
            )}
          </div>
        )}
      </details>
    </div>
  )
}
