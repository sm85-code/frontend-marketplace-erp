import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { biayaProduksiBulan, type BiayaProduksi } from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { mingguBulan } from '@/lib/tanggal'
import Spinner from '@/components/Spinner'

const NAMA_TAHAP: Record<BiayaProduksi['tahap'], string> = { produksi: 'Tukang kayu', supplier: 'Supplier', pengecatan: 'Pengecatan', packing: 'Packing' }

/** What Pemetaan Order says the finished stages cost, per weekly period. A reference to type into the cash-flow table by hand. */
export default function RujukanBiayaProduksi({ month }: { month: string }) {
  const q = useQuery({ queryKey: ['biaya-produksi', month], queryFn: () => biayaProduksiBulan(month) })
  const minggu = useMemo(() => mingguBulan(month), [month])
  const perMinggu = useMemo(
    () =>
      minggu.map((m) => {
        const baris = new Map<string, { label: string; jumlah: number }>()
        for (const i of (q.data ?? []).filter((x) => x.tanggal >= m.mulai && x.tanggal <= m.akhir)) {
          const label = i.pihak ? `${NAMA_TAHAP[i.tahap]} · ${i.pihak}` : NAMA_TAHAP[i.tahap]
          baris.set(label, { label, jumlah: (baris.get(label)?.jumlah ?? 0) + Number(i.jumlah) })
        }
        const rows = [...baris.values()]
        return { ...m, rows, total: rows.reduce((a, r) => a + r.jumlah, 0) }
      }),
    [q.data, minggu],
  )
  return (
    <details className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
      <summary className="cursor-pointer text-sm font-semibold">Rujukan biaya produksi</summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Dari Pemetaan Order, dihitung pada tanggal tahap selesai. Hanya rujukan: tidak masuk ke tabel arus kas, catat sendiri di baris yang sesuai.
      </p>
      {q.isLoading && <Spinner label="Memuat biaya produksi…" />}
      {q.error && <p role="alert" className="mt-2 text-sm text-destructive">{getApiError(q.error)}</p>}
      {q.data && (
        <div className="mt-3 space-y-3">
          {perMinggu.map((m, n) => (
            <section key={m.label} aria-label={`Periode ${m.label}`} className="rounded-lg bg-muted/30 p-3 text-sm">
              <h3 className="font-medium">{`${n + 1}. Periode ${m.label}`}</h3>
              {m.rows.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">Belum ada tahap yang selesai.</p>
              ) : (
                <>
                  <ul className="mt-1 space-y-1">
                    {m.rows.map((r, i) => (
                      <li key={r.label} className="flex justify-between gap-3">
                        <span className="min-w-0 break-words text-muted-foreground">{`${n + 1}.${i + 1} ${r.label}`}</span>
                        <span className="shrink-0 tabular-nums">{fmtRp(r.jumlah)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-between gap-3 border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{fmtRp(m.total)}</span>
                  </p>
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </details>
  )
}
