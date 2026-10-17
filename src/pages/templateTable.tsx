import type { TemplateBlock, TemplateColumn } from "@/api/documentTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SelectField } from "./processingShared";

export const tableFields: Record<string, string> = {
  tanggal: "Tanggal",
  nama_barang: "Nama barang",
  ukuran: "Ukuran",
  qty: "Qty",
  harga_barang: "Harga barang",
  biaya_pengecatan: "Biaya jasa pengecatan",
  biaya_proses: "Biaya proses pesanan",
  total: "Total",
};
const money = new Set([
  "harga_barang",
  "biaya_pengecatan",
  "biaya_proses",
  "total",
]);
export const column = (field: string, width = 20): TemplateColumn => ({
  field,
  label: tableFields[field] || field,
  width,
  align: money.has(field) ? "right" : "left",
  header_background: "#e2e8f0",
  header_color: "#172033",
  total: money.has(field),
});
export const basicColumns = () => [
  column("nama_barang", 45),
  column("qty", 10),
  column("harga_barang", 22),
  column("total", 23),
];
export const productionColumns = () => [
  column("tanggal", 15),
  column("nama_barang", 22),
  column("ukuran", 13),
  ...["harga_barang", "biaya_pengecatan", "biaya_proses", "total"].map((f) => ({
    ...column(f, 12),
    header_background: "#8299bc",
    header_color: "#ffffff",
  })),
];
export function sampleAmounts(item: TemplateBlock): Record<string, number> {
  const columns = item.columns?.length ? item.columns : basicColumns();
  const has = (field: string) => columns.some((c) => c.field === field);
  const harga_barang = 500000,
    biaya_pengecatan = has("biaya_pengecatan") ? 100000 : 0,
    biaya_proses = has("biaya_proses") ? 10000 : 0;
  return {
    harga_barang,
    biaya_pengecatan,
    biaya_proses,
    total: harga_barang + biaya_pengecatan + biaya_proses,
    qty: 1,
  };
}
export function previewAmounts(item: TemplateBlock): Record<string, string> {
  const amounts = sampleAmounts(item),
    rows = item.row_count || 3;
  const values = Object.fromEntries(
    Object.entries(amounts).map(([key, value]) => [
      `total_${key}`,
      (value * rows).toLocaleString("id-ID"),
    ]),
  );
  return {
    ...values,
    total: values.total_total,
    grand_total: values.total_total,
    subtotal: values.total_harga_barang,
  };
}
export function TemplateTable({
  item,
  preview,
}: {
  item: TemplateBlock;
  preview: boolean;
}) {
  const columns = item.columns?.length ? item.columns : basicColumns(),
    rows = item.row_count || 3;
  const weight = columns.reduce((a, c) => a + c.width, 0);
  const numeric = sampleAmounts(item);
  const sample = (field: string, n: number) =>
    money.has(field)
      ? `Rp ${numeric[field].toLocaleString("id-ID")}`
      : field === "qty"
        ? "1"
        : field === "tanggal"
          ? "17/10/2026"
          : field === "ukuran"
            ? "100x20x200"
            : `Produk contoh ${n}`;
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
        fontSize: item.font_size,
        color: item.color,
      }}
    >
      <colgroup>
        {columns.map((c, i) => (
          <col key={i} style={{ width: `${(c.width / weight) * 100}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th
              key={i}
              style={{
                background: c.header_background,
                color: c.header_color,
                textAlign: c.align,
                padding: "8px 4px",
                borderBottom: "1px solid #94a3b8",
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, n) => (
          <tr key={n}>
            {columns.map((c, i) => (
              <td
                key={i}
                style={{
                  textAlign: c.align,
                  padding: "5px 4px",
                  borderBottom: "1px solid #e2e8f0",
                  overflowWrap: "anywhere",
                }}
              >
                {preview ? sample(c.field, n + 1) : `{{${c.field}}}`}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {item.show_totals && (
        <tfoot>
          <tr>
            {columns.map((c, i) => (
              <td
                key={i}
                style={{
                  textAlign: c.align,
                  padding: "6px 4px",
                  borderTop: "2px solid #172033",
                  background: "#e2e8f0",
                  fontWeight: 700,
                  overflowWrap: "anywhere",
                }}
              >
                {i === 0
                  ? "Grand Total"
                  : c.total
                    ? preview
                      ? `Rp ${((numeric[c.field] || 0) * rows).toLocaleString("id-ID")}`
                      : c.field === "total"
                        ? "{{grand_total}}"
                        : `{{total_${c.field}}}`
                    : ""}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}
export function TableSettings({
  item,
  onChange,
}: {
  item: TemplateBlock;
  onChange: (patch: Partial<TemplateBlock>) => void;
}) {
  const columns = item.columns?.length ? item.columns : basicColumns();
  const set = (index: number, patch: Partial<TemplateColumn>) =>
    onChange({
      columns: columns.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  return (
    <div className="space-y-3 border-t pt-3">
      <h4 className="text-sm font-semibold">Kolom tabel</h4>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            columns: productionColumns(),
            show_totals: true,
            row_count: 4,
            font_size: 11,
          })
        }
      >
        Pola produksi 7 kolom
      </Button>
      <Field title="Jumlah baris contoh">
        <Input
          type="number"
          min={1}
          max={12}
          value={item.row_count || 3}
          onChange={(e) =>
            onChange({
              row_count: Math.max(1, Math.min(12, Number(e.target.value) || 1)),
            })
          }
        />
      </Field>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={!!item.show_totals}
          onChange={(e) => onChange({ show_totals: e.target.checked })}
        />
        Tampilkan baris Grand Total
      </label>
      {columns.map((c, index) => (
        <details key={index} className="rounded-lg border p-2">
          <summary className="cursor-pointer break-words text-xs font-medium">
            {index + 1}. {c.label}
          </summary>
          <div className="mt-3 space-y-2">
            <Field title={`Data kolom ${index + 1}`}>
              <SelectField
                value={c.field}
                onChange={(e) =>
                  set(index, {
                    ...column(e.target.value, c.width),
                    header_background: c.header_background,
                    header_color: c.header_color,
                  })
                }
              >
                {Object.entries(tableFields).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field title={`Judul kolom ${index + 1}`}>
              <Input
                maxLength={200}
                value={c.label}
                onChange={(e) => set(index, { label: e.target.value })}
              />
            </Field>
            <Field title={`Lebar kolom ${index + 1}`}>
              <Input
                type="number"
                min={1}
                max={100}
                value={c.width}
                onChange={(e) =>
                  set(index, {
                    width: Math.max(
                      1,
                      Math.min(100, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </Field>
            <Field title={`Perataan kolom ${index + 1}`}>
              <SelectField
                value={c.align}
                onChange={(e) =>
                  set(index, {
                    align: e.target.value as TemplateColumn["align"],
                  })
                }
              >
                <option value="left">Kiri</option>
                <option value="center">Tengah</option>
                <option value="right">Kanan</option>
              </SelectField>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field title={`Latar judul ${index + 1}`}>
                <Input
                  type="color"
                  value={c.header_background}
                  onChange={(e) =>
                    set(index, { header_background: e.target.value })
                  }
                />
              </Field>
              <Field title={`Warna judul ${index + 1}`}>
                <Input
                  type="color"
                  value={c.header_color}
                  onChange={(e) => set(index, { header_color: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={c.total}
                onChange={(e) => set(index, { total: e.target.checked })}
              />
              Jumlahkan kolom ini
            </label>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...columns];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  onChange({ columns: next });
                }}
              >
                Naik
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === columns.length - 1}
                onClick={() => {
                  const next = [...columns];
                  [next[index + 1], next[index]] = [
                    next[index],
                    next[index + 1],
                  ];
                  onChange({ columns: next });
                }}
              >
                Turun
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={columns.length === 1}
                onClick={() =>
                  onChange({ columns: columns.filter((_, i) => i !== index) })
                }
              >
                Hapus kolom
              </Button>
            </div>
          </div>
        </details>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={columns.length >= 12}
        onClick={() =>
          onChange({ columns: [...columns, column("nama_barang")] })
        }
      >
        Tambah kolom
      </Button>
    </div>
  );
}
