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
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { usePdfStore } from "@/stores/pdfStore";
import {
  detectBlankPages,
  deleteBlankPages,
  type BlankDetectionReport,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BlankPagesDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [maxTextChars, setMaxTextChars] = useState(3);
  const [minImageSize, setMinImageSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState<BlankDetectionReport | null>(null);
  const [applied, setApplied] = useState<BlankDetectionReport | null>(null);

  if (!tab) return null;

  const handleClose = () => {
    setScan(null);
    setApplied(null);
    onClose();
  };

  const handleDetect = async () => {
    setBusy(true);
    try {
      const r = await detectBlankPages(tab.path, {
        maxTextChars,
        minImageSizePt: minImageSize,
      });
      setScan(r);
    } catch (e) {
      alert(`Error al detectar: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!scan || scan.blank_pages.length === 0) return;
    if (
      !confirm(
        `Vas a eliminar ${scan.blank_pages.length} página(s) en blanco. Se guarda en una copia nueva. ¿Continuar?`
      )
    ) {
      return;
    }
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-sin-blancos.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      const r = await deleteBlankPages(tab.path, out, {
        maxTextChars,
        minImageSizePt: minImageSize,
      });
      setApplied(r);
    } catch (e) {
      alert(`Error al eliminar: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Páginas en blanco</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Detecta y elimina páginas vacías (típico en escaneos duplex de
          historias clínicas). Crea una copia; el original no se modifica.
        </p>

        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bp-text" className="text-sm">
                Máx. caracteres
              </Label>
              <Input
                id="bp-text"
                type="number"
                min={0}
                max={50}
                value={maxTextChars}
                onChange={(e) => setMaxTextChars(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Páginas con menos texto que esto se consideran candidatas.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bp-img" className="text-sm">
                Imagen mín. (pt)
              </Label>
              <Input
                id="bp-img"
                type="number"
                min={0}
                max={500}
                value={minImageSize}
                onChange={(e) => setMinImageSize(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Si hay imágenes mayores, NO es blanco.
              </p>
            </div>
          </div>
        </div>

        {busy && !scan && !applied && (
          <div className="mt-3 rounded border p-3 bg-blue-50 dark:bg-blue-950/30 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
              <span>
                Analizando páginas... esto puede tardar varios segundos en
                PDFs de 30+ páginas (cada página se inspecciona en busca de
                texto e imágenes).
              </span>
            </div>
          </div>
        )}
        {scan && !applied && (
          <div className="mt-3 rounded border p-3 bg-muted/30 text-sm">
            <div className="font-medium mb-1">
              Detectadas: {scan.blank_pages.length} de {scan.total_pages}{" "}
              página(s)
            </div>
            {scan.blank_pages.length > 0 ? (
              <p className="text-xs">
                Páginas en blanco:{" "}
                {scan.blank_pages.map((p) => p + 1).join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No se detectó ninguna página en blanco con estos parámetros.
              </p>
            )}
          </div>
        )}

        {applied && (
          <div className="mt-3 rounded border p-3 bg-muted/30 text-sm">
            <div className="font-medium">
              Eliminadas {applied.blank_pages.length} página(s) en blanco
            </div>
            <p className="text-xs">
              Quedaron {applied.total_pages - applied.blank_pages.length} de{" "}
              {applied.total_pages} páginas en la copia guardada.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {applied ? "Cerrar" : "Cancelar"}
          </Button>
          {!applied && (
            <>
              <Button variant="outline" onClick={handleDetect} disabled={busy}>
                {busy && !scan ? "Analizando..." : "Detectar"}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={busy || !scan || scan.blank_pages.length === 0}
              >
                {busy
                  ? "Eliminando..."
                  : `Eliminar y guardar${scan ? ` (${scan.blank_pages.length})` : ""}...`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
