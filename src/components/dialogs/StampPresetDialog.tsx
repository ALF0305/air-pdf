import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import {
  stampText,
  savePdfBackup,
  saveVersion,
  type StampPosition,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: "APROBADO", color: [0, 128, 0] as [number, number, number] },
  { label: "BORRADOR", color: [100, 100, 100] as [number, number, number] },
  { label: "CONFIDENCIAL", color: [200, 0, 0] as [number, number, number] },
  { label: "REVISADO", color: [0, 100, 200] as [number, number, number] },
  { label: "ANULADO", color: [200, 0, 0] as [number, number, number] },
  { label: "ORIGINAL", color: [0, 100, 0] as [number, number, number] },
  { label: "COPIA", color: [150, 100, 0] as [number, number, number] },
];

const POSITIONS: { value: StampPosition; label: string }[] = [
  { value: "top-left", label: "Arriba izq." },
  { value: "top-center", label: "Arriba centro" },
  { value: "top-right", label: "Arriba der." },
  { value: "bottom-left", label: "Abajo izq." },
  { value: "bottom-center", label: "Abajo centro" },
  { value: "bottom-right", label: "Abajo der." },
  { value: "center", label: "Centro" },
];

export function StampPresetDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [text, setText] = useState("APROBADO");
  const [color, setColor] = useState<[number, number, number]>([0, 128, 0]);
  const [position, setPosition] = useState<StampPosition>("top-right");
  const [fontSize, setFontSize] = useState(24);
  const [allPages, setAllPages] = useState(false);
  const [withDate, setWithDate] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!tab) return null;

  const finalText = withDate
    ? `${text} — ${new Date().toLocaleDateString("es-PE")}`
    : text;

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setText(p.label);
    setColor(p.color);
  };

  const handleApply = async () => {
    if (!confirm(`Aplicar sello "${finalText}"? Se crea backup .bak.`)) return;
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await stampText(
        tab.path,
        tab.path,
        finalText,
        fontSize,
        color,
        position,
        allPages ? undefined : currentPage
      );
      bumpRefresh();
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sello de texto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Presets</Label>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset(p)}
                  style={{
                    color: `rgb(${p.color.join(",")})`,
                    borderColor: `rgb(${p.color.join(",")})`,
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sp-text">Texto del sello</Label>
            <Input
              id="sp-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sp-pos">Posición</Label>
              <select
                id="sp-pos"
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                value={position}
                onChange={(e) => setPosition(e.target.value as StampPosition)}
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-size">Tamaño (pt)</Label>
              <Input
                id="sp-size"
                type="number"
                min={8}
                max={100}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 24)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withDate}
              onChange={(e) => setWithDate(e.target.checked)}
            />
            Añadir fecha actual
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allPages}
              onChange={(e) => setAllPages(e.target.checked)}
            />
            Aplicar a todas las páginas (si no, solo a la página {currentPage + 1})
          </label>

          <div
            className="border rounded p-3 text-center font-bold"
            style={{ color: `rgb(${color.join(",")})` }}
          >
            {finalText || "(vacío)"}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={busy || !text}>
            {busy ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
