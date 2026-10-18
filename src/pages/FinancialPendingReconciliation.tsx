import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import * as commerce from "@/api/commerce";
import { pendingShippingReceivables, shippingReceivables } from "@/api/financialReports";
import { fmtRp, getApiError } from "@/api/client";
import Spinner from "@/components/Spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Read-only check that explains the gap between "Menunggu Pencairan" and "Pesanan Dalam Pengiriman".
 * It changes nothing in those tables: it loads on demand (only when opened), reads the same sources again and
 * lines both sides up as of today, one row per shop.
 */

const wibToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const isSundayWib = (seconds: number) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(new Date(seconds * 1000)) === "Sun";
const NOT_SHIPPED = new Set(["UNPAID", "READY_TO_SHIP", "PROCESSED"]);
const stamp = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 8640000000000 ? value : null;

type Bucket = "dihitung" | "belum_dikirim" | "minggu" | "tanpa_tanggal";
interface PendingOrder { sn: string; amount: number | null; bucket: Bucket }

async function loadPending(accountId: string, today: string): Promise<PendingOrder[]> {
  const from = new Date(`${today}T12:00:00+07:00`);
  from.setDate(from.getDate() - 13);
  const dari = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(from);
  const rows = new Map<string, number | null>();
  let cursor = "";
  for (let page = 0; page < 40; page++) {
    const result = await commerce.income(accountId, { dari, sampai: today, income_status: 2, cursor, page_size: 100 });
    for (const row of result.items) if (row.order_sn) rows.set(row.order_sn, row.estimated_escrow_amount ?? null);
    if (!result.ada_lagi || !result.next_cursor) break;
    cursor = result.next_cursor;
  }
  const numbers = [...rows.keys()];
  const detail = new Map<string, commerce.IncomeOrderDetail>();
  for (let i = 0; i < numbers.length; i += 30) {
    const chunk = await commerce.incomeOrders(accountId, numbers.slice(i, i + 30));
    for (const item of chunk.items) detail.set(item.order_sn, item);
  }
  return numbers.map((sn) => {
    const d = detail.get(sn);
    const shipped = stamp(d?.pickup_done_time);
    const bucket: Bucket = shipped != null ? (isSundayWib(shipped) ? "minggu" : "dihitung")
      : d?.order_status && NOT_SHIPPED.has(d.order_status) ? "belum_dikirim" : "tanpa_tanggal";
    return { sn, amount: rows.get(sn) ?? null, bucket };
  });
}

const sum = (orders: PendingOrder[], bucket?: Bucket) =>
  orders.filter((o) => !bucket || o.bucket === bucket).reduce((n, o) => n + (o.amount ?? 0), 0);
const count = (orders: PendingOrder[], bucket: Bucket) => orders.filter((o) => o.bucket === bucket).length;

function columnsOf(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const monday = new Date(first);
  monday.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  return Math.floor((last.getTime() - monday.getTime()) / 86400000 / 7) + 1;
}

