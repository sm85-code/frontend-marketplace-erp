import { useEffect, useRef, useState } from "react";
import { ImagePlus, Lock, Unlock, Eye, EyeOff, Minus, Plus } from "lucide-react";
import type { TemplateBlock } from "@/api/documentTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectField } from "./processingShared";
import { TableSettings } from "./templateTable";
import { fields, elementName, labels } from "./templateDocumentModel";

const MIN_FONT = 8;
const MAX_FONT = 72;
const clampFont = (n: number) => Math.max(MIN_FONT, Math.min(MAX_FONT, Math.round(n)));

/** Keeps a draft string so multi-digit sizes can be typed (clamping per keystroke turned "1" into 8); commits valid values live and clamps on blur. */
function FontSizeInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const step = (d: number) => onChange(clampFont(value + d));
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" aria-label="Kecilkan teks" disabled={value <= MIN_FONT} onClick={() => step(-1)}>
        <Minus className="size-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={MIN_FONT}
        max={MAX_FONT}
        className="min-w-0 text-center"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && n >= MIN_FONT && n <= MAX_FONT) onChange(Math.round(n));
        }}
        onBlur={() => {
          const n = clampFont(Number(draft) || MIN_FONT);
          setDraft(String(n));
          onChange(n);
        }}
      />
      <Button type="button" variant="outline" size="icon" aria-label="Besarkan teks" disabled={value >= MAX_FONT} onClick={() => step(1)}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

