import type { TemplateBlock, DocumentKind } from "@/api/documentTemplates";
const WIDTH = 794,
  HEIGHT = 1123;
export const labels = {
  text: "Teks",
  logo: "Logo",
  line: "Garis",
  table: "Tabel barang",
  total: "Total",
};
export const fields = [
  "nama_usaha",
  "alamat_usaha",
  "nomor_dokumen",
  "tanggal",
  "nama_pelanggan",
  "alamat_pelanggan",
  "nama_supplier",
  "alamat_supplier",
  "subtotal",
  "total",
  "catatan",
  "periode_mulai",
  "periode_akhir",
  "minggu_ke",
  "jatuh_tempo",
  "informasi_pembayaran",
  "rekening",
  "total_harga_barang",
  "total_biaya_pengecatan",
  "total_biaya_proses",
  "grand_total",
];
export function block(
  kind: TemplateBlock["kind"],
  x = 48,
  y = 80,
): TemplateBlock {
  const sizes = {
    text: [320, 60],
    logo: [140, 80],
    line: [698, 8],
    table: [698, 190],
    total: [280, 80],
  };
  const [width, height] = sizes[kind];
  return {
    id: crypto.randomUUID(),
    kind,
    x: Math.min(x, WIDTH - width),
    y: Math.min(y, HEIGHT - height),
    width,
    height,
    text:
      kind === "text"
        ? "Teks baru"
        : kind === "total"
          ? "TOTAL\nRp {{total}}"
          : "",
    font_size: 14,
    bold: kind === "total",
    align: kind === "total" ? "right" : "left",
    color: "#172033",
    image_url: "",
  };
}
export function defaults(kind: DocumentKind): TemplateBlock[] {
  const text = (
    x: number,
    y: number,
    width: number,
    height: number,
    value: string,
    size = 14,
    bold = false,
  ): TemplateBlock => ({
    ...block("text"),
    x,
    y,
    width,
    height,
    text: value,
    font_size: size,
    bold,
  });
  return [
    text(48, 48, 440, 40, "{{nama_usaha}}", 24, true),
    text(48, 92, 440, 60, "{{alamat_usaha}}"),
    text(
      490,
      48,
      256,
      42,
      kind === "INV" ? "INVOICE" : "PURCHASE ORDER",
      24,
      true,
    ),
    text(490, 100, 256, 72, "No. {{nomor_dokumen}}\nTanggal: {{tanggal}}"),
    { ...block("line", 48, 184) },
    text(
      48,
      212,
      698,
      92,
      kind === "INV"
        ? "Tagihan kepada:\n{{nama_pelanggan}}\n{{alamat_pelanggan}}"
        : "Kepada supplier:\n{{nama_supplier}}\n{{alamat_supplier}}",
    ),
    { ...block("table", 48, 338) },
    { ...block("total", 466, 566) },
    text(48, 708, 698, 100, "Catatan:\n{{catatan}}"),
    text(500, 900, 246, 100, "Hormat kami,\n\n\n{{nama_usaha}}"),
  ];
}
export function elementName(item: TemplateBlock) {
  if (item.name?.trim()) return item.name;
  if (item.kind === "logo") return "Logo perusahaan";
  if (item.kind === "text" || item.kind === "total")
    return (
      item.text
        .split("\n")[0]
        .replace(/\{\{(\w+)\}\}/g, (_, key: string) => key.replaceAll("_", " "))
        .trim()
        .slice(0, 45) || labels[item.kind]
    );
  return labels[item.kind];
}
