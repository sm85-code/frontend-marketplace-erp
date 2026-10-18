import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getProductionStructure,
  saveBulkProductionStructure,
  type ProcessingPrice,
} from "@/api/processing";
import { getApiError } from "@/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import ProductionStructurePicker from "./ProductionStructurePicker";

const normalize = (size: string) =>
  size
    .trim()
    .replace(/\s+/g, "")
    .replace(/[×*]/g, "x")
    .replace(/(?<=\d)X(?=\d)/g, "x");
export default function BulkProductionStructure({
  selected,
  catalog,
  onClose,
  onSaved,
}: {
  selected: ProcessingPrice[];
  catalog: ProcessingPrice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["production-structure"],
    queryFn: getProductionStructure,
  });
  const [common, setCommon] = useState<ProcessingPrice>(() => {
    const first = selected[0];
    return selected.every(
      (p) =>
        p.structure_model_id &&
        p.structure_model_id === first.structure_model_id,
    )
      ? { ...first, ukuran: "" }
      : {
          ...first,
          category_id: "",
          product_id: "",
          structure_model_id: "",
          ukuran: "",
        };
  });
  const [rows, setRows] = useState(() =>
    selected.map((p) => ({
      id: p.id,
      version: p.version,
      ukuran: p.ukuran,
      harga: p.harga,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const nodes = q.data?.items || [];
  const model = nodes.find((n) => n.id === common.structure_model_id);
  const product = nodes.find((n) => n.id === model?.parent_id);
  const category = nodes.find((n) => n.id === product?.parent_id);
  const prefix =
    category && product && model
      ? [category.code, product.code, model.code].join(".")
      : "";
  const originals = new Map(selected.map((p) => [p.id, p]));
  const ids = new Set(rows.map((r) => r.id));
  const others = catalog.filter((p) => !ids.has(p.id) && p.kind === "produksi");
  const skus = rows.map((row) =>
    prefix && normalize(row.ukuran) ? `${prefix}.${normalize(row.ukuran)}` : "",
  );
  const errors = rows.map((row, i) => {
    const size = normalize(row.ukuran);
    if (!size || !/^[A-Za-z0-9.,xX-]+$/.test(size))
      return "Isi ukuran yang valid.";
    if (
      !/^\d{1,18}(\.\d{1,2})?$/.test(row.harga) ||
      !Number.isFinite(Number(row.harga))
    )
      return "Isi harga nol atau lebih, maksimal 2 desimal.";
    if (skus[i].length > 200) return "SKU terlalu panjang.";
    if (
      prefix &&
      (skus.some(
        (sku, j) => j !== i && sku.toLowerCase() === skus[i].toLowerCase(),
      ) ||
        others.some(
          (p) =>
            (p.structure_model_id === model?.id &&
              normalize(p.ukuran).toLowerCase() === size.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase() === skus[i].toLowerCase()),
        ))
    )
      return "Ukuran/SKU sudah digunakan pada model ini.";
    return "";
  });
  const update = (index: number, key: "ukuran" | "harga", value: string) =>
    setRows((old) =>
      old.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="processing-dialog max-h-[90dvh] overflow-y-auto sm:max-w-6xl"
        data-text-align="preserve"
      >
        <DialogHeader>
          <DialogTitle>Susun Struktur Massal</DialogTitle>
          <DialogDescription>
            {rows.length} produk dipilih. Pilih struktur sekali, lalu periksa
            ukuran dan harga setiap baris. Keluarkan baris untuk melewatinya;
            produk katalog tidak dihapus. Riwayat order tetap utuh.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              !rows.length ||
              !prefix ||
              busy ||
              editing ||
              errors.some(Boolean)
            )
              return;
            setBusy(true);
            setError("");
            try {
              const result = await saveBulkProductionStructure(
                common.structure_model_id!,
                rows,
              );
              await qc.invalidateQueries({ queryKey: ["processing-prices"] });
              toast.success(`${result.count} produk berhasil diperbarui`);
              onSaved();
            } catch (err) {
              setError(getApiError(err));
              setBusy(false);
            }
          }}
          className="min-w-0 space-y-4"
        >
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <ProductionStructurePicker
              value={common}
              onChange={(fields) => setCommon((p) => ({ ...p, ...fields }))}
              showVariant={false}
              onEditingChange={setEditing}
            />
            <div className="overflow-x-auto rounded-xl border">
              <Table
                className="min-w-[760px]"
                aria-label="Ukuran dan harga produk terpilih"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk sebelumnya</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead>Harga per unit (Rp)</TableHead>
                    <TableHead>SKU baru</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!rows.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Semua baris sudah dikeluarkan. Tutup form untuk memilih
                        produk kembali.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row, i) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-64 whitespace-normal">
                        <span className="font-medium">
                          {originals.get(row.id)?.produk}
                        </span>
                        <span className="mt-1 block break-all text-xs text-muted-foreground">
                          {originals.get(row.id)?.sku || "Belum memiliki SKU"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          aria-label={`Keluarkan ${originals.get(row.id)?.produk} ${row.ukuran}`}
                          onClick={() => {
                            setRows((current) =>
                              current.filter((r) => r.id !== row.id),
                            );
                            setError("");
                          }}
                        >
                          Keluarkan
                        </Button>
                      </TableCell>
                      <TableCell className="min-w-40">
                        <Input
                          aria-label={`Ukuran baris ${i + 1}`}
                          aria-invalid={!!errors[i]}
                          aria-describedby={
                            errors[i] ? `bulk-error-${i}` : undefined
                          }
                          required
                          maxLength={100}
                          value={row.ukuran}
                          onChange={(e) => update(i, "ukuran", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-40">
                        <Input
                          aria-label={`Harga baris ${i + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={row.harga}
                          onChange={(e) => update(i, "harga", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="max-w-80 whitespace-normal">
                        <output
                          aria-label={`SKU baris ${i + 1}`}
                          className="break-all text-sm"
                        >
                          {skus[i] || "Pilih model dan isi ukuran"}
                        </output>
                        {errors[i] && (
                          <p
                            id={`bulk-error-${i}`}
                            className="mt-1 text-xs text-destructive"
                          >
                            {errors[i]}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter className="sticky -bottom-6 z-10 border-t bg-background py-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                !rows.length ||
                busy ||
                editing ||
                !prefix ||
                errors.some(Boolean)
              }
            >
              {busy ? "Menyimpan…" : "Simpan Semua"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
