import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Grip,
  Image,
  Minus,
  Plus,
  Redo2,
  Save,
  Table2,
  Trash2,
  Type,
  Undo2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getApiError } from "@/api/client";
import {
  getDocumentTemplate,
  saveDocumentTemplate,
  type DocumentKind,
  type TemplateBlock,
  type TemplateData,
} from "@/api/documentTemplates";
import { BarHalaman } from "@/components/daftar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Spinner from "@/components/Spinner";
import { Field, SelectField } from "./processingShared";

const WIDTH = 794,
  HEIGHT = 1123;
const labels = {
  text: "Teks",
  logo: "Logo",
  line: "Garis",
  table: "Tabel barang",
  total: "Total",
};
const fields = [
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
];
function block(kind: TemplateBlock["kind"], x = 48, y = 80): TemplateBlock {
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
function defaults(kind: DocumentKind): TemplateBlock[] {
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
function renderText(text: string, preview: boolean) {
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
  };
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (original, key) => sample[key] ?? original,
  );
}
function BlockContent({
  item,
  preview,
}: {
  item: TemplateBlock;
  preview: boolean;
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
    return (
      <table
        className="w-full border-collapse text-left"
        style={{ fontSize: item.font_size, color: item.color }}
      >
        <thead>
          <tr style={{ background: "#f0f3f6" }}>
            {["Produk / Keterangan", "Qty", "Harga", "Jumlah"].map((t) => (
              <th
                key={t}
                className="border-b border-slate-300 px-3 py-3 font-semibold"
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((n) => (
            <tr key={n}>
              {[
                preview ? `Produk contoh ${n}` : `{{produk_${n}}}`,
                preview ? "1" : "{{qty}}",
                preview ? "500.000" : "{{harga}}",
                preview ? "500.000" : "{{jumlah}}",
              ].map((t, i) => (
                <td key={i} className="border-b border-slate-200 px-3 py-3">
                  {t}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <div className="h-full whitespace-pre-wrap break-words">
      {renderText(item.text, preview)}
    </div>
  );
}
function TemplateEditor({ initial }: { initial: TemplateData }) {
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    () => initial.blocks ?? defaults(initial.kind),
  );
  const [version, setVersion] = useState(initial.version);
  const [saved, setSaved] = useState(
    initial.blocks === null ? "" : JSON.stringify(initial.blocks),
  );
  const [selected, setSelected] = useState("");
  const [undo, setUndo] = useState<TemplateBlock[][]>([]),
    [redo, setRedo] = useState<TemplateBlock[][]>([]);
  const [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(0);
  const viewport = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    px: number;
    py: number;
    before: TemplateBlock[];
    latest: TemplateBlock[];
    mode: "move" | "resize";
  } | null>(null);
  const current = blocks.find((b) => b.id === selected);
  const initialDesign = useRef(JSON.stringify(blocks));
  const dirty = JSON.stringify(blocks) !== saved;
  const warnUnsaved =
    dirty && (version > 0 || JSON.stringify(blocks) !== initialDesign.current);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width > 0) setScale(zoom || Math.min(1, (width - 24) / WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [zoom]);
  useEffect(() => {
    if (!warnUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [warnUnsaved]);
  const commit = (next: TemplateBlock[]) => {
    setUndo((v) => [...v.slice(-39), blocks]);
    setRedo([]);
    setBlocks(next);
  };
  const update = (patch: Partial<TemplateBlock>) => {
    if (!current) return;
    const next = { ...current, ...patch };
    next.width = Math.max(20, Math.min(WIDTH, next.width));
    next.height = Math.max(8, Math.min(HEIGHT, next.height));
    next.x = Math.max(0, Math.min(WIDTH - next.width, next.x));
    next.y = Math.max(0, Math.min(HEIGHT - next.height, next.y));
    commit(blocks.map((b) => (b.id === current.id ? next : b)));
  };
  const add = (kind: TemplateBlock["kind"], x = 48, y = 80) => {
    if (blocks.length >= 100) return;
    const item = block(
      kind,
      Math.round(Math.max(0, x)),
      Math.round(Math.max(0, y)),
    );
    commit([...blocks, item]);
    setSelected(item.id);
    setPreview(false);
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await saveDocumentTemplate(initial.kind, version, blocks);
      setVersion(result.version);
      queryClient.setQueryData(["processing-document-template", initial.kind], {
        kind: initial.kind,
        version: result.version,
        blocks,
      });
      setSaved(JSON.stringify(blocks));
      toast.success(`Template ${initial.kind} tersimpan`);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setBusy(false);
    }
  };
  const panel = "min-w-0 space-y-4 rounded-2xl border bg-card p-4";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold">
            Desain {initial.kind === "INV" ? "Invoice" : "Purchase Order"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A4 ·{" "}
            {dirty
              ? "Perubahan belum disimpan"
              : `Tersimpan · versi ${version}`}{" "}
            · {blocks.length} elemen
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Urungkan"
            disabled={!undo.length || busy}
            onClick={() => {
              setRedo((v) => [...v, blocks]);
              setBlocks(undo[undo.length - 1]);
              setUndo((v) => v.slice(0, -1));
            }}
          >
            <Undo2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Ulangi"
            disabled={!redo.length || busy}
            onClick={() => {
              setUndo((v) => [...v, blocks]);
              setBlocks(redo[redo.length - 1]);
              setRedo((v) => v.slice(0, -1));
            }}
          >
            <Redo2 size={16} />
          </Button>
          <Button
            variant={preview ? "secondary" : "outline"}
            disabled={busy}
            onClick={() => setPreview((v) => !v)}
          >
            <Eye size={16} />
            {preview ? "Kembali edit" : "Pratinjau"}
          </Button>
          <Button disabled={busy || !dirty} onClick={() => void save()}>
            <Save size={16} />
            {busy ? "Menyimpan…" : "Simpan desain"}
          </Button>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[170px_minmax(0,1fr)_250px]">
        <aside className={panel}>
          <h3 className="text-sm font-semibold">Tambah elemen</h3>
          <p className="text-xs text-muted-foreground">
            Klik untuk menambah, atau seret ke kertas.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-1">
            {(Object.keys(labels) as TemplateBlock["kind"][]).map((kind) => {
              const Icon = {
                text: Type,
                logo: Image,
                line: Minus,
                table: Table2,
                total: Plus,
              }[kind];
              return (
                <Button
                  key={kind}
                  type="button"
                  variant="outline"
                  draggable={!busy}
                  disabled={busy || blocks.length >= 100}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/x-erp-template-element",
                      kind,
                    )
                  }
                  onClick={() => add(kind)}
                  className="justify-start gap-2 text-xs"
                >
                  <Icon size={15} />
                  {labels[kind]}
                </Button>
              );
            })}
          </div>
        </aside>
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {preview
                ? "Pratinjau dengan data contoh"
                : "Kanvas A4 · geser elemen untuk mengatur posisi"}
            </span>
            <SelectField
              aria-label="Pembesaran kanvas"
              className="h-9 w-28 min-w-0 shrink-0"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value="0">Otomatis</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
            </SelectField>
          </div>
          <div
            ref={viewport}
            className="min-w-0 overflow-auto rounded-2xl border bg-muted/50 py-3"
          >
            <div
              className="relative mx-auto"
              style={{ width: WIDTH * scale, height: HEIGHT * scale }}
            >
              <div
                ref={canvas}
                aria-label={`Kanvas template ${initial.kind}`}
                className="absolute left-0 top-0 origin-top-left bg-white text-slate-900 shadow-sm"
                style={{
                  width: WIDTH,
                  height: HEIGHT,
                  transform: `scale(${scale})`,
                  fontFamily: "Arial, sans-serif",
                }}
                onDragOver={(e) => {
                  if (!busy && !preview) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (busy || preview) return;
                  e.preventDefault();
                  const kind = e.dataTransfer.getData(
                    "application/x-erp-template-element",
                  );
                  if (Object.hasOwn(labels, kind)) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    add(
                      kind as TemplateBlock["kind"],
                      (e.clientX - rect.left) / scale,
                      (e.clientY - rect.top) / scale,
                    );
                  }
                }}
              >
                {blocks.map((item) => {
                  const active = selected === item.id && !preview;
                  const style: CSSProperties = {
                    position: "absolute",
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    fontSize: item.font_size,
                    fontWeight: item.bold ? 700 : 400,
                    textAlign: item.align,
                    color: item.color,
                    overflow: "hidden",
                    outline: active ? "2px solid #16a34a" : undefined,
                    outlineOffset: 2,
                    cursor: preview ? "default" : "move",
                    touchAction: preview ? "auto" : "none",
                    userSelect: "none",
                  };
                  return (
                    <div
                      key={item.id}
                      role={preview ? undefined : "button"}
                      tabIndex={preview ? -1 : 0}
                      aria-label={`${labels[item.kind]} ${item.text.slice(0, 40) || item.id}`}
                      aria-pressed={preview ? undefined : active}
                      data-template-element={item.id}
                      style={style}
                      onPointerDown={(e) => {
                        if (preview || busy || e.button !== 0) return;
                        e.preventDefault();
                        e.currentTarget.focus();
                        setSelected(item.id);
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drag.current = {
                          id: item.id,
                          x: item.x,
                          y: item.y,
                          px: e.clientX,
                          py: e.clientY,
                          before: blocks,
                          latest: blocks,
                          mode: "move",
                        };
                      }}
                      onPointerMove={(e) => {
                        const d = drag.current;
                        if (!d || d.id !== item.id) return;
                        if (d.mode === "resize") {
                          const original = d.before.find(
                            (b) => b.id === item.id,
                          )!;
                          const width = Math.round(
                            Math.max(
                              20,
                              Math.min(
                                WIDTH - original.x,
                                original.width + (e.clientX - d.px) / scale,
                              ),
                            ),
                          );
                          const height = Math.round(
                            Math.max(
                              8,
                              Math.min(
                                HEIGHT - original.y,
                                original.height + (e.clientY - d.py) / scale,
                              ),
                            ),
                          );
                          d.latest = d.before.map((b) =>
                            b.id === item.id ? { ...b, width, height } : b,
                          );
                          setBlocks(d.latest);
                          return;
                        }
                        const x = Math.round(
                          Math.max(
                            0,
                            Math.min(
                              WIDTH - item.width,
                              d.x + (e.clientX - d.px) / scale,
                            ),
                          ),
                        );
                        const y = Math.round(
                          Math.max(
                            0,
                            Math.min(
                              HEIGHT - item.height,
                              d.y + (e.clientY - d.py) / scale,
                            ),
                          ),
                        );
                        d.latest = d.before.map((b) =>
                          b.id === item.id ? { ...b, x, y } : b,
                        );
                        setBlocks(d.latest);
                      }}
                      onPointerUp={() => {
                        const d = drag.current;
                        if (
                          d &&
                          JSON.stringify(d.before) !== JSON.stringify(d.latest)
                        ) {
                          setUndo((v) => [...v.slice(-39), d.before]);
                          setRedo([]);
                        }
                        drag.current = null;
                      }}
                      onPointerCancel={() => {
                        if (drag.current) setBlocks(drag.current.before);
                        drag.current = null;
                      }}
                      onFocus={() => {
                        if (!preview) setSelected(item.id);
                      }}
                      onKeyDown={(e) => {
                        if (preview || busy) return;
                        const directions: Record<string, [number, number]> = {
                          ArrowLeft: [-1, 0],
                          ArrowRight: [1, 0],
                          ArrowUp: [0, -1],
                          ArrowDown: [0, 1],
                        };
                        const dir = directions[e.key];
                        if (dir) {
                          e.preventDefault();
                          setSelected(item.id);
                          const step = e.shiftKey ? 10 : 1;
                          const x = Math.max(
                              0,
                              Math.min(
                                WIDTH - item.width,
                                item.x + dir[0] * step,
                              ),
                            ),
                            y = Math.max(
                              0,
                              Math.min(
                                HEIGHT - item.height,
                                item.y + dir[1] * step,
                              ),
                            );
                          commit(
                            blocks.map((b) =>
                              b.id === item.id ? { ...b, x, y } : b,
                            ),
                          );
                        }
                      }}
                    >
                      <BlockContent item={item} preview={preview} />
                      {active && !busy && (
                        <span
                          aria-hidden="true"
                          data-resize-handle="true"
                          style={{
                            position: "absolute",
                            right: 0,
                            bottom: 0,
                            width: 14,
                            height: 14,
                            background: "#16a34a",
                            cursor: "se-resize",
                            touchAction: "none",
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            drag.current = {
                              id: item.id,
                              x: item.x,
                              y: item.y,
                              px: e.clientX,
                              py: e.clientY,
                              before: blocks,
                              latest: blocks,
                              mode: "resize",
                            };
                          }}
                        />
                      )}
                    </div>
                  );
                })}
                {!blocks.length && (
                  <p className="p-12 text-center text-slate-400">
                    Tambahkan elemen untuk mulai mendesain.
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Posisi dan ukuran dalam piksel A4. Gunakan tombol panah untuk
            menggeser elemen; Shift + panah untuk 10 piksel.
          </p>
        </div>
        <aside className={panel}>
          <Field title="Pilih elemen">
            <SelectField
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Pilih elemen dokumen</option>
              {blocks.map((b, i) => (
                <option key={b.id} value={b.id}>
                  {i + 1}. {labels[b.kind]} {b.text.slice(0, 35)}
                </option>
              ))}
            </SelectField>
          </Field>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Grip size={16} />
            Pengaturan elemen
          </h3>
          {!current ? (
            <p className="text-xs text-muted-foreground">
              Pilih elemen pada kertas untuk mengedit teks, posisi, dan
              tampilannya.
            </p>
          ) : (
            <fieldset disabled={busy || preview} className="min-w-0 space-y-3">
              <p className="text-xs font-medium text-primary">
                {labels[current.kind]}
              </p>
              {(current.kind === "text" || current.kind === "total") && (
                <>
                  <Field title="Isi teks">
                    <Textarea
                      value={current.text}
                      maxLength={5000}
                      rows={4}
                      onChange={(e) => update({ text: e.target.value })}
                    />
                  </Field>
                  <Field title="Sisipkan data">
                    <SelectField
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          update({
                            text: current.text + `{{${e.target.value}}}`,
                          });
                      }}
                    >
                      <option value="">Pilih data dokumen</option>
                      {fields.map((f) => (
                        <option key={f} value={f}>
                          {f.replaceAll("_", " ")}
                        </option>
                      ))}
                    </SelectField>
                  </Field>
                </>
              )}
              {current.kind === "logo" && (
                <Field title="URL logo (HTTPS)">
                  <Input
                    type="url"
                    value={current.image_url}
                    placeholder="https://…"
                    onChange={(e) => update({ image_url: e.target.value })}
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <Field
                    key={key}
                    title={
                      {
                        x: "Posisi X",
                        y: "Posisi Y",
                        width: "Lebar",
                        height: "Tinggi",
                      }[key]
                    }
                  >
                    <Input
                      type="number"
                      min={key === "width" ? 20 : key === "height" ? 8 : 0}
                      max={key === "y" || key === "height" ? HEIGHT : WIDTH}
                      value={current[key]}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value))
                          update({ [key]: Math.round(value) });
                      }}
                    />
                  </Field>
                ))}
              </div>
              {current.kind !== "logo" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field title="Ukuran teks">
                      <Input
                        type="number"
                        min={8}
                        max={72}
                        value={current.font_size}
                        onChange={(e) =>
                          update({
                            font_size: Math.max(
                              8,
                              Math.min(72, Number(e.target.value) || 8),
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field title="Warna">
                      <Input
                        type="color"
                        value={current.color}
                        onChange={(e) => update({ color: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field title="Perataan">
                    <SelectField
                      value={current.align}
                      onChange={(e) =>
                        update({
                          align: e.target.value as TemplateBlock["align"],
                        })
                      }
                    >
                      <option value="left">Kiri</option>
                      <option value="center">Tengah</option>
                      <option value="right">Kanan</option>
                    </SelectField>
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={current.bold}
                      onChange={(e) => update({ bold: e.target.checked })}
                    />
                    Teks tebal
                  </label>
                </>
              )}
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={blocks.length >= 100}
                  onClick={() => {
                    const copy = {
                      ...current,
                      id: crypto.randomUUID(),
                      x: Math.min(WIDTH - current.width, current.x + 16),
                      y: Math.min(HEIGHT - current.height, current.y + 16),
                    };
                    commit([...blocks, copy]);
                    setSelected(copy.id);
                  }}
                >
                  <Copy size={14} />
                  Duplikat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    commit(blocks.filter((b) => b.id !== current.id));
                    setSelected("");
                  }}
                >
                  <Trash2 size={14} />
                  Hapus
                </Button>
              </div>
            </fieldset>
          )}
        </aside>
      </div>
      <p className="text-xs text-muted-foreground">
        Template mengatur desain dokumen. Pratinjau menggunakan data contoh;
        menyimpan desain tidak membuat atau mengirim INV/PO.
      </p>
    </div>
  );
}
function TemplateLoader({ kind }: { kind: DocumentKind }) {
  const q = useQuery({
    queryKey: ["processing-document-template", kind],
    queryFn: () => getDocumentTemplate(kind),
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (q.isLoading || q.isFetching) return <Spinner label="Memuat desain…" />;
  if (q.error)
    return (
      <div role="alert" className="space-y-2 rounded-xl border p-4">
        <p>{getApiError(q.error)}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  return q.data ? <TemplateEditor initial={q.data} /> : null;
}
export default function DocumentTemplatesPage() {
  const { user } = useAuth();
  if (user?.role !== "admin")
    return <p role="alert">Template hanya dapat diakses admin.</p>;
  return (
    <div className="min-w-0 space-y-4 text-left">
      <BarHalaman
        judul="Template"
        deskripsi="Desain dokumen invoice dan purchase order."
      />
      <Tabs defaultValue="INV" className="min-w-0">
        <TabsList className="section-tabs">
          <TabsTrigger value="INV">Invoice (INV)</TabsTrigger>
          <TabsTrigger value="PO">Purchase Order (PO)</TabsTrigger>
        </TabsList>
        {(["INV", "PO"] as const).map((kind) => (
          <TabsContent
            key={kind}
            value={kind}
            forceMount
            className="min-w-0 data-[state=inactive]:hidden"
          >
            <TemplateLoader kind={kind} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
