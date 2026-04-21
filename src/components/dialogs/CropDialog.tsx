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
import { cropPdfUniform, savePdfBackup, saveVersion } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CropDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [top, setTop] = useState(0);
  const [right, setRight] = useState(0);
  const [bottom, setBottom] = useState(0);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!tab) return null;

  const handleApply = async () => {
    if (top + right + bottom + left === 0) {
      alert("Especifica al menos un margen mayor a 0");
      return;
    }
    if (
      !confirm(
        `Recortar ${top}/${right}/${bottom}/${left} pts (T/R/B/L) en todas las páginas? Se crea backup .bak.`
      )
    )
      return;
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await cropPdfUniform(tab.path, tab.path, top, right, bottom, left);
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
          <DialogTitle>Recortar páginas</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Define márgenes a recortar en puntos (1 pt = 1/72 pulgada). Se
            aplica a todas las páginas uniformemente.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="crop-top">Superior</Label>
              <Input
                id="crop-top"
                type="number"
                min={0}
                value={top}
                onChange={(e) => setTop(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="crop-right">Derecho</Label>
              <Input
                id="crop-right"
                type="number"
                min={0}
                value={right}
                onChange={(e) => setRight(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="crop-bottom">Inferior</Label>
              <Input
                id="crop-bottom"
                type="number"
                min={0}
                value={bottom}
                onChange={(e) => setBottom(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="crop-left">Izquierdo</Label>
              <Input
                id="crop-left"
                type="number"
                min={0}
                value={left}
                onChange={(e) => setLeft(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={busy}>
            {busy ? "Recortando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
