import { Fragment, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  shippingReceivables,
  pendingShippingReceivables,
  type DanaCepatRincian,
  type ShippingReceivableCell,
} from "@/api/financialReports";
import { fmtRp, getApiError } from "@/api/client";
import { sumAmounts } from "@/lib/financialAmounts";
import { hariIniWib, rentang, tambahHari } from "@/lib/tanggal";
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
import { useScrollKeAktif } from "@/components/PeriodPicker";

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
        partialNote: results.map((result) => result?.data?.catatan_halaman).find(Boolean),
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
          const parts = cells.map((c) => c.rincian_dana_cepat);
          if (loaded && parts.length > 0 && parts.every((p) => p != null)) {
            const sum = (key: "pencairan" | "pencairan_lanjutan" | "pelunasan" | "retur" | "utang_sebelum_nol" | "tanpa_pencairan") => sumAmounts(parts.map((p) => p![key]));
            cell.rincian_dana_cepat = {
              pencairan: sum("pencairan"),
              pencairan_lanjutan: sum("pencairan_lanjutan"),
              pelunasan: sum("pelunasan"),
              retur: sum("retur"),
              utang_sebelum_nol: sum("utang_sebelum_nol"),
              tanpa_pencairan: sum("tanpa_pencairan"),
              paling_awal: parts.map((p) => p!.paling_awal).filter((d): d is string => !!d).sort()[0] ?? null,
            };
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
  const totalDetail = (data?.minggu ?? []).map((week, i): { value: string | null; reason: string | null } => {
    if (!data || week.hingga < week.mulai || data.toko.length === 0) return { value: null, reason: null };
    const values: string[] = [];
    for (const shop of data.toko) {
      const cell = shop.minggu[i];
      const why = (reason: string) => ({ value: null, reason: `${shop.nama}: ${reason}` });
      if (shop.loading) return why("masih memuat");
      if (shop.failed) return why("gagal dibaca");
      if (shop.partial) return why(`halaman Shopee belum lengkap${shop.partialNote ? ` (${shop.partialNote})` : ""}`);
      if (shop.unmapped) return why(`${shop.unmapped} pesanan belum punya tanggal kirim`);
      if (cell.piutang === null || cell.piutang_lama === null) return why("data minggu ini belum tersedia");
      if (cell.piutang_tidak_pasti || cell.piutang_lama_tidak_pasti)
        return why(`${cell.piutang_tidak_pasti + cell.piutang_lama_tidak_pasti} pesanan belum pasti nilainya`);
      values.push(cell.piutang, cell.piutang_lama);
    }
    return { value: sumAmounts(values), reason: null };
  });
  const totalPiutang = totalDetail.map((d) => d.value);
  const totalReasons = totalDetail.map((d) => d.reason);
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
  const rincianSum = (key: keyof DanaCepatRincian) =>
    (data?.minggu ?? []).map((week, i) => {
      if (week.hingga < week.mulai || fastShops.length === 0) return null;
      const values: string[] = [];
      for (const shop of fastShops) {
        const value = shop.minggu[i].rincian_dana_cepat?.[key]
        if (shop.loading || shop.failed || value == null) return null;
        values.push(value);
      }
      return sumAmounts(values);
    });
  const earliestMovement = (data?.minggu ?? []).map((_, i) =>
    fastShops.map((shop) => shop.minggu[i].rincian_dana_cepat?.paling_awal).filter((d): d is string => !!d).sort()[0] ?? null,
  );
  const ignoredMovements = Object.entries(
    pending.reduce<Record<string, number>>((all, result) => {
      for (const [label, n] of Object.entries(result.data?.mutasi_lain ?? {})) all[label] = (all[label] ?? 0) + n;
      return all;
    }, {}),
  );
  const utangDanaCepat = fastSum("utang_dana_cepat");
  const biayaDanaCepat = fastSum("biaya_dana_cepat");
  const changeUtang = utangDanaCepat.map((total, i) =>
    total !== null && i > 0 && utangDanaCepat[i - 1] !== null
      ? sumAmounts([total, "-" + utangDanaCepat[i - 1]!.replace(/^-/, "")])
      : null,
  );
  const danaCepatRincian = [
    { label: "↳ Pencairan Dana Cepat (kumulatif)", values: rincianSum("pencairan") },
    { label: "↳ Pencairan lanjutan (kumulatif)", values: rincianSum("pencairan_lanjutan") },
    { label: "↳ Pelunasan (kumulatif)", values: rincianSum("pelunasan") },
    { label: "↳ Potongan Dana Cepat (kumulatif)", values: rincianSum("retur") },
    { label: "↳ Potongan tanpa pencairan terbaca (diabaikan)", values: rincianSum("tanpa_pencairan") },
    { label: "↳ Utang per pesanan, sebelum dikoreksi", values: rincianSum("utang_sebelum_nol") },
  ].map((row) => ({ ...row, change: false, detail: true }));
  const [picked, setPicked] = useState<number | null>(null);
  const future = (i: number) =>
    !!data && data.minggu[i].hingga < data.minggu[i].mulai;
  const lastShown = data ? data.minggu.reduce((n, _, i) => (future(i) ? n : i), 0) : 0;
  const today = hariIniWib();
  const currentWeek = data ? data.minggu.findIndex((w) => w.mulai <= today && today <= tambahHari(w.mulai, 6)) : -1;
  const pick = picked ?? (currentWeek >= 0 && !future(currentWeek) ? currentWeek : lastShown);
  const pillRow = useScrollKeAktif(pick);
  const phoneHide = (i: number) => (i === pick ? "" : "max-md:hidden");
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
          <>
          <div ref={pillRow} className="relative flex gap-2 overflow-x-auto pb-3 md:hidden" role="tablist" aria-label="Pilih periode">
            {data.minggu.map((w, i) => (
              <button key={w.mulai} type="button" role="tab" aria-selected={pick === i} onClick={() => setPicked(i)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-center text-xs ${pick === i ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                <span className="block font-medium">Periode</span>
                <span className="block opacity-80">{rentang(w.mulai, w.akhir)}</span>
              </button>
            ))}
          </div>
          <div className="relative max-w-full overflow-x-auto rounded-xl border">
            <Table
              aria-label="PESANAN DALAM PENGIRIMAN"
              className="table-fixed md:min-w-[calc(250px+var(--n)*175px)]"
              style={{ "--n": data.minggu.length } as React.CSSProperties}
            >
              <colgroup>
                <col className="max-md:w-[55%] md:w-[250px]" />
                {data.minggu.map((w, i) => (
                  <col key={w.mulai} className={`md:w-[175px] ${phoneHide(i)}`} />
                ))}
              </colgroup>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="bg-muted md:sticky md:left-0 md:z-30">
                    Toko / Jenis dana
                    <span className="mt-1 block text-xs font-normal">
                      Piutang estimasi · Pencairan riil
                    </span>
                  </TableHead>
                  {data.minggu.map((week) => (
                    <TableHead key={week.mulai} className={`text-center ${phoneHide(data.minggu.indexOf(week))}`}>
                      <span className="block">Periode</span>
                      <span className="block text-xs font-normal">
                        {rentang(week.mulai, week.akhir)}
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
                        <TableCell className="whitespace-normal bg-card align-top md:sticky md:left-0 md:z-10">
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
                            className={`text-right align-bottom tabular-nums ${phoneHide(i)}`}
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
                    <TableCell className="whitespace-normal bg-muted md:sticky md:left-0 md:z-10">
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
                          className={`text-right tabular-nums ${phoneHide(i)}`}
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
                  { label: "Total piutang (untuk neraca)", values: totalPiutang, change: false, reasons: totalReasons },
                  { label: "Perubahan piutang (untuk pemasukan)", values: changePiutang, change: true, reasons: totalReasons.map((r, i) => r ?? (i > 0 ? totalReasons[i - 1] : null)) },
                  ...(fastShops.length > 0
                    ? [
                        { label: "Utang Dana Cepat (untuk neraca)", values: utangDanaCepat, change: false },
                        { label: "Perubahan utang Dana Cepat (untuk pemasukan, dikurangkan)", values: changeUtang, change: true },
                        { label: "Biaya Dana Cepat 0,5% (beban)", values: biayaDanaCepat, change: false },
                        ...danaCepatRincian,
                      ]
                    : []),
                ].map((row) => (
                  <TableRow key={row.label} className={"detail" in row ? "text-sm text-muted-foreground" : "border-t-2 bg-muted/60 font-semibold"}>
                    <TableCell className={`whitespace-normal md:sticky md:left-0 md:z-10 ${"detail" in row ? "bg-card pl-6" : "bg-muted"}`}>{row.label}</TableCell>
                    {data.minggu.map((week, i) => (
                      <TableCell key={week.mulai} className={`text-right tabular-nums ${phoneHide(i)}`}>
                        {future(i) || (row.change && i === 0) ? (
                          "—"
                        ) : row.values[i] !== null ? (
                          fmtRp(row.values[i]!)
                        ) : (
                          <span className="text-xs font-normal text-muted-foreground">
                            Belum lengkap
                            {"reasons" in row && row.reasons?.[i] ? <span className="block whitespace-normal">{row.reasons[i]}</span> : null}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {fastShops.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Rincian Dana Cepat: mutasi dompet dibaca sejak {earliestMovement.find((d) => d) ?? "—"}.
              {ignoredMovements.length > 0 && ` Mutasi lain yang diabaikan (jenis/tab × jumlah): ${ignoredMovements.map(([label, n]) => `${label} × ${n}`).join(", ")}.`}
            </p>
          )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
