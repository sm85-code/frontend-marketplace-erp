import InfoTip from '@/components/InfoTip'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { biayaProduksiBulan, type PembayaranProduksi } from '@/api/financialReports'
import { fmtRp, getApiError } from '@/api/client'
import { mingguBulan } from '@/lib/tanggal'
import Spinner from '@/components/Spinner'

const NAMA_TAHAP: Record<PembayaranProduksi['tahap'], string> = { produksi: 'Tukang kayu', supplier: 'Supplier', packing: 'Packing' }
const KOMPONEN = [
  ['harga_produk', 'Harga produk'],
  ['cat_packing', 'Cat + packing'],
  ['packing_kayu', 'Packing kayu'],
  ['biaya_proses', 'Biaya proses'],
] as const

type Baris = { label: string; jumlah: number }
const tambah = (peta: Map<string, Baris>, label: string, jumlah: number) => peta.set(label, { label, jumlah: (peta.get(label)?.jumlah ?? 0) + jumlah })

function Daftar({ judul, nomor, rows, mulai = 0 }: { judul: string; nomor: string; rows: Baris[]; mulai?: number }) {
  const total = rows.reduce((a, r) => a + r.jumlah, 0)
  return (
    <div className="mt-2">
      <p className="text-xs font-medium">{judul}</p>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">Belum ada.</p>
      ) : (
        <>
          <ul className="mt-1 space-y-1">
            {rows.map((r, i) => (
              <li key={r.label} className="flex justify-between gap-3">
                <span className="min-w-0 break-words text-muted-foreground">{`${nomor}.${mulai + i + 1} ${r.label}`}</span>
                <span className="shrink-0 tabular-nums">{fmtRp(r.jumlah)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 flex justify-between gap-3 border-t pt-1 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{fmtRp(total)}</span>
          </p>
        </>
      )}
    </div>
  )
}

/** What Pemetaan Order says is paid out and what resellers are billed, per weekly period. A reference to type into the cash-flow table by hand. */
export default function RujukanBiayaProduksi({ month }: { month: string }) {
  const q = useQuery({ queryKey: ['biaya-produksi', month], queryFn: () => biayaProduksiBulan(month) })
  const minggu = useMemo(() => mingguBulan(month), [month])
  const perMinggu = useMemo(
    () =>
      minggu.map((m) => {
        const dalam = (t: string) => t >= m.mulai && t <= m.akhir
        const bayar = new Map<string, Baris>()
        for (const i of (q.data?.pembayaran ?? []).filter((x) => dalam(x.tanggal))) tambah(bayar, i.pihak ? `${NAMA_TAHAP[i.tahap]} · ${i.pihak}` : NAMA_TAHAP[i.tahap], Number(i.jumlah))
        const tagih = new Map<string, Baris>()
        for (const i of (q.data?.tagihan ?? []).filter((x) => dalam(x.tanggal)))
          for (const [k, nama] of KOMPONEN) if (Number(i[k])) tambah(tagih, `${i.reseller} · ${nama}`, Number(i[k]))
        return { ...m, bayar: [...bayar.values()], tagih: [...tagih.values()] }
      }),
    [q.data, minggu],
  )
  return (
    <details className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
      <summary className="cursor-pointer text-sm font-semibold">Rujukan pembayaran produksi & tagihan reseller</summary>
      <InfoTip teks={"Dari Pemetaan Order. Pembayaran dihitung pada tanggal tahap selesai (tukang hanya menerima harga produk), tagihan pada tanggal packing selesai. Hanya rujukan: tidak masuk ke tabel arus kas."} />
      {q.isLoading && <Spinner label="Memuat data produksi…" />}
      {q.error && <p role="alert" className="mt-2 text-sm text-destructive">{getApiError(q.error)}</p>}
      {q.data && (
        <div className="mt-3 space-y-3">
          {perMinggu.map((m, n) => (
            <section key={m.label} aria-label={`Periode ${m.label}`} className="rounded-lg bg-muted/30 p-3 text-sm">
              <h3 className="font-medium">{`${n + 1}. Periode ${m.label}`}</h3>
              {m.bayar.length === 0 && m.tagih.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">Belum ada tahap yang selesai.</p>
              ) : (
                <>
                  {m.bayar.length > 0 && <Daftar judul="Dibayar ke tukang / supplier" nomor={`${n + 1}`} rows={m.bayar} />}
                  {m.tagih.length > 0 && <Daftar judul="Ditagih ke reseller" nomor={`${n + 1}`} rows={m.tagih} mulai={m.bayar.length} />}
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </details>
  )
}
