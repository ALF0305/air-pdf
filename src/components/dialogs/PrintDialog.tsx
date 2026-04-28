import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { listSystemPrinters, printPdfTo, printPdf } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PrintDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listSystemPrinters()
      .then((list) => {
        setPrinters(list);
        if (list.length > 0 && !selected) {
          setSelected(list[0]);
        }
      })
      .catch((e) => {
        setError(`No se pudieron listar impresoras: ${e}`);
      })
      .finally(() => setLoading(false));
  }, [open, selected]);

  if (!tab) return null;

  const handlePrintToSelected = async () => {
    if (!selected) {
      alert("Selecciona una impresora.");
      return;
    }
    setBusy(true);
    try {
      await printPdfTo(tab.path, selected);
      onClose();
    } catch (e) {
      alert(`Error al imprimir: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSystemDialog = async () => {
    setBusy(true);
    try {
      await printPdf(tab.path);
      onClose();
    } catch (e) {
      alert(`Error al imprimir: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Imprimir PDF</DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground">
            Buscando impresoras instaladas...
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="printer-select">Impresora</Label>
              <select
                id="printer-select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full text-sm bg-background border rounded px-2 py-1.5"
              >
                {printers.length === 0 && (
                  <option value="">(sin impresoras detectadas)</option>
                )}
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {printers.length} impresora(s) detectada(s) en el sistema.
              </p>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-2">
              Si tu impresora no aparece, usa "Diálogo del sistema" para abrir
              el visor predeterminado de PDF (Edge / Acrobat) y elegir desde ahí.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleSystemDialog}
            disabled={busy}
            title="Abre el visor predeterminado del sistema con verbo Print"
          >
            Diálogo del sistema
          </Button>
          <Button
            onClick={handlePrintToSelected}
            disabled={busy || !selected || printers.length === 0}
          >
            {busy ? "Enviando..." : "Imprimir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
