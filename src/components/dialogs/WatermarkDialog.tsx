import { useEffect, useRef, useState } from "react";
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
import { watermarkPdf, savePdfBackup, saveVersion } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PREVIEW_DEBOUNCE_MS = 80;

export function WatermarkDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const setWatermarkPreview = useUiStore((s) => s.setWatermarkPreview);
  const [text, setText] = useState("CONFIDENCIAL");
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(0.3);
  const [busy, setBusy] = useState(false);

  // Sync de preview con debounce. Se ejecuta en cada cambio de inputs
  // mientras el dialog esta abierto, y limpia al desmontar.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text) {
        setWatermarkPreview({ text, fontSize, opacity });
      } else {
        setWatermarkPreview(null);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, fontSize, opacity, setWatermarkPreview]);

  // Limpieza al desmontar (cierre por cualquier razon)
  useEffect(() => {
    return () => {
      setWatermarkPreview(null);
    };
  }, [setWatermarkPreview]);

  if (!tab) return null;

  const handleApply = async () => {
    if (!confirm("Aplicar marca de agua a todas las páginas? Se crea backup .bak."))
      return;
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await watermarkPdf(tab.path, tab.path, text, fontSize, opacity);
      bumpRefresh();
      setWatermarkPreview(null);
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setWatermarkPreview(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marca de agua</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="wm-text">Texto</Label>
            <Input
              id="wm-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="wm-size">Tamaño (pt)</Label>
              <Input
                id="wm-size"
                type="number"
                min={8}
                max={200}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 60)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wm-op">Opacidad (0-1)</Label>
              <Input
                id="wm-op"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value) || 0.3)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Se estampa en diagonal (45°) en rojo sobre cada página. La vista
            previa sobre el visor es aproximada (la fuente real es Helvetica).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={busy}>
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
