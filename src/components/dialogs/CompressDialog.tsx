import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { compressPdf } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CompressDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ before: number; after: number } | null>(
    null
  );

  if (!tab) return null;

  const handleCompress = async () => {
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-compressed.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      const r = await compressPdf(tab.path, out);
      setResult(r);
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
          <DialogTitle>Comprimir PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            Optimiza los streams del PDF eliminando duplicados y recomprimiendo
            objetos. No es recompresión de imágenes.
          </p>
          {result && (
            <div className="rounded border p-3 bg-muted/30">
              <div>Antes: {fmt(result.before)}</div>
              <div>Después: {fmt(result.after)}</div>
              <div>
                Reducción:{" "}
                {result.before > 0
                  ? `${(((result.before - result.after) / result.before) * 100).toFixed(1)}%`
                  : "—"}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
          <Button onClick={handleCompress} disabled={busy}>
            {busy ? "Comprimiendo..." : "Comprimir..."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
