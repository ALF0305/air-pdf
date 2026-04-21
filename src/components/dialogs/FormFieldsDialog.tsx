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
import { listFormFields } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FormFieldsDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [fields, setFields] = useState<[string, string | null][]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tab) return;
    setLoading(true);
    listFormFields(tab.path)
      .then(setFields)
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [open, tab?.path]);

  if (!tab) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Formulario (AcroForm)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Lista read-only de campos detectados. Edición de valores pendiente
            para v0.3 (requiere UI interactiva directa sobre la página).
          </p>
          {loading ? (
            <div className="text-muted-foreground text-center py-4">
              Analizando...
            </div>
          ) : fields.length === 0 ? (
            <div className="text-muted-foreground text-center py-4">
              Este PDF no contiene formulario AcroForm.
            </div>
          ) : (
            <div className="border rounded max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-1.5">Campo</th>
                    <th className="text-left px-3 py-1.5">Valor actual</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(([name, value], i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 font-mono truncate max-w-xs" title={name}>
                        {name}
                      </td>
                      <td className="px-3 py-1.5 truncate max-w-xs" title={value ?? ""}>
                        {value ?? (
                          <span className="text-muted-foreground italic">
                            (vacío)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
