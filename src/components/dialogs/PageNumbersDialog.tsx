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
import { pageNumbersPdf, savePdfBackup, saveVersion } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PREVIEW_DEBOUNCE_MS = 80;

export function PageNumbersDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const setPageNumberPreview = useUiStore((s) => s.setPageNumberPreview);
  const [format, setFormat] = useState("{n} / {total}");
  const [fontSize, setFontSize] = useState(11);
  const [busy, setBusy] = useState(false);

  // Sync de preview con debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (format) {
        setPageNumberPreview({ format, fontSize });
      } else {
        setPageNumberPreview(null);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [format, fontSize, setPageNumberPreview]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      setPageNumberPreview(null);
    };
  }, [setPageNumberPreview]);

  if (!tab) return null;

  const handleApply = async () => {
    if (!confirm("Insertar números de página? Se crea backup .bak.")) return;
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await pageNumbersPdf(tab.path, tab.path, format, fontSize);
      bumpRefresh();
      setPageNumberPreview(null);
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setPageNumberPreview(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Números de página</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pn-format">Formato</Label>
            <Input
              id="pn-format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usa <code>{"{n}"}</code> para el número actual y{" "}
              <code>{"{total}"}</code> para el total.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pn-size">Tamaño (pt)</Label>
            <Input
              id="pn-size"
              type="number"
              min={6}
              max={48}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value) || 11)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Se estampan en el centro-inferior de cada página. La vista previa
            sobre el visor es aproximada.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={busy}>
            {busy ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