async function readLogo(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Pilih gambar PNG, JPG, atau WebP.");
  if (file.size > 5 * 1024 * 1024) throw Error("Ukuran gambar maksimal 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const ratio = Math.min(
      1,
      1600 / image.naturalWidth,
      1600 / image.naturalHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Gambar tidak dapat diproses.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.85);
    if (data.length > 682000)
      throw Error(
        "Gambar masih terlalu besar. Gunakan logo dengan ukuran lebih kecil.",
      );
    return { url: data, aspect: canvas.width / canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function TemplateProperties({
  item,
  update,
  busy,
  preview,
  width,
  height,
}: {
  item?: TemplateBlock;
  update: (patch: Partial<TemplateBlock>) => void;
  busy: boolean;
  preview: boolean;
  width: number;
  height: number;
}) {
  const file = useRef<HTMLInputElement>(null);
  const latest = useRef({ item, update });
  const alive = useRef(true);
  useEffect(() => {
    latest.current = { item, update };
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [imageError, setImageError] = useState(""),
    [loading, setLoading] = useState(false);
  if (!item)
    return (
      <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Pilih elemen di kanvas atau daftar Layer. Pengaturannya akan muncul di
        sini.
      </div>
    );
  const disabled = busy || preview;
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <p className="text-xs font-medium text-primary">{labels[item.kind]}</p>
        <h3 className="mt-1 break-words text-sm font-semibold">
          {elementName(item)}
        </h3>
      </div>
      <Field title="Nama elemen">
        <Input
          maxLength={120}
          value={item.name ?? elementName(item)}
          disabled={disabled}
          onChange={(e) => update({ name: e.target.value })}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={item.locked ? "secondary" : "outline"}
          disabled={disabled}
          aria-pressed={!!item.locked}
          onClick={() => update({ locked: !item.locked })}
        >
          {item.locked ? <Lock size={14} /> : <Unlock size={14} />}{" "}
          {item.locked ? "Buka kunci" : "Kunci"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => update({ hidden: !item.hidden })}
        >
          {item.hidden ? <Eye size={14} /> : <EyeOff size={14} />}{" "}
          {item.hidden ? "Tampilkan" : "Sembunyikan"}
        </Button>
      </div>
      {item.locked && (
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Elemen dikunci. Buka kunci untuk mengubah isi, posisi, atau ukurannya.
        </p>
      )}
      <fieldset
        disabled={disabled || !!item.locked || loading}
        className="min-w-0 space-y-4"
      >
        {(item.kind === "text" || item.kind === "total") && (
          <>
            <Field title="Isi teks">
              <Textarea
                style={{ minHeight: "7rem" }}
                rows={4}
                maxLength={5000}
                value={item.text}
                onChange={(e) => update({ text: e.target.value })}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Klik dua kali teks di kanvas untuk mengedit langsung.
            </p>
            <Field title="Sisipkan data">
              <SelectField
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    update({ text: item.text + `{{${e.target.value}}}` });
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
        {item.kind === "logo" && (
          <div className="space-y-3 rounded-xl border p-3">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt="Logo yang dipilih"
                referrerPolicy="no-referrer"
                className="h-28 w-full rounded-lg bg-muted object-contain p-2"
              />
            ) : (
              <div className="grid h-24 place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">
                Belum ada gambar logo
              </div>
            )}
            <input
              ref={file}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label="Pilih file logo"
              onChange={async (e) => {
                const selected = e.target.files?.[0];
                e.target.value = "";
                if (!selected) return;
                setLoading(true);
                setImageError("");
                try {
                  const image = await readLogo(selected);
                  if (!alive.current || !latest.current.item) return;
                  latest.current.update({
                    image_url: image.url,
                    height: Math.round(
                      latest.current.item.width / image.aspect,
                    ),
                  });
                } catch (err) {
                  setImageError(
                    err instanceof Error
                      ? err.message
                      : "Gambar tidak dapat diproses.",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => file.current?.click()}
            >
              <ImagePlus size={16} />
              {loading
                ? "Memproses…"
                : item.image_url
                  ? "Ganti gambar logo"
                  : "Unggah logo"}
            </Button>
            {imageError && (
              <p role="alert" className="text-xs text-destructive">
                {imageError}
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Gunakan URL gambar
              </summary>
              <div className="mt-2">
                <Field title="URL logo (HTTPS)">
                  <Input
                    type="url"
                    value={
                      item.image_url.startsWith("data:") ? "" : item.image_url
                    }
                    placeholder="https://…"
                    onChange={(e) => update({ image_url: e.target.value })}
                  />
                </Field>
              </div>
            </details>
            <p className="text-xs text-muted-foreground">
              Pilih gambar untuk elemen ini. Menambah logo lagi dilakukan lewat
              Duplikat.
            </p>
          </div>
        )}
        {item.kind === "table" && (
          <TableSettings item={item} onChange={update} />
        )}
        {item.kind !== "logo" && (
          <div className="space-y-3 border-t pt-3">
            <h4 className="text-xs font-semibold">Tampilan</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field title="Ukuran teks">
                <FontSizeInput
                  value={item.font_size}
                  onChange={(font_size) => update({ font_size })}
                />
              </Field>
              <Field title="Warna">
                <Input
                  type="color"
                  value={item.color}
                  onChange={(e) => update({ color: e.target.value })}
                />
              </Field>
            </div>
            <Field title="Perataan teks">
              <SelectField
                value={item.align}
                onChange={(e) =>
                  update({ align: e.target.value as TemplateBlock["align"] })
                }
              >
                <option value="left">Kiri</option>
                <option value="center">Tengah</option>
                <option value="right">Kanan</option>
              </SelectField>
            </Field>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.bold}
                  onChange={(e) => update({ bold: e.target.checked })}
                />
                Tebal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!item.border}
                  onChange={(e) => update({ border: e.target.checked })}
                />
                Bingkai
              </label>
            </div>
          </div>
        )}
        <details className="border-t pt-3">
          <summary className="cursor-pointer text-xs font-semibold">
            Posisi dan ukuran
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
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
                  max={key === "y" || key === "height" ? height : width}
                  value={item[key]}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next))
                      update({ [key]: Math.round(next) });
                  }}
                />
              </Field>
            ))}
          </div>
        </details>
      </fieldset>
    </div>
  );
}
