import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Rnd } from "react-rnd";
import { DropdownMenu } from "radix-ui";
import {
  Copy,
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
  Layers,
  SlidersHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Grid3X3,
  Lock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Spinner from "@/components/Spinner";
import { SelectField } from "./processingShared";
import { previewAmounts } from "./templateTable";
import { block, defaults, labels, elementName } from "./templateDocumentModel";
import BlockContent from "./TemplateBlockContent";
import TemplateProperties from "./TemplateProperties";
import TemplateLayers from "./TemplateLayers";

type Orientation = "portrait" | "landscape";
type Snapshot = { blocks: TemplateBlock[]; orientation: Orientation };
const kinds = Object.keys(labels) as TemplateBlock["kind"][];
const icons = {
  text: Type,
  logo: Image,
  line: Minus,
  table: Table2,
  total: Plus,
};
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest('input,textarea,select,[contenteditable="true"]');
function TemplateEditor({ initial }: { initial: TemplateData }) {
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    () => initial.blocks ?? defaults(initial.kind),
  );
  const [orientation, setOrientation] = useState<Orientation>(
    initial.orientation || "portrait",
  );
  const [version, setVersion] = useState(initial.version);
  const snapshot = () => ({ blocks, orientation });
  const [saved, setSaved] = useState(
    initial.blocks === null
      ? ""
      : JSON.stringify({
          blocks: initial.blocks,
          orientation: initial.orientation || "portrait",
        }),
  );
  const [baseline] = useState(() => JSON.stringify(snapshot()));
  const [undo, setUndo] = useState<Snapshot[]>([]),
    [redo, setRedo] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState(""),
    [pane, setPane] = useState("properties");
  const [mobilePanel, setMobilePanel] = useState<
    "properties" | "layers" | null
  >(null);
  const [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [zoom, setZoom] = useState(0),
    [scale, setScale] = useState(1),
    [snap, setSnap] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const viewport = useRef<HTMLDivElement>(null);
  const width = orientation === "landscape" ? 1123 : 794,
    height = orientation === "landscape" ? 794 : 1123;
  const current = blocks.find((b) => b.id === selected);
  const firstTable = blocks.find((b) => b.kind === "table" && !b.hidden),
    sample = firstTable ? previewAmounts(firstTable) : {};
  const dirty =
    JSON.stringify(snapshot()) !== saved ||
    !!(
      editing && editing.text !== blocks.find((b) => b.id === editing.id)?.text
    );
  const warnUnsaved =
    dirty &&
    (version > 0 || JSON.stringify(snapshot()) !== baseline || !!editing);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const available = entries[0].contentRect.width;
      if (available > 0)
        setScale(zoom || Math.max(0.1, Math.min(1, available / width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, zoom]);
  useEffect(() => {
    if (!warnUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [warnUnsaved]);
  const commit = (next: TemplateBlock[], page: Orientation = orientation) => {
    if (
      JSON.stringify({ blocks: next, orientation: page }) ===
      JSON.stringify(snapshot())
    )
      return;
    setUndo((v) => [...v.slice(-59), snapshot()]);
    setRedo([]);
    setBlocks(next);
    setOrientation(page);
  };
  const fit = (item: TemplateBlock): TemplateBlock => {
    const w = Math.max(20, Math.min(width, item.width)),
      h = Math.max(8, Math.min(height, item.height));
    return {
      ...item,
      width: Math.round(w),
      height: Math.round(h),
      x: Math.round(Math.max(0, Math.min(width - w, item.x))),
      y: Math.round(Math.max(0, Math.min(height - h, item.y))),
    };
  };
  const update = (patch: Partial<TemplateBlock>) => {
    if (current)
      commit(
        blocks.map((b) => (b.id === current.id ? fit({ ...b, ...patch }) : b)),
      );
  };
  const select = (id: string) => {
    setSelected(id);
    setPane("properties");
  };
  const properties = () => {
    setPane("properties");
    if (window.matchMedia("(max-width:1279px)").matches)
      setMobilePanel("properties");
  };
  const add = (kind: TemplateBlock["kind"], x = 48, y = 80) => {
    if (busy || preview) return;
    if (kind === "logo") {
      const existing = blocks.find((b) => b.kind === "logo");
      if (existing) {
        if (existing.hidden)
          commit(
            blocks.map((b) =>
              b.id === existing.id ? { ...b, hidden: false } : b,
            ),
          );
        select(existing.id);
        properties();
        return;
      }
    }
    if (blocks.length >= 100) return;
    const count = blocks.filter((b) => b.kind === kind).length;
    const item = fit({
      ...block(kind),
      x,
      y,
      name:
        kind === "logo" ? "Logo perusahaan" : `${labels[kind]} ${count + 1}`,
    });
    commit([...blocks, item]);
    select(item.id);
    if (kind === "logo") properties();
  };
  const duplicate = () => {
    if (!current || current.locked || busy || preview || blocks.length >= 100)
      return;
    const copy = fit({
      ...current,
      id: crypto.randomUUID(),
      name: `${elementName(current).slice(0, 90)} (salinan)`,
      x: current.x + 16,
      y: current.y + 16,
      locked: false,
    });
    commit([...blocks, copy]);
    select(copy.id);
  };
  const remove = () => {
    if (current && !current.locked && !busy && !preview) {
      commit(blocks.filter((b) => b.id !== current.id));
      setSelected("");
    }
  };
  const undoAction = () => {
    const previous = undo.at(-1);
    if (!previous || busy || preview) return;
    setRedo((v) => [...v, snapshot()]);
    setBlocks(previous.blocks);
    setOrientation(previous.orientation);
    setUndo((v) => v.slice(0, -1));
    setEditing(null);
  };
  const redoAction = () => {
    const next = redo.at(-1);
    if (!next || busy || preview) return;
    setUndo((v) => [...v, snapshot()]);
    setBlocks(next.blocks);
    setOrientation(next.orientation);
    setRedo((v) => v.slice(0, -1));
    setEditing(null);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (viewport.current?.closest('[data-state="inactive"]')) return;
      if (e.defaultPrevented || isTyping(e.target) || busy || preview) return;
      const command = e.ctrlKey || e.metaKey;
      if (command && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoAction();
        else undoAction();
        return;
      }
      if (command && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoAction();
        return;
      }
      if (command && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
        return;
      }
      if (e.key === "Escape") {
        setSelected("");
        return;
      }
      if (!current || current.locked) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
        return;
      }
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const step = steps[e.key];
      if (step) {
        e.preventDefault();
        update({
          x: current.x + step[0] * (e.shiftKey ? 10 : 1),
          y: current.y + step[1] * (e.shiftKey ? 10 : 1),
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const finishText = () => {
    if (!editing) return;
    const item = blocks.find((b) => b.id === editing.id);
    if (item && !item.locked)
      commit(
        blocks.map((b) =>
          b.id === editing.id ? { ...b, text: editing.text } : b,
        ),
      );
    setEditing(null);
  };
  const save = async () => {
    if (busy) return;
    const document = editing
      ? blocks.map((b) =>
          b.id === editing.id ? { ...b, text: editing.text } : b,
        )
      : blocks;
    if (editing) {
      commit(document);
      setEditing(null);
    }
    setBusy(true);
    setError("");
    try {
      const result = await saveDocumentTemplate(
        initial.kind,
        version,
        document,
        orientation,
      );
      setVersion(result.version);
      setSaved(JSON.stringify({ blocks: document, orientation }));
      queryClient.setQueryData(["processing-document-template", initial.kind], {
        kind: initial.kind,
        version: result.version,
        blocks: document,
        orientation,
      });
      toast.success(`Template ${initial.kind} tersimpan`);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setBusy(false);
    }
  };
  const resizingHandles = (item: TemplateBlock) => {
    const hitSize = Math.min(22 / scale, item.height / 2, item.width / 2);
    const resizeStyles = Object.fromEntries(
      [
        "top",
        "right",
        "bottom",
        "left",
        "topLeft",
        "topRight",
        "bottomLeft",
        "bottomRight",
      ].map((handle) => {
        const size = hitSize;
        const style: Record<string, string | number> = {
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          zIndex: handle.length > 6 ? 20 : 10,
        };
        if (handle.includes("Left") || handle === "left")
          style.left = -size / 2;
        else if (handle.includes("Right") || handle === "right")
          style.right = -size / 2;
        else {
          style.left = "50%";
          style.marginLeft = -size / 2;
        }
        if (handle.startsWith("top")) style.top = -size / 2;
        else if (handle.startsWith("bottom")) style.bottom = -size / 2;
        else {
          style.top = "50%";
          style.marginTop = -size / 2;
        }
        return [handle, style];
      }),
    );
    const handles = Object.fromEntries(
      Object.keys(resizeStyles).map((handle) => [
        handle,
        <span
          key={handle}
          data-resize-handle={handle}
          style={{
            display: "block",
            width: Math.min(9 / scale, hitSize * 0.8),
            height: Math.min(9 / scale, hitSize * 0.8),
            border: `${1.5 / scale}px solid #16a34a`,
            borderRadius: 1 / scale,
            background: "#fff",
          }}
        />,
      ]),
    );
    return { resizeStyles, handles };
  };
  const propertyContent = (
    <TemplateProperties
      key={current?.id || "none"}
      item={current}
      update={update}
      width={width}
      height={height}
      busy={busy}
      preview={preview}
    />
  );
  const layerContent = (
    <TemplateLayers
      blocks={blocks}
      selected={selected}
      select={setSelected}
      commit={commit}
      disabled={busy || preview}
    />
  );
  const addButtons = kinds.map((kind) => {
    const Icon = icons[kind];
    return (
      <Button
        key={kind}
        type="button"
        variant="outline"
        className="justify-start gap-2 text-xs"
        disabled={busy || preview || blocks.length >= 100}
        draggable={!busy && !preview}
        aria-label={
          kind === "logo"
            ? "Pilih atau tambahkan logo"
            : `Tambah ${labels[kind].toLowerCase()}`
        }
        onDragStart={(e) =>
          e.dataTransfer.setData("application/x-erp-template-element", kind)
        }
        onClick={() => add(kind)}
      >
        <Icon size={15} />
        {kind === "logo" ? "Logo perusahaan" : `${labels[kind]} baru`}
      </Button>
    );
  });
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 sm:p-4">
        <div>
          <h2 className="text-sm font-semibold">
            Desain {initial.kind === "INV" ? "Invoice" : "Purchase Order"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A4 · {dirty ? "Belum disimpan" : `Tersimpan · versi ${version}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectField
            className="w-32 min-w-0"
            aria-label="Orientasi kertas"
            value={orientation}
            disabled={busy || preview}
            onChange={(e) => {
              const next = e.target.value as Orientation,
                w = next === "landscape" ? 1123 : 794,
                h = next === "landscape" ? 794 : 1123;
              commit(
                blocks.map((b) => {
                  const bw = Math.min(b.width, w),
                    bh = Math.min(b.height, h);
                  return {
                    ...b,
                    width: bw,
                    height: bh,
                    x: Math.min(b.x, w - bw),
                    y: Math.min(b.y, h - bh),
                  };
                }),
                next,
              );
            }}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </SelectField>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Urungkan"
            title="Urungkan (Ctrl+Z)"
            disabled={!undo.length || busy || preview}
            onClick={undoAction}
          >
            <Undo2 size={16} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Ulangi"
            title="Ulangi (Ctrl+Shift+Z)"
            disabled={!redo.length || busy || preview}
            onClick={redoAction}
          >
            <Redo2 size={16} />
          </Button>
          <Button
            type="button"
            variant={preview ? "secondary" : "outline"}
            disabled={busy}
            onClick={() => {
              finishText();
              setPreview((v) => !v);
            }}
          >
            <Eye size={16} />
            {preview ? "Kembali edit" : "Pratinjau"}
          </Button>
          <Button
            type="button"
            disabled={!dirty || busy}
            onClick={() => void save()}
          >
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 xl:hidden">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" disabled={busy || preview}>
              <Plus size={16} />
              Tambah elemen
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="z-50 min-w-52 rounded-xl border bg-popover p-1.5 shadow-lg"
            >
              {kinds.map((kind) => {
                const Icon = icons[kind];
                return (
                  <DropdownMenu.Item
                    key={kind}
                    onSelect={() => add(kind)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-muted"
                  >
                    <Icon size={16} />
                    {kind === "logo"
                      ? "Logo perusahaan"
                      : `${labels[kind]} baru`}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Button
          variant="outline"
          disabled={preview}
          onClick={() => setMobilePanel("layers")}
        >
          <Layers size={16} />
          Layer
        </Button>
        <Button
          variant="outline"
          disabled={!current || preview}
          onClick={() => setMobilePanel("properties")}
        >
          <SlidersHorizontal size={16} />
          Properti
        </Button>
      </div>
      <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[170px_minmax(0,1fr)_280px]">
        <aside className="hidden space-y-4 rounded-2xl border bg-card p-3 xl:sticky xl:top-24 xl:block">
          <h3 className="text-sm font-semibold">Tambah elemen</h3>
          <p className="text-xs text-muted-foreground">
            Tambah elemen baru. Pilih yang sudah ada langsung di kanvas.
          </p>
          <div className="grid gap-2">{addButtons}</div>
        </aside>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-2">
            <div className="min-w-0 flex-1">
              <p
                data-testid="template-canvas-caption"
                className="truncate text-xs font-medium"
              >
                {preview
                  ? "Pratinjau dokumen"
                  : current
                    ? elementName(current)
                    : "Kanvas A4"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {preview
                  ? "Data contoh"
                  : current?.locked
                    ? "Elemen dikunci"
                    : "Klik untuk memilih · klik dua kali teks untuk mengedit"}
              </p>
            </div>
            <Button
              type="button"
              variant={snap ? "secondary" : "ghost"}
              size="icon"
              aria-label="Aktifkan grid dan snap"
              aria-pressed={snap}
              disabled={preview}
              onClick={() => setSnap((v) => !v)}
            >
              <Grid3X3 size={16} />
            </Button>
            <SelectField
              aria-label="Pembesaran kanvas"
              className="h-9 w-28 min-w-0"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value="0">Pas layar</option>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </SelectField>
          </div>
          {current && !preview ? (
            <div
              role="toolbar"
              aria-label="Aksi elemen terpilih"
              className="flex h-14 items-center justify-end gap-1 rounded-xl border bg-card p-2"
            >
              <span className="mr-auto hidden max-w-44 truncate px-1 text-xs font-medium 2xl:block">
                {elementName(current)}
              </span>
              {current.locked && (
                <Lock size={14} className="text-muted-foreground" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Properti elemen"
                aria-label="Properti elemen"
                onClick={properties}
              >
                <SlidersHorizontal size={15} />
              </Button>
              {[
                { Icon: AlignLeft, label: "Rata kiri halaman", x: 0 },
                {
                  Icon: AlignCenter,
                  label: "Tengah halaman",
                  x: (width - current.width) / 2,
                },
                {
                  Icon: AlignRight,
                  label: "Rata kanan halaman",
                  x: width - current.width,
                },
              ].map(({ Icon, label, x }) => (
                <Button
                  key={label}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={label}
                  title={label}
                  disabled={busy || current.locked}
                  onClick={() => update({ x })}
                >
                  <Icon size={15} />
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Duplikat (Ctrl+D)"
                aria-label="Duplikat elemen"
                disabled={busy || current.locked || blocks.length >= 100}
                onClick={duplicate}
              >
                <Copy size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Hapus (Delete)"
                aria-label="Hapus elemen"
                disabled={busy || current.locked}
                onClick={remove}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ) : (
            <div className="flex h-14 items-center rounded-xl border bg-card px-3 text-xs text-muted-foreground">
              Pilih elemen untuk mengatur posisi dan tampilannya.
            </div>
          )}
          <div
            ref={viewport}
            data-testid="template-workspace"
            className="min-h-64 max-h-[72dvh] min-w-0 overflow-auto overscroll-contain rounded-2xl border bg-muted/60 p-4 sm:p-6"
          >
            <div
              className="relative mx-auto"
              style={{ width: width * scale, height: height * scale }}
            >
              <div
                aria-label={`Kanvas template ${initial.kind}`}
                data-testid="template-paper"
                className="absolute left-0 top-0 origin-top-left bg-white text-slate-900 shadow-md"
                style={{
                  width,
                  height,
                  transform: `scale(${scale})`,
                  fontFamily: "Arial, sans-serif",
                  backgroundImage:
                    snap && !preview
                      ? "radial-gradient(#cbd5e1 0.8px, transparent 0.8px)"
                      : undefined,
                  backgroundSize: "8px 8px",
                }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    finishText();
                    setSelected("");
                  }
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
                {blocks
                  .filter((b) => !b.hidden)
                  .map((item) => {
                    const active = selected === item.id && !preview,
                      edit = editing?.id === item.id;
                    const { resizeStyles, handles } = resizingHandles(item);
                    return (
                      <Rnd
                        key={item.id}
                        data-template-element={item.id}
                        data-element-kind={item.kind}
                        size={{ width: item.width, height: item.height }}
                        position={{ x: item.x, y: item.y }}
                        scale={scale}
                        bounds="parent"
                        minWidth={20}
                        minHeight={8}
                        maxWidth={width}
                        maxHeight={height}
                        dragGrid={snap ? [8, 8] : [1, 1]}
                        resizeGrid={snap ? [8, 8] : [1, 1]}
                        lockAspectRatio={item.kind === "logo"}
                        disableDragging={
                          preview || busy || !!item.locked || edit
                        }
                        enableResizing={
                          active && !busy && !item.locked && !edit
                        }
                        resizeHandleStyles={resizeStyles}
                        resizeHandleComponent={handles}
                        cancel="textarea,input,button,[data-editor-interactive]"
                        style={{
                          outline: active
                            ? `${1.5 / scale}px solid #16a34a`
                            : undefined,
                          outlineOffset: 0,
                          zIndex: active
                            ? blocks.length + 1
                            : blocks.indexOf(item),
                          touchAction: preview || item.locked ? "auto" : "none",
                          cursor: preview
                            ? "default"
                            : item.locked
                              ? "default"
                              : "move",
                        }}
                        onMouseDown={() => {
                          if (!preview) select(item.id);
                        }}
                        onTouchStart={() => {
                          if (!preview) select(item.id);
                        }}
                        onDragStart={() => {
                          select(item.id);
                        }}
                        onDragStop={(_, data) => {
                          commit(
                            blocks.map((b) =>
                              b.id === item.id
                                ? fit({ ...b, x: data.x, y: data.y })
                                : b,
                            ),
                          );
                        }}
                        onResizeStart={() => select(item.id)}
                        onResizeStop={(
                          _event,
                          _direction,
                          ref,
                          _delta,
                          position,
                        ) => {
                          const w = parseFloat(ref.style.width),
                            h = parseFloat(ref.style.height);
                          commit(
                            blocks.map((b) =>
                              b.id === item.id
                                ? fit({
                                    ...b,
                                    width: w,
                                    height: h,
                                    x: position.x,
                                    y: position.y,
                                  })
                                : b,
                            ),
                          );
                        }}
                      >
                        <div
                          role={preview ? undefined : "button"}
                          tabIndex={preview ? -1 : 0}
                          aria-label={elementName(item)}
                          aria-pressed={preview ? undefined : active}
                          className="h-full w-full"
                          style={{
                            overflow: "hidden",
                            fontSize: item.font_size,
                            fontWeight: item.bold ? 700 : 400,
                            textAlign: item.align,
                            color: item.color,
                            border: item.border
                              ? `1px solid ${item.color}`
                              : undefined,
                            userSelect: edit ? "text" : "none",
                          }}
                          onFocus={() => {
                            if (!preview) select(item.id);
                          }}
                          onDoubleClick={() => {
                            if (preview || busy || item.locked) return;
                            select(item.id);
                            if (item.kind === "text" || item.kind === "total")
                              setEditing({ id: item.id, text: item.text });
                            else properties();
                          }}
                        >
                          {edit && editing ? (
                            <textarea
                              autoFocus
                              aria-label="Edit teks di kanvas"
                              value={editing.text}
                              maxLength={5000}
                              className="h-full w-full resize-none border-0 bg-white/95 p-0 outline-none"
                              style={{
                                minHeight: "100%",
                                font: "inherit",
                                color: "inherit",
                                textAlign: "inherit",
                              }}
                              onChange={(e) =>
                                setEditing({
                                  id: item.id,
                                  text: e.target.value,
                                })
                              }
                              onBlur={finishText}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditing(null);
                                }
                                if (
                                  (e.ctrlKey || e.metaKey) &&
                                  e.key === "Enter"
                                ) {
                                  e.preventDefault();
                                  finishText();
                                }
                              }}
                            />
                          ) : (
                            <BlockContent
                              item={item}
                              preview={preview}
                              sample={sample}
                            />
                          )}
                        </div>
                      </Rnd>
                    );
                  })}
                {!blocks.length && (
                  <div className="grid h-full place-items-center p-10 text-center text-slate-400">
                    <div>
                      <Plus className="mx-auto mb-3" />
                      <p>Tambahkan teks, logo, atau tabel untuk mulai.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            {editing
              ? "Klik di luar teks atau Ctrl+Enter untuk selesai. Escape untuk membatalkan."
              : "Pilih elemen lalu geser. Tarik titik di tepi untuk mengubah ukuran. Gunakan Layer untuk elemen yang bertumpuk."}
          </p>
        </div>
        <aside className="hidden min-w-0 rounded-2xl border bg-card p-3 xl:sticky xl:top-24 xl:block xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto">
          <Tabs value={pane} onValueChange={setPane}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="properties">Properti</TabsTrigger>
              <TabsTrigger value="layers">Layer</TabsTrigger>
            </TabsList>
            <TabsContent value="properties">{propertyContent}</TabsContent>
            <TabsContent value="layers">{layerContent}</TabsContent>
          </Tabs>
        </aside>
      </div>
      <Dialog
        open={!!mobilePanel}
        onOpenChange={(open) => {
          if (!open) setMobilePanel(null);
        }}
      >
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
          data-text-align="preserve"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {mobilePanel === "layers" ? "Layer dokumen" : "Properti elemen"}
            </DialogTitle>
            <DialogDescription>
              {mobilePanel === "layers"
                ? "Pilih elemen, atur urutan, kunci, atau sembunyikan."
                : "Pengaturan untuk elemen yang sedang dipilih."}
            </DialogDescription>
          </DialogHeader>
          {mobilePanel === "layers" ? layerContent : propertyContent}
        </DialogContent>
      </Dialog>
      <p className="text-xs text-muted-foreground">
        Pratinjau memakai data contoh. Simpan desain untuk menggunakan kembali
        pengaturan INV/PO.
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
    <div className="min-w-0 space-y-4 text-left" data-text-align="preserve">
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
