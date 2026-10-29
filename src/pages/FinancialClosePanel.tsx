import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/financialReports'
import { getApiError } from '@/api/client'
import {
  balanceInputs,
  transactionInputs,
  emptyClose,
  closePayload,
  cutoffFinished,
  difference,
  exactRp,
  latestMonthlyCutoff,
} from '@/lib/financialClose'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export type LiveCloseValues = {
  pemasukan: string | null
  pengeluaran: string | null
  laba: string | null
  kas_utama: string | null
}
const labels = {
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  laba: 'Laba / rugi',
  kas_utama: 'Kas Utama',
}
export default function FinancialClosePanel({
  data,
  month,
  live,
  writable,
}: {
  data: api.Overview
  month: string
  live: LiveCloseValues
  writable: boolean
}) {
  // Baseline = the ERP's own monthly close of this month only (Drive-imported weeks are history, not a baseline).
  const saved = latestMonthlyCutoff(data)
  const monthly = saved
  const complete = !!saved
  const [flow, setFlow] = useState<{
    date: string
    existing?: api.Report
  } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const history = useQuery({
    queryKey: ['financial-close-history'],
    queryFn: api.history,
    enabled: showHistory,
  })
  // Closing is monthly only: the next close is always a month end.
  const date = data.tutup_berikutnya ?? null
  return (
    <section
      className="space-y-3 rounded-xl border bg-card p-3 sm:p-4"
      aria-label="Patokan tutup bulanan"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Patokan bulanan · {month}</h2>
        <span className="rounded border px-2 py-1 text-sm">
          {complete ? 'Patokan tersimpan' : 'Belum ditutup'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Tutup buku menyimpan patokan keputusan. Laporan berjalan dan lembar
        keuangan tetap dapat diedit. Perubahan lembar manual tidak otomatis
        masuk patokan; rekonsiliasi melalui transaksi bertanggal dan saldo
        akhir.
      </p>
      <p className="text-sm text-muted-foreground">
        Selisih hanya dihitung terhadap patokan lengkap: berjalan dikurangi
        patokan. Angka — berarti belum tersedia.
      </p>
      <p className="text-sm">
        Tutup buku bulanan {data.akhir_bulan} · Sumber: data ERP · Penyajian {data.jadwal_bulanan}
      </p>
      <div className="overflow-x-auto">
        <table className="block w-full text-sm sm:table">
          <caption className="sr-only">
            Angka laporan berjalan dibanding patokan bulanan; selisih = berjalan
            dikurangi patokan
          </caption>
          <thead className="hidden sm:table-header-group">
            <tr>
              <th className="text-left">Nilai</th>
              <th>Berjalan</th>
              <th>Patokan{!complete ? ' (belum ada)' : ''}</th>
              <th>Selisih</th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {Object.entries(labels).map(([key, label]) => {
              const k = key as keyof LiveCloseValues
              const baseline = monthly
                ? k === 'kas_utama'
                  ? monthly.hasil.saldo_akhir.kas_utama
                  : monthly.hasil[k]
                : null
              const delta =
                complete && live[k] !== null && baseline !== null
                  ? difference(live[k], baseline)
                  : null
              return (
                <tr
                  key={key}
                  className="block border-t pb-2 sm:table-row sm:pb-0"
                >
                  <th
                    scope="row"
                    className="block py-2 text-left font-semibold sm:table-cell sm:font-normal"
                  >
                    {label}
                  </th>
                  {[live[k], baseline, delta].map((v, i) => (
                    <td
                      key={i}
                      className={`flex justify-between gap-3 py-1 text-right tabular-nums sm:table-cell sm:px-2 sm:py-2 ${i === 2 && delta !== null && delta !== '0.00' ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}`}
                    >
                      <span className="text-left font-normal text-muted-foreground sm:hidden">
                        {
                          [
                            'Berjalan',
                            complete
                              ? 'Patokan'
                              : 'Patokan (belum ada)',
                            'Selisih',
                          ][i]
                        }
                      </span>
                      <span>{v === null ? '—' : exactRp(v)}</span>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {saved && (
        <p className="text-xs">
          Patokan cut-off disimpan {saved.created_at ?? '—'} oleh{' '}
          {saved.created_by ?? '—'}. Riwayat memuat alasan dan pelaku.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {writable && saved && (
          <Button
            variant="outline"
            disabled={data.tutup_terakhir !== saved.tanggal}
            onClick={() => setFlow({ date: saved.tanggal, existing: saved })}
          >
            Perbarui patokan
          </Button>
        )}
        {writable && !saved && date === data.akhir_bulan && (
          <Button disabled={!cutoffFinished(date)} onClick={() => setFlow({ date })}>
            Tutup buku {month}
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
          Riwayat audit
        </Button>
      </div>
      {saved && data.tutup_terakhir !== saved.tanggal && (
        <p className="text-sm">
          Hanya tutup buku terbaru ({data.tutup_terakhir}) dapat diperbarui. Patokan
          bulan ini tidak dapat diperbarui langsung.
        </p>
      )}
      {!saved && (
        <p className="text-sm">
          {!date
            ? 'Saldo awal diperlukan sebelum menutup laporan.'
            : date > data.akhir_bulan
              ? 'Cut-off bulan ini sudah terlewati. Periksa riwayat.'
              : date < data.akhir_bulan
                ? `Tutup buku dulu bulan ${date.slice(0, 7)} (berurutan per bulan).`
                : cutoffFinished(date)
                  ? 'Bulan sudah selesai: periksa sumber ERP lalu tutup buku.'
                  : 'Tutup buku tersedia setelah bulan selesai (setelah 23:59 WIB tanggal terakhir).'}
        </p>
      )}
      {showHistory && (
        <div className="space-y-2" aria-live="polite">
          {history.isLoading && <p>Memuat riwayat…</p>}
          {history.error && (
            <p role="alert">
              {getApiError(history.error)}{' '}
              <Button variant="outline" onClick={() => void history.refetch()}>
                Coba lagi
              </Button>
            </p>
          )}
          {history.data
            ?.filter((a) => a.tanggal.startsWith(month))
            .map((a) => (
              <p className="break-words border-t pt-2 text-sm" key={a.id}>
                {a.tanggal} · {a.action} · {a.waktu} · {a.oleh}
                <br />
                {a.alasan}
              </p>
            ))}
          {history.data &&
            !history.data.some((a) => a.tanggal.startsWith(month)) && (
              <p>Belum ada riwayat bulan ini.</p>
            )}
        </div>
      )}
      {flow && (
        <CloseFlow
          date={flow.date}
          existing={flow.existing}
          onDismiss={() => setFlow(null)}
        />
      )}
    </section>
  )
}

function CloseFlow({
  date,
  existing,
  onDismiss,
}: {
  date: string
  existing?: api.Report
  onDismiss: () => void
}) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [input, setInput] = useState<api.CloseInput>(() =>
    existing ? closePayload(existing.input) : emptyClose(date),
  )
  const [preview, setPreview] = useState<api.Report | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const sources = useQuery({
    queryKey: ['financial-close-sources', date],
    queryFn: () => api.sources(date),
    retry: false,
  })
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['financial-reports'] }),
      qc.invalidateQueries({ queryKey: ['financial-close-history'] }),
    ])
  }
  const change = (next: api.CloseInput) => {
    setInput(next)
    setPreview(null)
    setConfirmed(false)
    setError('')
  }
  const payload = () => ({
    ...closePayload(input),
    tanggal: date,
    catatan: existing
      ? `${input.catatan.trim()}\nAlasan pembaruan: ${reason.trim()}`
      : input.catatan,
  })
  const run = async (action: 'preview' | 'close') => {
    setBusy(true)
    setError('')
    try {
      if (action === 'preview') {
        setPreview(null)
        setConfirmed(false)
        setPreview(await api.preview(payload()))
      } else if (preview && confirmed) {
        const data = { ...payload(), preview_token: preview.preview_token }
        if (existing) await api.updateClose(date, data)
        else await api.close(data)
        setSuccess(true)
        setPreview(null)
        await refresh()
      }
    } catch (e) {
      setError(getApiError(e))
      setPreview(null)
      setConfirmed(false)
      await refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onDismiss()
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
        onPointerDownOutside={(e) => busy && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {existing ? 'Perbarui patokan' : 'Tutup cut-off'} · {date}
          </DialogTitle>
          <DialogDescription>
            Patokan tidak mengunci ledger. Periksa angka dan sumber sebelum
            menyimpan. Perubahan angka lembar manual perlu direkonsiliasi ke
            input ini.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-destructive">
            {error} Pratinjau baru diperlukan; periksa status laporan bila
            koneksi terputus.
          </p>
        )}
        {success ? (
          <>
            <p role="status">
              Patokan berhasil disimpan dan dicatat dalam audit.
              {existing && ' Patokan sebelumnya tetap tercatat dalam audit.'}
            </p>
            <Button onClick={onDismiss}>Selesai</Button>
          </>
        ) : (
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            {existing && (
              <>
                <p className="rounded border p-2 text-sm">
                  Pembaruan disimpan secara atomik. Patokan sebelumnya tetap
                  tersimpan jika pembaruan gagal dan tetap tercatat dalam audit.
                </p>
                <label className="block space-y-1">
                  Alasan pembaruan (wajib, minimal 5 karakter)
                  <Input
                    value={reason}
                    maxLength={2000}
                    onChange={(e) => {
                      setReason(e.target.value)
                      setPreview(null)
                      setConfirmed(false)
                      setError('')
                    }}
                  />
                </label>
              </>
            )}
            {sources.isLoading && <p>Memuat sumber…</p>}
            {sources.error && (
              <p role="alert">
                {getApiError(sources.error)}{' '}
                <Button onClick={() => void sources.refetch()}>
                  Muat ulang sumber
                </Button>
              </p>
            )}
            {sources.data && (
              <>
                <p className="text-sm">
                  Rentang {sources.data.mulai} – {date} · Sumber utama:{' '}
                  {sources.data.sumber_utama === 'google_drive'
                    ? 'Buku utama Drive; ERP pembanding'
                    : 'ERP'}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(preview?.sumber ?? sources.data.sumber).peringatan.map(
                    (w, i) => (
                      <li key={i}>{w}</li>
                    ),
                  )}
                </ul>
                <p className="text-sm">
                  Iklan ERP: {exactRp(sources.data.sumber.biaya_iklan)} ·{' '}
                  {sources.data.sumber.pesanan_pengiriman.length} pesanan ·{' '}
                  {sources.data.sumber.stok.length} stok. Nilai bruto dan stok
                  fisik bukan saldo akhir terverifikasi.
                </p>
                <details className="space-y-2 rounded border p-2 text-sm">
                  <summary className="cursor-pointer font-medium">
                    Rincian sumber ERP
                  </summary>
                  <p>
                    Pesanan dan stok adalah kondisi saat dibaca. Cocokkan dengan
                    bukti historis dan buku utama.
                  </p>
                  <ul className="space-y-1">
                    {sources.data.sumber.iklan.map((a) => (
                      <li key={a.id}>
                        Iklan · {a.toko} · {a.tanggal} · {exactRp(a.expense)} ·
                        dibaca {a.diambil_at}
                      </li>
                    ))}
                    {sources.data.sumber.pesanan_pengiriman.map((o) => (
                      <li key={o.id}>
                        Pengiriman · {o.toko} · {o.nomor} · bruto{' '}
                        {exactRp(o.total_bruto)}
                      </li>
                    ))}
                    {sources.data.sumber.stok.map((s) => (
                      <li key={s.id}>
                        Stok · {s.nama} · tersedia {s.tersedia} · fisik{' '}
                        {s.fisik}
                      </li>
                    ))}
                  </ul>
                </details>
                {sources.data.sumber_utama === 'erp' && (
                  <fieldset className="space-y-2">
                    <legend>Settlement yang benar-benar masuk kas</legend>
                    {sources.data.sumber.settlements.map((s) => (
                      <div key={s.id} className="space-y-1 rounded border p-2">
                        <label className="flex gap-2">
                          <input
                            type="checkbox"
                            checked={input.settlement_ids.includes(s.id)}
                            onChange={(e) => {
                              const dates = { ...input.tanggal_settlement }
                              if (!e.target.checked) delete dates[s.id]
                              change({
                                ...input,
                                settlement_ids: e.target.checked
                                  ? [...input.settlement_ids, s.id]
                                  : input.settlement_ids.filter(
                                      (id) => id !== s.id,
                                    ),
                                tanggal_settlement: dates,
                              })
                            }}
                          />
                          {s.toko} · {s.id} · {exactRp(s.net)}
                        </label>
                        {input.settlement_ids.includes(s.id) && (
                          <label className="block">
                            Tanggal masuk bank
                            <Input
                              type="date"
                              min={sources.data.mulai}
                              max={date}
                              value={input.tanggal_settlement[s.id] ?? ''}
                              onChange={(e) =>
                                change({
                                  ...input,
                                  tanggal_settlement: {
                                    ...input.tanggal_settlement,
                                    [s.id]: e.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </fieldset>
                )}
                <fieldset className="space-y-2">
                  <legend className="font-semibold">
                    Saldo akhir terverifikasi (Rp)
                  </legend>
                  {balanceInputs.map((k) => (
                    <label className="block" key={k}>
                      {api.inputLabels[k]}
                      <Input
                        inputMode="decimal"
                        value={input[k] ?? ''}
                        onChange={(e) =>
                          change({ ...input, [k]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="font-semibold">
                    Transaksi pelengkap bertanggal
                  </legend>
                  <p className="text-sm">
                    Nominal rupiah tanpa pemisah ribuan (contoh 1234.56). Untuk
                    Drive, tambahkan pemakaian iklan bertanggal, termasuk 0 jika
                    nihil.
                  </p>
                  {input.transaksi.map((t, i) => (
                    <div key={i} className="space-y-2 rounded border p-2">
                      <label className="block">
                        Jenis transaksi
                        <select
                          className="w-full rounded border bg-background p-2"
                          value={t.jenis}
                          onChange={(e) =>
                            change({
                              ...input,
                              transaksi: input.transaksi.map((v, j) =>
                                i === j
                                  ? {
                                      ...v,
                                      jenis: e.target.value as api.InputKey,
                                    }
                                  : v,
                              ),
                            })
                          }
                        >
                          {transactionInputs.map((k) => (
                            <option key={k} value={k}>
                              {api.inputLabels[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        Tanggal
                        <Input
                          type="date"
                          min={sources.data.mulai}
                          max={date}
                          value={t.tanggal}
                          onChange={(e) =>
                            change({
                              ...input,
                              transaksi: input.transaksi.map((v, j) =>
                                i === j ? { ...v, tanggal: e.target.value } : v,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="block">
                        Nominal (Rp)
                        <Input
                          inputMode="decimal"
                          value={t.nominal}
                          onChange={(e) =>
                            change({
                              ...input,
                              transaksi: input.transaksi.map((v, j) =>
                                i === j ? { ...v, nominal: e.target.value } : v,
                              ),
                            })
                          }
                        />
                      </label>
                      <Button
                        variant="outline"
                        onClick={() =>
                          change({
                            ...input,
                            transaksi: input.transaksi.filter(
                              (_, j) => i !== j,
                            ),
                          })
                        }
                      >
                        Hapus transaksi {i + 1}
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      change({
                        ...input,
                        transaksi: [
                          ...input.transaksi,
                          {
                            tanggal: date,
                            jenis: 'penarikan_lain',
                            nominal: '0',
                          },
                        ],
                      })
                    }
                  >
                    Tambah transaksi
                  </Button>
                </fieldset>
                <label className="block">
                  Catatan audit (minimal 3 karakter)
                  <Input
                    maxLength={4000}
                    value={input.catatan}
                    onChange={(e) =>
                      change({ ...input, catatan: e.target.value })
                    }
                  />
                </label>
                <Button
                  disabled={
                    input.catatan.trim().length < 3 ||
                    (!!existing && reason.trim().length < 5)
                  }
                  onClick={() => void run('preview')}
                >
                  Buat pratinjau baru
                </Button>
              </>
            )}
            {preview && (
              <div className="space-y-3 rounded border p-3">
                <h3 className="font-semibold">
                  Pratinjau {preview.mulai} – {preview.tanggal}
                </h3>
                <p>Penyajian {preview.jadwal_laporan}</p>
                <dl>
                  {(['pemasukan', 'pengeluaran', 'laba'] as const).map((k) => (
                    <div key={k}>
                      <dt>{labels[k]}</dt>
                      <dd className="break-all font-semibold tabular-nums">
                        {exactRp(preview.hasil[k])}
                      </dd>
                    </div>
                  ))}
                  {Object.entries(preview.hasil.saldo_akhir).map(([k, v]) => (
                    <div key={k}>
                      <dt>{api.balanceLabels[k as api.BalanceKey]}</dt>
                      <dd>{exactRp(v)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>Selisih neraca</dt>
                    <dd>{exactRp(preview.hasil.neraca.selisih)}</dd>
                  </div>
                </dl>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  Saya telah memeriksa sumber, peringatan, transaksi dan saldo
                  akhir pada pratinjau ini.
                </label>
                <Button
                  disabled={
                    !confirmed ||
                    !cutoffFinished(date) ||
                    !preview.preview_token
                  }
                  onClick={() => void run('close')}
                >
                  Simpan patokan dan audit
                </Button>
              </div>
            )}
            {!cutoffFinished(date) && (
              <p>Cut-off baru dapat disimpan setelah {date} pukul 23:59 WIB.</p>
            )}
            {busy && <p role="status">Memproses…</p>}
          </fieldset>
        )}
      </DialogContent>
    </Dialog>
  )
}
