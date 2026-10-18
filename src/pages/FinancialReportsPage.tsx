import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { fmtRp, getApiError } from '@/api/client'
import * as reports from '@/api/financialReports'
import type { Balances, BalanceKey, CloseInput, InputKey, Report, Sources } from '@/api/financialReports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MoneyInput from '@/components/MoneyInput'
import BarHalaman from '@/components/daftar/BarHalaman'
import FinancialReportSheet from './FinancialReportSheet'
import Spinner from '@/components/Spinner'
import { exportCsv } from '@/lib/exportData'

const monthNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`
}
const zeroBalances = () =>
  Object.fromEntries(Object.keys(reports.balanceLabels).map((k) => [k, '0'])) as Balances
const blankInput = (): Record<InputKey, string> =>
  Object.fromEntries(
    Object.keys(reports.inputLabels).map((k) => [
      k,
      ['biaya_iklan', 'piutang_pengiriman', 'saldo_toko', 'stok', 'utang_usaha'].includes(k) ? '' : '0',
    ]),
  ) as Record<InputKey, string>
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export default function FinancialReportsPage() {
  const { user } = useAuth()
  const allowed = user?.role === 'admin'
  const [month, setMonth] = useState(monthNow)
  const [manageOpen, setManageOpen] = useState(false)
  const qc = useQueryClient()
  const overview = useQuery({
    queryKey: ['financial-reports', month],
    queryFn: () => reports.overview(month),
    enabled: allowed,
  })
  const audit = useQuery({
    queryKey: ['financial-report-history'],
    queryFn: reports.history,
    enabled: allowed,
  })
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['financial-reports'] })
    await qc.invalidateQueries({ queryKey: ['financial-report-history'] })
    await qc.invalidateQueries({ queryKey: ['financial-report-sources'] })
  }
  if (!allowed) return <p role="alert">Laporan keuangan hanya dapat diakses admin.</p>
  return (
    <div className="financial-page min-w-0 space-y-5 text-left">
      <BarHalaman judul="Laporan Keuangan" deskripsi="Laporan keuangan Bumi Lestari">
        <Label htmlFor="report-month">Bulan laporan</Label>
        <Input
          id="report-month"
          type="month"
          className="w-44"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </BarHalaman>
      {overview.isLoading && <Spinner label="Memuat laporan…" />}
      {overview.error && (
        <div role="alert">
          <p>{getApiError(overview.error)}</p>
          <Button onClick={() => void overview.refetch()}>Coba lagi</Button>
        </div>
      )}
      {overview.data && (
        <>
          <FinancialReportSheet
            data={overview.data}
            month={month}
            comparison={
              overview.data.laporan.length ? (
                <ReportComparison date={overview.data.laporan.at(-1)!.tanggal} />
              ) : undefined
            }
          />
          <details
            className="rounded-2xl border bg-card p-4 sm:p-5"
            onToggle={(e) => setManageOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer text-sm font-medium">Kelola pembukuan</summary>
            {manageOpen && (
              <div className="space-y-4 pt-3">
                <Button asChild variant="outline">
                  <Link to="/processing">Kelola produksi di Processing</Link>
                </Button>
                {!overview.data.saldo_awal ? (
                  <>
                    <DriveImportForm onSaved={refresh} />
                    <OpeningForm onSaved={refresh} />
                  </>
                ) : (
                  <>
                    {overview.data.berikutnya?.startsWith(month) && (
                      <CloseForm
                        key={overview.data.berikutnya}
                        date={overview.data.berikutnya}
                        onSaved={refresh}
                      />
                    )}
                    <details>
                      <summary className="cursor-pointer">
                        Saldo awal · {dateLabel(overview.data.saldo_awal.tanggal)}
                      </summary>
                      <BalanceTable values={overview.data.saldo_awal.saldo} />
                    </details>
                    {overview.data.laporan.map((report) => (
                      <details key={report.tanggal}>
                        <summary className="cursor-pointer">
                          Rincian dan koreksi · {dateLabel(report.tanggal)}
                        </summary>
                        <ReportView
                          report={report}
                          canReopen={report.tanggal === overview.data?.terakhir}
                          onChanged={refresh}
                        />
                      </details>
                    ))}
                  </>
                )}
                {!!overview.data.legacy.length && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Riwayat kalender lama</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {overview.data.legacy.map((r) => (
                        <ReportView
                          key={r.tanggal}
                          report={r}
                          canReopen={r.tanggal === overview.data?.terakhir}
                          onChanged={refresh}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </details>
        </>
      )}
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">Riwayat tutup buku dan koreksi</summary>
        {audit.error && <p role="alert">{getApiError(audit.error)}</p>}
        <ul className="space-y-2 pt-3">
          {audit.data?.map((a) => (
            <li key={a.id} className="text-sm">
              {dateLabel(a.tanggal)} ·{' '}
              {a.action === 'reopen' ? 'Dibuka kembali' : a.action === 'opening' ? 'Saldo awal' : 'Ditutup'} ·{' '}
              {a.alasan} · {a.oleh}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function OpeningForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [date, setDate] = useState('')
  const [values, setValues] = useState(zeroBalances)
  const [busy, setBusy] = useState(false)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo awal pembukuan</CardTitle>
        <p>
          Isi posisi pada akhir hari sebelum periode laporan pertama. Untuk bulan lengkap, gunakan saldo akhir
          bulan sebelumnya. Saldo awal bukan pendapatan minggu berjalan. Aset harus sama dengan utang + modal
          + saldo laba.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              await reports.opening(date, values)
              await onSaved()
              toast.success('Saldo awal tersimpan')
            } catch (err) {
              toast.error(getApiError(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Label htmlFor="opening-date">Tanggal saldo awal</Label>
          <Input
            id="opening-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(reports.balanceLabels) as BalanceKey[]).map((k) => (
              <div key={k}>
                <Label htmlFor={`opening-${k}`}>{reports.balanceLabels[k]}</Label>
                <MoneyInput
                  id={`opening-${k}`}
                  value={values[k]}
                  required
                  onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan saldo awal'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CloseForm({ date, onSaved }: { date: string; onSaved: () => Promise<void> }) {
  const source = useQuery({
    queryKey: ['financial-report-sources', date],
    queryFn: () => reports.sources(date),
  })
  const [balances, setBalances] = useState({
    piutang_pengiriman: '',
    saldo_toko: '',
    stok: '',
    utang_usaha: '',
  })
  const [transactions, setTransactions] = useState<{ tanggal: string; jenis: InputKey; nominal: string }[]>(
    [],
  )
  const [selected, setSelected] = useState<string[]>([])
  const [settlementDates, setSettlementDates] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [preview, setPreview] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)
  const payload = (): CloseInput =>
    ({
      ...blankInput(),
      ...balances,
      ...Object.fromEntries(
        Object.keys(reports.inputLabels)
          .filter((k) => !Object.keys(balances).includes(k))
          .map((k) => [k, k === 'biaya_iklan' ? null : '0']),
      ),
      tanggal: date,
      settlement_ids: selected,
      tanggal_settlement: Object.fromEntries(selected.map((id) => [id, settlementDates[id]])),
      transaksi: transactions,
      catatan: notes,
      sumber_diperiksa: confirmed,
    }) as CloseInput
  const invalidate = () => {
    setPreview(null)
    setConfirmed(false)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Simpan cut-off · {dateLabel(date)}</CardTitle>
        <p>
          Periksa buku utama dan pembanding ERP. Penarikan dicatat pada tanggal uang benar-benar masuk kas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {source.isLoading && <Spinner label="Membaca sumber ERP…" />}
        {source.error && <p role="alert">{getApiError(source.error)}</p>}
        {source.data && (
          <>
            <SourceView source={source.data.sumber} />
            {source.data.sumber_utama !== 'google_drive' && (
              <fieldset className="space-y-2">
                <legend className="font-medium">Penarikan ke kas dari settlement ERP</legend>
                {!source.data.sumber.settlements.length && (
                  <p className="text-sm">
                    Tidak ada settlement paid pada periode ini. Penarikan yang belum tercatat di ERP bisa
                    diisi di input pelengkap dengan catatan.
                  </p>
                )}
                {source.data.sumber.settlements.map((s) => (
                  <Label className="flex gap-2" key={s.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={(e) => {
                        setSelected(
                          e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id),
                        )
                        setPreview(null)
                        setConfirmed(false)
                      }}
                    />
                    {s.toko} · {fmtRp(s.net)} · {s.id}
                    {selected.includes(s.id) && (
                      <Input
                        aria-label={`Tanggal kas masuk ${s.id}`}
                        type="date"
                        min={source.data.mulai}
                        max={date}
                        value={settlementDates[s.id] ?? ''}
                        required
                        onChange={(e) => {
                          setSettlementDates({ ...settlementDates, [s.id]: e.target.value })
                          invalidate()
                        }}
                      />
                    )}
                  </Label>
                ))}
              </fieldset>
            )}
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                try {
                  setPreview(await reports.preview(payload()))
                } catch (err) {
                  toast.error(getApiError(err))
                } finally {
                  setBusy(false)
                }
              }}
            >
              <p className="text-sm text-muted-foreground">
                Isi saldo akhir pada pukul 23:59 WIB tanggal cut-off, termasuk angka 0 jika nihil.{' '}
                {source.data.sumber_utama === 'google_drive'
                  ? 'Pemakaian iklan diisi dari buku utama; ERP menjadi pembanding.'
                  : 'Pemakaian iklan otomatis dari ERP;'}{' '}
                top-up adalah uang yang dibayarkan untuk mengisi saldo iklan. Data pelengkap hanya disimpan
                pada laporan ini.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(balances) as (keyof typeof balances)[]).map((k) => (
                  <div key={k}>
                    <Label htmlFor={`close-${k}`}>{reports.inputLabels[k]}</Label>
                    <MoneyInput
                      id={`close-${k}`}
                      value={balances[k]}
                      required
                      onChange={(e) => {
                        setBalances({ ...balances, [k]: e.target.value })
                        invalidate()
                      }}
                    />
                  </div>
                ))}
              </div>
              <fieldset className="space-y-3">
                <legend className="font-medium">Transaksi pelengkap bertanggal</legend>
                <p className="text-sm">
                  Tanggal transaksi menentukan alokasi bulan.{' '}
                  {source.data.sumber_utama === 'google_drive'
                    ? 'Isi seluruh transaksi buku utama, termasuk pemakaian iklan. Nilai ERP tidak masuk ke perhitungan.'
                    : 'Pemakaian iklan diambil dari data harian ERP; tambahkan koreksi hanya jika menggantikan total sumber.'}
                </p>
                {transactions.map((t, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-4">
                    <Input
                      aria-label={`Tanggal transaksi ${i + 1}`}
                      type="date"
                      min={source.data.mulai}
                      max={date}
                      value={t.tanggal}
                      required
                      onChange={(e) => {
                        setTransactions(
                          transactions.map((v, j) => (j === i ? { ...v, tanggal: e.target.value } : v)),
                        )
                        invalidate()
                      }}
                    />
                    <select
                      aria-label={`Jenis transaksi ${i + 1}`}
                      className="rounded-md border p-2"
                      value={t.jenis}
                      onChange={(e) => {
                        setTransactions(
                          transactions.map((v, j) =>
                            j === i ? { ...v, jenis: e.target.value as InputKey } : v,
                          ),
                        )
                        invalidate()
                      }}
                    >
                      {(Object.keys(reports.inputLabels) as InputKey[])
                        .filter((k) => !Object.keys(balances).includes(k))
                        .map((k) => (
                          <option key={k} value={k}>
                            {k === 'biaya_iklan' ? 'Pemakaian iklan dari buku utama' : reports.inputLabels[k]}
                          </option>
                        ))}
                    </select>
                    <MoneyInput
                      aria-label={`Nominal transaksi ${i + 1}`}
                      value={t.nominal}
                      required
                      onChange={(e) => {
                        setTransactions(
                          transactions.map((v, j) => (j === i ? { ...v, nominal: e.target.value } : v)),
                        )
                        invalidate()
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTransactions(transactions.filter((_, j) => i !== j))
                        invalidate()
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTransactions([
                      ...transactions,
                      { tanggal: source.data.mulai, jenis: 'operasional', nominal: '' },
                    ])
                    invalidate()
                  }}
                >
                  Tambah transaksi
                </Button>
              </fieldset>
              <Label htmlFor="report-notes">Catatan pemeriksaan / sumber input pelengkap</Label>
              <Input
                id="report-notes"
                value={notes}
                minLength={3}
                maxLength={4000}
                required
                onChange={(e) => {
                  setNotes(e.target.value)
                  setPreview(null)
                }}
              />
              <Label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked)
                    setPreview(null)
                  }}
                />
                Saya sudah memeriksa buku utama, penarikan, pemakaian iklan, saldo piutang, dan nilai stok
                pada tanggal cut-off.
              </Label>
              <Button disabled={busy || selected.some((id) => !settlementDates[id])}>
                {busy ? 'Menghitung…' : 'Pratinjau laporan'}
              </Button>
            </form>
            {preview && (
              <>
                <ReportView report={preview} />
                <Button
                  disabled={busy || !confirmed}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await reports.close({ ...payload(), preview_token: preview.preview_token })
                      setPreview(null)
                      await onSaved()
                      toast.success('Tutup buku tersimpan')
                    } catch (err) {
                      toast.error(getApiError(err))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Simpan tutup buku
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SourceView({ source }: { source: Sources }) {
  if (source.utama === 'google_drive' && source.pembanding_erp === null) return null
  return (
    <details>
      <summary className="cursor-pointer font-medium">Data pembanding ERP</summary>
      <div className="space-y-3 pt-3 text-sm">
        {source.peringatan.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p>
          Pemakaian iklan tersinkron: <strong>{fmtRp(source.biaya_iklan)}</strong> · {source.iklan.length}{' '}
          catatan harian.
        </p>
        <details>
          <summary>Rincian iklan</summary>
          {source.iklan.map((a) => (
            <p key={a.id}>
              {a.tanggal} · {a.toko} · {fmtRp(a.expense)}
            </p>
          ))}
        </details>
        <details>
          <summary>Pesanan dalam pengiriman ({source.pesanan_pengiriman.length})</summary>
          {source.pesanan_pengiriman.map((o) => (
            <p key={o.id}>
              <Link to={`/pesanan/${o.id}`} className="underline">
                {o.nomor}
              </Link>{' '}
              · {o.toko} · bruto {fmtRp(o.total_bruto)}
            </p>
          ))}
        </details>
        <details>
          <summary>Stok fisik ERP ({source.stok.length} produk)</summary>
          {source.stok.map((p) => (
            <p key={p.id}>
              {p.nama} · fisik {p.fisik} · tersedia {p.tersedia}
            </p>
          ))}
        </details>
      </div>
    </details>
  )
}

function BalanceTable({ values }: { values: Balances }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(reports.balanceLabels) as BalanceKey[]).map((k) => (
        <div key={k} className="flex justify-between gap-4 border-b py-2">
          <dt>{reports.balanceLabels[k]}</dt>
          <dd className="whitespace-nowrap tabular-nums">{fmtRp(values[k])}</dd>
        </div>
      ))}
    </dl>
  )
}

function ReportView({
  report,
  canReopen = false,
  onChanged,
}: {
  report: Report
  canReopen?: boolean
  onChanged?: () => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const r = report.hasil
  const sections: [string, [string, string][]][] = [
    [
      'A. Pemasukan',
      [
        ['Penarikan toko', r.pemasukan_toko],
        ['Penjualan produk kayu', report.input.pendapatan_produk ?? '0'],
        ['Jasa proses', report.input.jasa_proses ?? '0'],
        ['Jasa cat & packing', report.input.jasa_cat_packing ?? '0'],
        ['Jasa cat saja', report.input.jasa_cat ?? '0'],
        ['Perubahan piutang', r.perubahan_piutang],
        ['Total pemasukan', r.pemasukan],
      ],
    ],
    [
      'B. Pengeluaran',
      [
        ['Pembayaran tukang', report.input.bayar_tukang ?? '0'],
        ['Pembayaran produk & packing', report.input.pembelian ?? '0'],
        ['Penyesuaian stok', r.penyesuaian_stok],
        ['Penyesuaian utang usaha', r.penyesuaian_utang],
        ['HPP', r.hpp],
        ['Operasional', report.input.operasional ?? '0'],
        ['Langganan', report.input.langganan ?? '0'],
        ['Gaji', report.input.gaji ?? '0'],
        ['Pemakaian iklan', r.biaya_iklan],
        ['Total pengeluaran', r.pengeluaran],
      ],
    ],
    ['C. Laba/rugi', [['Laba bersih', r.laba]]],
    [
      'D. Arus kas',
      [
        ['Saldo awal kas utama', r.saldo_awal.kas_utama],
        ['Kas masuk', r.kas_masuk],
        ['Kas keluar', r.kas_keluar],
        ['Transfer antar kas', r.transfer_antar_kas],
        ['Tambahan modal', report.input.tambahan_modal ?? '0'],
        ['Saldo akhir kas utama', r.saldo_akhir.kas_utama],
      ],
    ],
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {report.imported_historical
            ? 'Riwayat laporan'
            : report.created_at
              ? 'Laporan tersimpan'
              : 'Pratinjau'}{' '}
          · {dateLabel(report.tanggal)}
        </CardTitle>
        <p className="text-sm">
          {dateLabel(report.mulai)} – {dateLabel(report.tanggal)}
          {report.tutup_bulanan ? ' · Saldo akhir bulan' : ''}
          {report.lengkap === false ? ' · Belum lengkap' : ''}
          {report.jadwal_laporan && (
            <span className="block">Jadwal penyajian: {dateLabel(report.jadwal_laporan)}</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map(([title, rows]) => (
          <details key={title} open>
            <summary className="font-semibold cursor-pointer">{title}</summary>
            <dl>
              {rows.map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-3 border-b py-2 text-sm">
                  <dt>{label}</dt>
                  <dd className="whitespace-nowrap tabular-nums">{fmtRp(amount)}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
        <details open>
          <summary className="font-semibold cursor-pointer">E. Neraca</summary>
          <BalanceTable values={r.saldo_akhir} />
          <p className="pt-3">
            Aset {fmtRp(r.neraca.aset)} · Utang {fmtRp(r.neraca.utang)} · Ekuitas {fmtRp(r.neraca.ekuitas)} ·
            Selisih {fmtRp(r.neraca.selisih)}
          </p>
        </details>
        {report.created_at &&
          report.calendar_version === 2 &&
          !report.lengkap &&
          report.lengkap !== false && <ReportComparison date={report.tanggal} />}
        <SourceView source={report.sumber} />
        <p className="text-sm">Catatan: {report.input.catatan}</p>
        <Button
          variant="outline"
          onClick={() =>
            exportCsv(`laporan-${report.tanggal}.csv`, [
              ['Periode mulai', report.mulai],
              ['Periode akhir', report.tanggal],
              ['Jadwal penyajian (Selasa)', report.jadwal_laporan ?? ''],
              ...sections.flatMap(([title, rows]) => [[title, ''], ...rows]),
              ['E. Neraca', ''],
              ...(Object.keys(reports.balanceLabels) as BalanceKey[]).map((k) => [
                reports.balanceLabels[k],
                r.saldo_akhir[k],
              ]),
              ['Selisih neraca', r.neraca.selisih],
            ])
          }
        >
          Unduh CSV
        </Button>
        {canReopen && (
          <details>
            <summary className="cursor-pointer font-medium">Koreksi tutup buku terakhir</summary>
            <p className="text-sm">
              Salinan lama tetap disimpan dalam riwayat. Koreksi ini hanya membuka laporan; data ERP tetap
              utuh.
            </p>
            <form
              className="flex flex-wrap gap-2 pt-2"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                try {
                  await reports.reopen(report.tanggal, reason)
                  await onChanged?.()
                  toast.success('Laporan dibuka kembali')
                } catch (err) {
                  toast.error(getApiError(err))
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Input
                aria-label="Alasan koreksi"
                placeholder="Alasan koreksi"
                value={reason}
                minLength={5}
                required
                onChange={(e) => setReason(e.target.value)}
              />
              <Button variant="outline" disabled={busy}>
                Buka kembali
              </Button>
            </form>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function ReportComparison({ date }: { date: string }) {
  const q = useQuery({
    queryKey: ['financial-report-comparison', date],
    queryFn: () => reports.comparison(date),
    staleTime: 60_000,
  })
  const item = (label: string, amount: string | null) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {amount === null ? 'Belum lengkap' : fmtRp(amount)}
      </span>
    </div>
  )
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pembanding ERP</h2>
        <p className="mt-1 text-sm text-muted-foreground">Posisi laporan {dateLabel(date)}</p>
      </div>
      {q.isLoading && <Spinner label="Memuat pembanding…" />}
      {q.error && (
        <p role="alert" className="text-sm text-destructive">
          {getApiError(q.error)}
        </p>
      )}
      {q.data && (
        <>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Laporan utama</CardTitle>
                <p className="text-xs text-muted-foreground">Piutang dan saldo pada tanggal laporan</p>
              </CardHeader>
              <CardContent>
                {item('Piutang pengiriman', q.data.laporan.piutang_pengiriman)}
                {item('Saldo penjual belum ditarik', q.data.laporan.saldo_toko)}
                <div className="mt-4 rounded-xl bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total piutang laporan</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {fmtRp(q.data.laporan.piutang_total)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>ERP</CardTitle>
                {q.data.periode && (
                  <p className="text-xs text-muted-foreground">
                    {dateLabel(q.data.periode.mulai)}–{dateLabel(q.data.periode.akhir)} ·{' '}
                    {q.data.periode.hari} · 6 toko
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Pesanan dalam pengiriman (bruto)
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {fmtRp(q.data.erp.piutang_pengiriman_bruto)}
                  </p>
                </div>
                {(q.data.erp.estimasi_bumi_tani != null || q.data.erp.estimasi_cakupan_drive != null) && (
                  <details className="rounded-xl border bg-muted/20 p-3">
                    <summary className="cursor-pointer text-xs font-medium">
                      Rincian toko — sudah termasuk dalam total di atas
                    </summary>
                    <div className="mt-2 border-t">
                      {q.data.erp.estimasi_bumi_tani != null &&
                        item('BUMI TANI IND · Dana Cepat', q.data.erp.estimasi_bumi_tani)}
                      {q.data.erp.estimasi_cakupan_drive != null &&
                        item('Lima toko lainnya', q.data.erp.estimasi_cakupan_drive)}
                    </div>
                  </details>
                )}
                <div>
                  {item('Saldo penjual tiga toko belum ditarik', q.data.erp.saldo_toko)}
                  {q.data.erp.saldo_tertahan_cutoff && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Cut-off {dateLabel(q.data.erp.saldo_tertahan_cutoff)}, 23.59 WIB.
                    </p>
                  )}
                </div>
                <p className="rounded-xl bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  Nilai pengiriman ERP masih bruto. Total piutang ERP belum dihitung agar tidak tercampur
                  dengan saldo bersih.
                </p>
                {q.data.erp.rincian_toko?.some((t) => !t.akun_ditemukan) && (
                  <p role="status" className="text-xs text-destructive">
                    Sebagian akun toko belum ditemukan. Periksa rincian per toko.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Pemakaian iklan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Laporan utama
                  {q.data.periode_iklan_laporan && (
                    <>
                      {' '}
                      · {dateLabel(q.data.periode_iklan_laporan.mulai)}–
                      {dateLabel(q.data.periode_iklan_laporan.akhir)}
                    </>
                  )}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{fmtRp(q.data.laporan.biaya_iklan)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  ERP
                  {q.data.periode && (
                    <>
                      {' '}
                      · {dateLabel(q.data.periode.mulai)}–{dateLabel(q.data.periode.akhir)}
                    </>
                  )}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{fmtRp(q.data.erp.biaya_iklan)}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function DriveImportForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impor laporan</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          type="file"
          accept="application/json,.json"
          aria-label="Berkas impor laporan"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setBusy(true)
            try {
              if (file.size > 2_000_000) throw new Error('Berkas maksimal 2 MB')
              await reports.importDrive(JSON.parse(await file.text()))
              await onSaved()
              toast.success('Laporan berhasil diimpor')
            } catch (err) {
              toast.error(getApiError(err))
            } finally {
              setBusy(false)
            }
          }}
        />
      </CardContent>
    </Card>
  )
}
