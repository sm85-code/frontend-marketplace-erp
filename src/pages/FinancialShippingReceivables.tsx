import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  shippingReceivables,
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

const labels = ["I", "II", "III", "IV", "V", "VI", "VII"];
const dateLabel = (date: string) =>
  new Date(date + "T12:00:00+07:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
const metrics = [
  {
    key: "piutang",
    label: "Piutang baru",
    basis: "Bruto · kiriman minggu ini",
    unknown: "piutang_tidak_pasti",
  },
  {
    key: "piutang_lama",
    label: "Piutang lama belum cair",
    basis: "Bruto · kiriman sebelum minggu ini",
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
  const data = q.data;
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
      fmtRp(value)
    );
  };
  return (
    <Card className="mt-4 min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Pesanan Dalam Pengiriman</CardTitle>
          <Button
            variant="outline"
            disabled={q.isFetching}
            onClick={() => void q.refetch()}
          >
            {q.isFetching ? "Memuat…" : "Perbarui data"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Piutang baru dan lama adalah dana yang belum cair. Pencairan
          ditampilkan terpisah.
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
            <Button variant="outline" onClick={() => void q.refetch()}>
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
                      Piutang bruto · Pencairan bersih
                    </span>
                  </TableHead>
                  {data.minggu.map((week, i) => (
                    <TableHead key={week.mulai} className="text-right">
                      <span className="block">Minggu {labels[i]}</span>
                      <span className="block text-xs font-normal">
                        {dateLabel(week.mulai)}–{dateLabel(week.akhir)}
                      </span>
                      {week.hingga >= week.mulai &&
                        week.hingga < week.akhir && (
                          <span className="block text-xs font-normal">
                            s.d. {dateLabel(week.hingga)}
                          </span>
                        )}
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
                        cells.every((cell) => cell[metric.key] !== null);
                      return (
                        <TableCell
                          key={week.mulai}
                          className="text-right tabular-nums"
                        >
                          {future(i) ? (
                            "—"
                          ) : complete ? (
                            fmtRp(
                              sumAmounts(
                                cells.map((cell) => cell[metric.key]!),
                              ),
                            )
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
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
