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
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import { stampImage, savePdfBackup, saveVersion } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StampImageDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [imgPath, setImgPath] = useState<string | null>(null);
  const [left, setLeft] = useState(50);
  const [bottom, setBottom] = useState(50);
  const [width, setWidth] = useState(150);
  const [height, setHeight] = useState(60);
  const [busy, setBusy] = useState(false);

  if (!tab) return null;

  const pickImage = async () => {
    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "Imagen", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (typeof picked === "string") setImgPath(picked);
  };

  const handleApply = async () => {
    if (!imgPath) return;
    if (
      !confirm(
        `Estampar imagen en página ${currentPage + 1} en (${left},${bottom}) tamaño ${width}x${height} pts? Se crea backup .bak.`
      )
    )
      return;
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await stampImage(
        tab.path,
        tab.path,
        currentPage,
        imgPath,
        left,
        bottom,
        width,
        height
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estampar imagen / firma</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Estampa una imagen (firma, sello, logo) en la página {currentPage + 1}
            . Coordenadas en puntos desde la esquina inferior izquierda.
          </p>
          <div className="space-y-1">
            <Label>Imagen</Label>
            <div className="flex gap-2">
              <Button size="sm" onClick={pickImage}>
                Elegir imagen...
              </Button>
              <span className="text-xs text-muted-foreground truncate self-center">
                {imgPath ? imgPath.split(/[\\/]/).pop() : "ninguna"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-left">Izquierda (X)</Label>
              <Input
                id="st-left"
                type="number"
                value={left}
                onChange={(e) => setLeft(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-bottom">Abajo (Y)</Label>
              <Input
                id="st-bottom"
                type="number"
                value={bottom}
                onChange={(e) => setBottom(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-w">Ancho</Label>
              <Input
                id="st-w"
                type="number"
                min={1}
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-h">Alto</Label>
              <Input
                id="st-h"
                type="number"
                min={1}
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={busy || !imgPath}>
            {busy ? "Estampando..." : "Estampar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
