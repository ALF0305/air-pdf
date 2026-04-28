import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { listFontsInPage, type FontUsage } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FontInspectorDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const [fonts, setFonts] = useState<FontUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(currentPage + 1);

  useEffect(() => {
    if (!open || !tab) return;
    setPageInput(currentPage + 1);
  }, [open, tab, currentPage]);

  useEffect(() => {
    if (!open || !tab) return;
    setLoading(true);
    setError(null);
    listFontsInPage(tab.path, pageInput - 1)
      .then((list) => setFonts(list))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open, tab, pageInput]);

  if (!tab) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fuentes del documento</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Lista de fuentes detectadas en la página seleccionada, ordenadas por
          frecuencia. Útil para saber qué fuente y tamaño usa el PDF original.
        </p>

        <div className="flex items-center gap-2 mt-2">
          <label htmlFor="font-page" className="text-sm">
            Página:
          </label>
          <input
            id="font-page"
            type="number"
            min={1}
            max={tab.pageCount}
            value={pageInput}
            onChange={(e) =>
              setPageInput(
                Math.max(1, Math.min(tab.pageCount, parseInt(e.target.value) || 1))
              )
            }
            className="text-sm bg-background border rounded px-2 py-1 w-20"
          />
          <span className="text-xs text-muted-foreground">
            de {tab.pageCount}
          </span>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground mt-2">
            Analizando fuentes...
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}

        {!loading && !error && (
          <div className="mt-3 max-h-[400px] overflow-y-auto border rounded">
            {fonts.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                Sin fuentes detectadas en esta página (puede ser un escaneo
                sin OCR o página vacía).
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left">
                    <th className="p-2">Fuente PDF (raw)</th>
                    <th className="p-2">Mapeada a</th>
                    <th className="p-2">Tam.</th>
                    <th className="p-2">B/I</th>
                    <th className="p-2 text-right">Chars</th>
                  </tr>
                </thead>
                <tbody>
                  {fonts.map((f, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono text-[10px] break-all">
                        {f.raw_name}
                      </td>
                      <td className="p-2">{f.family}</td>
                      <td className="p-2">{f.size} pt</td>
                      <td className="p-2">
                        {f.bold && "B"}
                        {f.italic && "I"}
                        {!f.bold && !f.italic && "—"}
                      </td>
                      <td className="p-2 text-right">{f.char_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-2">
          La columna "Mapeada a" es la familia que el editor usará al pegar
          texto libre. Si no coincide con la real del PDF, abre un issue.
        </p>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
