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
  autoRedactPdf,
  autoRedactPdfPreview,
  type AutoRedactOptions,
  type AutoRedactReport,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CustomRow {
  label: string;
  regex: string;
}

export function AutoRedactDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [useDni, setUseDni] = useState(true);
  const [useTelefono, setUseTelefono] = useState(true);
  const [useEmail, setUseEmail] = useState(true);
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<AutoRedactReport | null>(null);
  const [appliedReport, setAppliedReport] = useState<AutoRedactReport | null>(
    null
  );

  if (!tab) return null;

  const buildOptions = (): AutoRedactOptions => ({
    useDni,
    useTelefono,
    useEmail,
    customPatterns: custom
      .filter((c) => c.label.trim() && c.regex.trim())
      .map((c) => [c.label.trim(), c.regex.trim()]),
  });

  const totalSelectedPatterns = () => {
    let n = 0;
    if (useDni) n++;
    if (useTelefono) n++;
    if (useEmail) n++;
    n += custom.filter((c) => c.label.trim() && c.regex.trim()).length;
    return n;
  };

  const handleClose = () => {
    setPreview(null);
    setAppliedReport(null);
    onClose();
  };

  const handlePreview = async () => {
    if (totalSelectedPatterns() === 0) {
      alert("Selecciona al menos un patrón.");
      return;
    }
    setBusy(true);
    try {
      const r = await autoRedactPdfPreview(tab.path, buildOptions());
      setPreview(r);
    } catch (e) {
      alert(`Error en preview: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (totalSelectedPatterns() === 0) {
      alert("Selecciona al menos un patrón.");
      return;
    }
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-anonimizado.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      const r = await autoRedactPdf(tab.path, out, buildOptions());
      setAppliedReport(r);
      setPreview(null);
    } catch (e) {
      alert(`Error al aplicar: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const addCustom = () =>
    setCustom((c) => [...c, { label: "", regex: "" }]);
  const removeCustom = (i: number) =>
    setCustom((c) => c.filter((_, idx) => idx !== i));
  const updateCustom = (i: number, field: keyof CustomRow, v: string) =>
    setCustom((c) => c.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Anonimizar / auto-redacción</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Detecta y tacha automáticamente patrones sensibles. Crea una copia;
          el PDF original no se modifica. Util para anonimizar historias clínicas.
        </p>

        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium">Patrones predefinidos (Perú):</p>
          <CheckRow
            id="ar-dni"
            label="DNI peruano"
            description="8 dígitos delimitados (ej. 12345678)."
            checked={useDni}
            onChange={() => setUseDni((v) => !v)}
          />
          <CheckRow
            id="ar-tel"
            label="Teléfono peruano"
            description="Celular 9XXXXXXXX, fijo Lima (01)XXXXXXX o 01-XXXXXXX."
            checked={useTelefono}
            onChange={() => setUseTelefono((v) => !v)}
          />
          <CheckRow
            id="ar-mail"
            label="Email"
            description="Cualquier dirección de email."
            checked={useEmail}
            onChange={() => setUseEmail((v) => !v)}
          />
        </div>

        <div className="space-y-2 mt-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Patrones custom (regex):</p>
            <Button variant="outline" size="sm" onClick={addCustom}>
              + Agregar
            </Button>
          </div>
          {custom.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Sin patrones custom. Útil para HC-XXXXX, códigos internos, etc.
            </p>
          )}
          {custom.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <Label htmlFor={`ar-c-l-${i}`} className="text-xs">
                  Etiqueta
                </Label>
                <Input
                  id={`ar-c-l-${i}`}
                  value={row.label}
                  onChange={(e) => updateCustom(i, "label", e.target.value)}
                  placeholder="HC-num"
                />
              </div>
              <div className="col-span-7">
                <Label htmlFor={`ar-c-r-${i}`} className="text-xs">
                  Regex
                </Label>
                <Input
                  id={`ar-c-r-${i}`}
                  value={row.regex}
                  onChange={(e) => updateCustom(i, "regex", e.target.value)}
                  placeholder="HC-\d+"
                  className="font-mono text-xs"
                />
              </div>
              <div className="col-span-1 flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustom(i)}
                  className="px-2"
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>

        {(preview || appliedReport) && (
          <div className="mt-3 rounded border p-3 bg-muted/30 text-sm">
            <div className="font-medium mb-1">
              {appliedReport ? "Aplicado:" : "Vista previa:"}{" "}
              {(appliedReport ?? preview)!.total_redactions} redacciones totales
            </div>
            <ul className="space-y-0.5 text-xs">
              {(appliedReport ?? preview)!.per_pattern.map((p) => (
                <li key={p.label}>
                  {p.label}: {p.matches}{" "}
                  {p.matches === 1 ? "match" : "matches"}
                  {p.pages_with_hits.length > 0 &&
                    ` (páginas: ${p.pages_with_hits
                      .map((n) => n + 1)
                      .join(", ")})`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {appliedReport ? "Cerrar" : "Cancelar"}
          </Button>
          {!appliedReport && (
            <>
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={busy || totalSelectedPatterns() === 0}
              >
                {busy ? "..." : "Vista previa"}
              </Button>
              <Button
                onClick={handleApply}
                disabled={busy || totalSelectedPatterns() === 0}
              >
                {busy ? "Aplicando..." : "Aplicar y guardar..."}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <div className="flex-1">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
