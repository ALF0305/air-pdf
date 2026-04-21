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
import { watermarkPdf, savePdfBackup, saveVersion } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WatermarkDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [text, setText] = useState("CONFIDENCIAL");
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(0.3);
  const [busy, setBusy] = useState(false);

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
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
            Se estampa en diagonal (45°) en rojo sobre cada página.
          </p>
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
