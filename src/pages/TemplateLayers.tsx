import InfoTip from '@/components/InfoTip'
import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Image,
  Minus,
  Table2,
  Plus,
} from "lucide-react";
import type { TemplateBlock } from "@/api/documentTemplates";
import { Button } from "@/components/ui/button";
import { elementName } from "./templateDocumentModel";
export default function TemplateLayers({
  blocks,
  selected,
  select,
  commit,
  disabled,
}: {
  blocks: TemplateBlock[];
  selected: string;
  select: (id: string) => void;
  commit: (blocks: TemplateBlock[]) => void;
  disabled: boolean;
}) {
  const [dragged, setDragged] = useState("");
  const move = (id: string, direction: number) => {
    const index = blocks.findIndex((b) => b.id === id),
      to = index + direction;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    commit(next);
  };
  return (
    <div className="space-y-3">
      <InfoTip teks={"Layer paling atas berada paling depan. Seret urutannya atau gunakan panah."} />
      <div role="list" aria-label="Layer dokumen" className="space-y-2">
        {[...blocks].reverse().map((item, index) => {
          const Icon = {
            text: Type,
            logo: Image,
            line: Minus,
            table: Table2,
            total: Plus,
          }[item.kind];
          return (
            <div
              role="listitem"
              key={item.id}
              draggable={!disabled}
              onDragStart={(e) => {
                setDragged(item.id);
                e.dataTransfer.setData("application/x-erp-layer", item.id);
              }}
              onDragOver={(e) => {
                if (!disabled && dragged) e.preventDefault();
              }}
              onDragEnd={() => setDragged("")}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("application/x-erp-layer");
                setDragged("");
                if (disabled || !id || id === item.id) return;
                const source = blocks.find((b) => b.id === id);
                if (!source) return;
                const next = blocks.filter((b) => b.id !== id),
                  target = next.findIndex((b) => b.id === item.id);
                next.splice(target, 0, source);
                commit(next);
              }}
              className={`min-w-0 rounded-xl border p-2 ${selected === item.id ? "border-primary bg-primary/5" : "bg-background"}`}
            >
              <button
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => select(item.id)}
                className="flex w-full min-w-0 items-center gap-2 text-left text-xs font-medium"
              >
                <Icon size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {elementName(item)}
                </span>
                {item.locked && <Lock size={12} />}{" "}
                {item.hidden && <EyeOff size={12} />}
              </button>
              <div className="mt-2 flex gap-1">
                {[
                  {
                    Icon: ArrowUp,
                    label: "Ke depan",
                    click: () => move(item.id, 1),
                    off: index === 0,
                  },
                  {
                    Icon: ArrowDown,
                    label: "Ke belakang",
                    click: () => move(item.id, -1),
                    off: index === blocks.length - 1,
                  },
                  {
                    Icon: item.locked ? Unlock : Lock,
                    label: item.locked ? "Buka kunci" : "Kunci",
                    click: () =>
                      commit(
                        blocks.map((b) =>
                          b.id === item.id ? { ...b, locked: !b.locked } : b,
                        ),
                      ),
                    off: false,
                  },
                  {
                    Icon: item.hidden ? Eye : EyeOff,
                    label: item.hidden ? "Tampilkan" : "Sembunyikan",
                    click: () =>
                      commit(
                        blocks.map((b) =>
                          b.id === item.id ? { ...b, hidden: !b.hidden } : b,
                        ),
                      ),
                    off: false,
                  },
                ].map(({ Icon, label, click, off }) => (
                  <Button
                    key={label}
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={disabled || off}
                    aria-label={`${label} ${elementName(item)}`}
                    title={label}
                    onClick={click}
                  >
                    <Icon size={14} />
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!blocks.length && (
        <p className="text-sm text-muted-foreground">Belum ada elemen.</p>
      )}
    </div>
  );
}
