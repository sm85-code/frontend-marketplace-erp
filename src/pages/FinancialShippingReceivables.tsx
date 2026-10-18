import { Fragment } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  shippingReceivables,
  pendingShippingReceivables,
  type ShippingReceivableCell,
} from "@/api/financialReports";
import { fmtRp, getApiError } from "@/api/client";
import { sumAmounts } from "@/lib/financialAmounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/Spinner";

const dateLabel = (date: string) =>
  new Date(date + "T12:00:00+07:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
const metrics = [
  {
    key: "piutang",
    label: "Piutang baru",
    basis: "Estimasi · kiriman minggu ini",
    unknown: "piutang_tidak_pasti",
  },
  {
    key: "piutang_lama",
    label: "Piutang lama belum cair",
    basis: "Estimasi · kiriman sebelum minggu ini",
    unknown: "piutang_lama_tidak_pasti",
  },
  {
    key: "cair_minggu_lalu",
    label: "Kiriman minggu lalu cair",
    basis: "Bersih · cair pada minggu ini",
    unknown: "cair_tidak_terpetakan",
  },
] as const;

export default function FinancialShippingReceivables({
  month,
  columns,
  until,
}: {
  month: string;
  columns: number;
  until?: string;
}) {
  const q = useQuery({
    queryKey: ["financial-shipping-receivables", month, columns, until],
    queryFn: () => shippingReceivables(month, columns, until),
    enabled: columns > 0,
  });
  const accounts = q.data?.toko.flatMap((shop) => shop.akun_ids ?? []) ?? [];
  const pending = useQueries({
    queries: accounts.map((account) => ({
      queryKey: ["financial-pending-shipping", account, month, columns, until],
      queryFn: () => pendingShippingReceivables(account, month, columns, until),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const fetching = q.isFetching || pending.some((result) => result.isFetching);
  const data = q.data && {
    ...q.data,
    toko: q.data.toko.map((shop) => {
      const results = (shop.akun_ids ?? []).map(
        (id) => pending[accounts.indexOf(id)],
      );
      const loaded =
        results.length > 0 && results.every((result) => !!result?.data);
      return {
        ...shop,
        fast: results.some(result => result?.data?.dana_cepat),
      loading: results.some((result) => result?.isPending),
        failed: results.some((result) => !!result?.error),
        partial: results.some(
          (result) => result?.data?.halaman_lengkap === false,
        ),
        unmapped: results.reduce(
          (n, result) => n + (result?.data?.tanpa_tanggal_kirim ?? 0),
          0,
        ),
        minggu: shop.minggu.map((_, i) => {
          const cells = results.flatMap((result) =>
            result?.data ? [result.data.minggu[i]] : [],
          );
          const cell: ShippingReceivableCell = {
            piutang: null,
            piutang_lama: null,
            cair_minggu_lalu: null,
            piutang_tidak_pasti: 0,
            piutang_lama_tidak_pasti: 0,
            cair_tidak_terpetakan: 0,
          };
          for (const key of ["utang_dana_cepat", "biaya_dana_cepat"] as const) {
            if (cells.some((c) => c[key] != null))
              cell[key] = loaded && cells.every((c) => c[key] != null) ? sumAmounts(cells.map((c) => c[key]!)) : null;
          }
          for (const metric of metrics) {
            cell[metric.key] =
              loaded && cells.every((c) => c[metric.key] !== null)
                ? sumAmounts(cells.map((c) => c[metric.key]!))
                : null;
            cell[metric.unknown] = cells.reduce(
              (n, c) => n + c[metric.unknown],
              0,
            );
          }
          return cell;
        }),
      };
    }),
  };
  const refresh = () => {
    void q.refetch();
    pending.forEach((result) => {
      void result.refetch();
    });
  };
  // Separate figures for neraca / pemasukan: total receivable at each Saturday cutoff and its change from the previous
  // week. Only shown when every shop's new + old receivable cells are known and certain; never a partial subtotal.
  const totalPiutang = (data?.minggu ?? []).map((week, i) => {
    if (!data || week.hingga < week.mulai || data.toko.length === 0) return null;
    const values: string[] = [];
    for (const shop of data.toko) {
      const cell = shop.minggu[i];
      if (shop.loading || shop.failed || shop.partial || shop.unmapped) return null;
      if (cell.piutang === null || cell.piutang_lama === null) return null;
      if (cell.piutang_tidak_pasti || cell.piutang_lama_tidak_pasti) return null;
      values.push(cell.piutang, cell.piutang_lama);
    }
    return sumAmounts(values);
  });
  const changePiutang = totalPiutang.map((total, i) =>
    total !== null && i > 0 && totalPiutang[i - 1] !== null
      ? sumAmounts([total, "-" + totalPiutang[i - 1]!.replace(/^-/, "")])
      : null,
  );
  // Dana Cepat is a loan: its payable goes to the neraca (liabilities), its change reduces pemasukan, the fee is an expense.
  const fastShops = data?.toko.filter((shop) => shop.fast) ?? [];
  const fastSum = (key: "utang_dana_cepat" | "biaya_dana_cepat") =>
    (data?.minggu ?? []).map((week, i) => {
      if (week.hingga < week.mulai || fastShops.length === 0) return null;
      const values: string[] = [];
      for (const shop of fastShops) {
        const value = shop.minggu[i][key];
        if (shop.loading || shop.failed || value == null) return null;
        values.push(value);
      }
      return sumAmounts(values);
    });
  const utangDanaCepat = fastSum("utang_dana_cepat");
  const biayaDanaCepat = fastSum("biaya_dana_cepat");
  const changeUtang = utangDanaCepat.map((total, i) =>
    total !== null && i > 0 && utangDanaCepat[i - 1] !== null
      ? sumAmounts([total, "-" + utangDanaCepat[i - 1]!.replace(/^-/, "")])
      : null,
  );
  const future = (i: number) =>
    !!data && data.minggu[i].hingga < data.minggu[i].mulai;
  const amount = (
    cell: ShippingReceivableCell,
    metric: (typeof metrics)[number],
    i: number,
  ) => {
    if (future(i)) return <span className="text-muted-foreground">—</span>;
    const value = cell[metric.key];
    return value === null ? (
      <span
        className="text-xs font-normal text-muted-foreground"
        title={
          cell[metric.unknown]
            ? `${cell[metric.unknown]} pesanan belum memiliki data kirim/pencairan lengkap`
            : "Data toko belum tersedia"
        }
      >
        {cell[metric.unknown]
          ? `Belum lengkap (${cell[metric.unknown]})`
          : "Belum tersedia"}
      </span>
    ) : (
      <span>
        {fmtRp(value)}
        {cell[metric.unknown] > 0 && (
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            + {cell[metric.unknown]} belum terpetakan
          </span>
        )}
      </span>
    );
  };
  return (
    <Card className="mt-4 min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Pesanan Dalam Pengiriman</CardTitle>
          <Button variant="outline" disabled={fetching} onClick={refresh}>
            {fetching ? "Memuat…" : "Perbarui data"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Sumber: Menunggu cair Shopee. Barang yang sudah diterima tetap menjadi
          piutang sampai dana cair.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        {q.isLoading && <Spinner label="Memuat piutang pengiriman…" />}
        {q.error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span>{getApiError(q.error)}</span>
            <Button variant="outline" onClick={refresh}>
              Coba lagi
            </Button>
          </div>
        )}
        {data && (
          <div className="relative max-h-[70dvh] max-w-full overflow-auto rounded-xl border">
            <Table
              aria-label="PESANAN DALAM PENGIRIMAN"
              className="table-fixed"
              style={{ minWidth: 250 + data.minggu.length * 175 }}
            >
              <colgroup>
                <col style={{ width: 250 }} />
                {data.minggu.map((w) => (
                  <col key={w.mulai} style={{ width: 175 }} />
                ))}
              </colgroup>
              <TableHeader className="sticky top-0 z-20 bg-muted">
                <TableRow>
                  <TableHead className="sticky left-0 z-30 bg-muted">
                    Toko / Jenis dana
                    <span className="mt-1 block text-xs font-normal">
                      Piutang estimasi · Pencairan riil
                    </span>
                  </TableHead>
                  {data.minggu.map((week) => (
                    <TableHead key={week.mulai} className="text-right">
                      <span className="block">Periode</span>
                      <span className="block text-xs font-normal">
                        {dateLabel(week.mulai)}–{dateLabel(week.akhir)}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.toko.map((shop) => (
                  <Fragment key={shop.id}>
                    {metrics.map((metric, index) => (
                      <TableRow
                        key={metric.key}
                        className={
                          index === 0
                            ? "border-t-2 border-border bg-card"
                            : "bg-card"
                        }
                      >
                        <TableCell className="sticky left-0 z-10 whitespace-normal bg-card align-top">
                          {index === 0 && (
                            <div className="mb-3">
                              <span className="font-semibold">{shop.nama}</span>
                              {shop.fast && <span className="mt-1 block text-xs text-muted-foreground">Dana Cepat · mutasi saldo</span>}
                              
                              {shop.loading && (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Memuat dana Shopee…
                                </span>
                              )}
                              {shop.failed && (
                                <span className="mt-1 block text-xs text-destructive">
                                  Gagal membaca Shopee · klik Perbarui data
                                </span>
                              )}
                              {shop.partial && (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Sebagian halaman belum terkonfirmasi
                                </span>
                              )}
                              {shop.unmapped > 0 && (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  {shop.unmapped} pesanan belum memiliki tanggal
                                  kirim
                                </span>
                              )}
                              {!shop.akun_ditemukan && (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Akun toko belum ditemukan
                                </span>
                              )}
                            </div>
                          )}
                          <span
                            className={
                              index === 2
                                ? "block text-sm font-medium text-primary"
                                : "block text-sm font-medium"
                            }
                          >
                            {metric.label}
                          </span>
                        </TableCell>
                        {shop.minggu.map((cell, i) => (
                          <TableCell
                            key={i}
                            className="text-right align-bottom tabular-nums"
                          >
                            {amount(cell, metric, i)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
                {metrics.map((metric) => (
                  <TableRow
                    key={"total-" + metric.key}
                    className="bg-muted/60 font-semibold"
                  >
                    <TableCell className="sticky left-0 z-10 whitespace-normal bg-muted">
                      Total {metric.label.toLowerCase()}
                    </TableCell>
                    {data.minggu.map((week, i) => {
                      const cells = data.toko.map((shop) => shop.minggu[i]);
                      const complete =
                        cells.length > 0 &&
                        cells.every(
                          (cell) =>
                            cell[metric.key] !== null &&
                            cell[metric.unknown] === 0,
                        );
                      return (
                        <TableCell
                          key={week.mulai}
                          className="text-right tabular-nums"
                        >
                          {future(i) ? (
                            "—"
                          ) : cells.some(
                              (cell) => cell[metric.key] !== null,
                            ) ? (
                            <span>
                              {fmtRp(
                                sumAmounts(
                                  cells.flatMap((cell) => cell[metric.key] === null ? [] : [cell[metric.key]!]),
                                ),
                              )}
                              {(!complete ||
                                data.toko.some(
                                  (shop) => shop.partial || shop.unmapped,
                                )) && (
                                <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">
                                  Subtotal data terbaca
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs font-normal text-muted-foreground">
                              Belum lengkap
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {[
                  { label: "Total piutang (untuk neraca)", values: totalPiutang, change: false },
                  { label: "Perubahan piutang (untuk pemasukan)", values: changePiutang, change: true },
                  ...(fastShops.length > 0
                    ? [
                        { label: "Utang Dana Cepat (untuk neraca)", values: utangDanaCepat, change: false },
                        { label: "Perubahan utang Dana Cepat (untuk pemasukan, dikurangkan)", values: changeUtang, change: true },
                        { label: "Biaya Dana Cepat 0,5% (beban)", values: biayaDanaCepat, change: false },
                      ]
                    : []),
                ].map((row) => (
                  <TableRow key={row.label} className="border-t-2 bg-muted/60 font-semibold">
                    <TableCell className="sticky left-0 z-10 whitespace-normal bg-muted">{row.label}</TableCell>
                    {data.minggu.map((week, i) => (
                      <TableCell key={week.mulai} className="text-right tabular-nums">
                        {future(i) || (row.change && i === 0) ? (
                          "—"
                        ) : row.values[i] !== null ? (
                          fmtRp(row.values[i]!)
                        ) : (
                          <span className="text-xs font-normal text-muted-foreground">Belum lengkap</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
