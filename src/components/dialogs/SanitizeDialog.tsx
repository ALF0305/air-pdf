import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { sanitizePdf, type SanitizeOptions, type SanitizeReport } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SanitizeDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [options, setOptions] = useState<Required<SanitizeOptions>>({
    removeJavascript: true,
    removeEmbeddedFiles: true,
    removeOpenActions: true,
    removeXfa: true,
    removeMetadata: false,
  });
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SanitizeReport | null>(null);

  if (!tab) return null;

  const toggle = (key: keyof Required<SanitizeOptions>) => {
    setOptions((o) => ({ ...o, [key]: !o[key] }));
  };

  const handleClose = () => {
    setReport(null);
    onClose();
  };

  const handleApply = async () => {
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-saneado.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      const r = await sanitizePdf(tab.path, out, options);
      setReport(r);
    } catch (e) {
      alert(`Error al sanitizar: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sanitizar PDF</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Quita scripts, archivos embebidos, acciones automáticas y otros
          elementos potencialmente peligrosos. Crea una copia limpia; el PDF
          original no se modifica.
        </p>

        <div className="space-y-2 mt-2">
          <CheckRow
            id="san-js"
            label="Scripts JavaScript"
            description="Código que el PDF puede ejecutar al abrirlo o interactuar."
            checked={options.removeJavascript}
            onChange={() => toggle("removeJavascript")}
          />
          <CheckRow
            id="san-emb"
            label="Archivos adjuntos embebidos"
            description="Otros archivos que viajan dentro del PDF (pueden contener malware)."
            checked={options.removeEmbeddedFiles}
            onChange={() => toggle("removeEmbeddedFiles")}
          />
          <CheckRow
            id="san-oa"
            label="Acciones automáticas (OpenAction, AA)"
            description="Acciones que se disparan al abrir, cerrar o navegar páginas."
            checked={options.removeOpenActions}
            onChange={() => toggle("removeOpenActions")}
          />
          <CheckRow
            id="san-xfa"
            label="Formularios XFA"
            description="Formularios XML interactivos. Los AcroForm normales se preservan."
            checked={options.removeXfa}
            onChange={() => toggle("removeXfa")}
          />
          <CheckRow
            id="san-meta"
            label="Metadata XMP"
            description="Información del autor / creador / software original. Apaga si vas a re-publicar anonimizando."
            checked={options.removeMetadata}
            onChange={() => toggle("removeMetadata")}
          />
        </div>

        {report && (
          <div className="mt-3 rounded border p-3 bg-muted/30 text-sm">
            <div className="font-medium mb-1">Resultado:</div>
            <ul className="space-y-0.5 text-xs">
              <li>
                JavaScript: {report.javascript_removed ? "removido" : "no presente"}
              </li>
              <li>
                Archivos embebidos:{" "}
                {report.embedded_files_removed ? "removidos" : "no presentes"}
              </li>
              <li>
                OpenAction:{" "}
                {report.open_action_removed ? "removida" : "no presente"}
              </li>
              <li>
                Catalog AA:{" "}
                {report.catalog_aa_removed ? "removidas" : "no presentes"}
              </li>
              <li>
                Páginas con acciones removidas: {report.pages_actions_removed}
              </li>
              <li>XFA: {report.xfa_removed ? "removido" : "no presente"}</li>
              <li>
                Metadata: {report.metadata_removed ? "removida" : "preservada"}
              </li>
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {report ? "Cerrar" : "Cancelar"}
          </Button>
          {!report && (
            <Button onClick={handleApply} disabled={busy}>
              {busy ? "Sanitizando..." : "Sanitizar..."}
            </Button>
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