export default function FinancialPendingReconciliation({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  const today = wibToday();
  const current = today.startsWith(month);
  const columns = columnsOf(month);
  const meta = useQuery({
    queryKey: ["recon-meta", month, columns, today],
    queryFn: () => shippingReceivables(month, columns, today),
    enabled: open && current,
    staleTime: 60_000,
  });
  const weekIndex = meta.data ? meta.data.minggu.reduce((found, w, i) => (w.mulai <= today ? i : found), 0) : 0;
  const accounts = meta.data?.toko.flatMap((shop) => shop.akun_ids) ?? [];
  const report = useQueries({
    queries: accounts.map((id) => ({
      queryKey: ["recon-report", id, month, columns, today],
      queryFn: () => pendingShippingReceivables(id, month, columns, today),
      enabled: open && current,
      staleTime: 60_000,
      retry: false,
    })),
  });
  const pending = useQueries({
    queries: accounts.map((id) => ({
      queryKey: ["recon-pending", id, today],
      queryFn: () => loadPending(id, today),
      enabled: open && current,
      staleTime: 60_000,
      retry: false,
    })),
  });
  const busy = meta.isFetching || report.some((r) => r.isFetching) || pending.some((r) => r.isFetching);
  const rows = (meta.data?.toko ?? []).map((shop) => {
    const idx = shop.akun_ids.map((id) => accounts.indexOf(id));
    const orders = idx.flatMap((i) => pending[i]?.data ?? []);
    const pendingReady = idx.length > 0 && idx.every((i) => !!pending[i]?.data);
    const reportCells = idx.map((i) => report[i]?.data?.minggu[weekIndex]);
    const reportReady = idx.length > 0 && reportCells.every((c) => c && c.piutang != null && c.piutang_lama != null);
    const reportTotal = reportReady ? reportCells.reduce((n, c) => n + Number(c!.piutang) + Number(c!.piutang_lama), 0) : null;
    const error = [...idx.map((i) => pending[i]?.error), ...idx.map((i) => report[i]?.error)].find(Boolean);
    return { shop, orders, pendingReady, reportTotal, error };
  });
  const comparable = (r: (typeof rows)[number]) => (r.pendingReady ? sum(r.orders, "dihitung") : null);
  const total = (pick: (r: (typeof rows)[number]) => number | null) =>
    rows.every((r) => pick(r) != null) && rows.length ? rows.reduce((n, r) => n + (pick(r) ?? 0), 0) : null;
  const money = (value: number | null) => (value == null ? "—" : fmtRp(String(Math.round(value))));

  return (
    <details className="rounded-xl border bg-card p-3 text-sm" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer font-medium">Cocokkan dengan Menunggu Pencairan (cek selisih)</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Hanya membaca, tidak mengubah tabel di atas. Kedua sisi dibaca ulang per hari ini ({today}) supaya tanggal acuannya sama.
        </p>
        {!current && <p className="text-xs text-muted-foreground">Hanya tersedia untuk bulan berjalan.</p>}
        {open && current && busy && <Spinner label="Membaca Menunggu Pencairan dan Pesanan Dalam Pengiriman…" />}
        {meta.error && <p role="alert">{getApiError(meta.error)}</p>}
        {meta.data && (
          <div className="max-w-full overflow-x-auto rounded-lg border">
            <Table className="table-fixed" style={{ minWidth: 960 }} aria-label="Pencocokan menunggu pencairan dan pesanan dalam pengiriman">
              <colgroup><col style={{ width: 200 }} />{Array.from({ length: 7 }, (_, i) => <col key={i} style={{ width: 130 }} />)}</colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10">Toko</TableHead>
                  <TableHead className="text-right">Menunggu cair (semua)</TableHead>
                  <TableHead className="text-right">− Belum dikirim</TableHead>
                  <TableHead className="text-right">− Dikirim hari Minggu</TableHead>
                  <TableHead className="text-right">− Tanpa tanggal kirim*</TableHead>
                  <TableHead className="text-right">= Bisa dibandingkan</TableHead>
                  <TableHead className="text-right">Pesanan Dalam Pengiriman</TableHead>
                  <TableHead className="text-right">Selisih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const cmp = comparable(r);
                  const diff = cmp != null && r.reportTotal != null ? r.reportTotal - cmp : null;
                  return (
                    <TableRow key={r.shop.id}>
                      <TableCell className="sticky left-0 z-10 whitespace-normal bg-card">
                        {r.shop.nama}
                        {r.error ? <span className="block text-xs text-destructive">{getApiError(r.error)}</span> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.pendingReady ? sum(r.orders) : null)}<span className="block text-xs text-muted-foreground">{r.pendingReady ? `${r.orders.length} pesanan` : ""}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.pendingReady ? sum(r.orders, "belum_dikirim") : null)}<span className="block text-xs text-muted-foreground">{r.pendingReady ? `${count(r.orders, "belum_dikirim")} pesanan` : ""}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.pendingReady ? sum(r.orders, "minggu") : null)}<span className="block text-xs text-muted-foreground">{r.pendingReady ? `${count(r.orders, "minggu")} pesanan` : ""}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.pendingReady ? sum(r.orders, "tanpa_tanggal") : null)}<span className="block text-xs text-muted-foreground">{r.pendingReady ? `${count(r.orders, "tanpa_tanggal")} pesanan` : ""}</span></TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{money(cmp)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.reportTotal)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${diff != null && Math.abs(diff) >= 1 ? "text-destructive" : ""}`}>{money(diff)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell className="sticky left-0 z-10 bg-muted">Total</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total((r) => (r.pendingReady ? sum(r.orders) : null)))}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total((r) => (r.pendingReady ? sum(r.orders, "belum_dikirim") : null)))}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total((r) => (r.pendingReady ? sum(r.orders, "minggu") : null)))}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total((r) => (r.pendingReady ? sum(r.orders, "tanpa_tanggal") : null)))}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total(comparable))}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total((r) => r.reportTotal))}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(total((r) => (comparable(r) != null && r.reportTotal != null ? r.reportTotal - (comparable(r) ?? 0) : null)))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          *Pesanan tanpa tanggal kirim di rincian: Pesanan Dalam Pengiriman melacak kurirnya untuk menemukan tanggal itu, pencocokan ini tidak, jadi
          kolom ini bisa menjelaskan selisih. Selisih = Pesanan Dalam Pengiriman − "Bisa dibandingkan"; positif berarti tabel pengiriman lebih besar.
        </p>
      </div>
    </details>
  );
}
