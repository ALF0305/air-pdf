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
import { exportAllPagesAsImages } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportImagesDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  if (!tab) return null;

  const handleExport = async () => {
    const dir = await openDialog({
      directory: true,
      multiple: false,
    });
    if (!dir || typeof dir !== "string") return;
    setBusy(true);
    setDoneCount(null);
    try {
      const out = await exportAllPagesAsImages(tab.path, dir, dpi, format);
      setDoneCount(out.length);
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
          <DialogTitle>Exportar páginas como imágenes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Formato</Label>
            <div className="flex gap-2">
              <Button
                variant={format === "png" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("png")}
              >
                PNG
              </Button>
              <Button
                variant={format === "jpg" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("jpg")}
              >
                JPG
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exp-dpi">DPI</Label>
            <Input
              id="exp-dpi"
              type="number"
              min={72}
              max={600}
              step={24}
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value) || 150)}
            />
            <p className="text-xs text-muted-foreground">
              72 = pantalla, 150 = bueno, 300 = imprenta
            </p>
          </div>
          {doneCount != null && (
            <div className="rounded border p-3 text-sm bg-muted/30">
              {doneCount} imágenes exportadas.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? "Exportando..." : "Elegir carpeta y exportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
