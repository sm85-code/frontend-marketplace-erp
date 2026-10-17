import type { TemplateBlock } from "@/api/documentTemplates";
import { Image } from "lucide-react";
import { TemplateTable } from "./templateTable";
function renderText(
  text: string,
  preview: boolean,
  overrides: Record<string, string> = {},
) {
  if (!preview) return text;
  const sample: Record<string, string> = {
    nama_usaha: "Nama Usaha",
    alamat_usaha: "Alamat usaha · Telepon / Email",
    nomor_dokumen: "CONTOH-001",
    tanggal: "17/10/2026",
    nama_pelanggan: "Pelanggan Contoh",
    alamat_pelanggan: "Alamat pelanggan",
    nama_supplier: "Supplier Contoh",
    alamat_supplier: "Alamat supplier",
    subtotal: "1.500.000",
    total: "1.500.000",
    catatan: "Terima kasih atas kerja samanya.",
    periode_mulai: "12/10/2026",
    periode_akhir: "17/10/2026",
    minggu_ke: "Minggu ke-3 Oktober",
    jatuh_tempo: "20/10/2026",
    informasi_pembayaran:
      "Pembayaran melalui transfer sesuai tanggal jatuh tempo.",
    rekening: "Rekening usaha",
    ...overrides,
  };
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (original, key) => sample[key] ?? original,
  );
}
export default function BlockContent({
  item,
  preview,
  sample,
}: {
  item: TemplateBlock;
  preview: boolean;
  sample?: Record<string, string>;
}) {
  if (item.kind === "line")
    return (
      <div
        className="w-full"
        style={{ borderTop: `2px solid ${item.color}` }}
      />
    );
  if (item.kind === "logo")
    return item.image_url ? (
      <img
        src={item.image_url}
        alt="Logo dokumen"
        draggable={false}
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
      />
    ) : (
      <div className="flex h-full items-center justify-center gap-2 border border-dashed border-slate-300 text-slate-400">
        <Image size={20} />
        Logo
      </div>
    );
  if (item.kind === "table")
    return <TemplateTable item={item} preview={preview} />;
  return (
    <div className="h-full whitespace-pre-wrap break-words">
      {renderText(item.text, preview, sample)}
    </div>
  );
}
