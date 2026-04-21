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
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { usePdfStore } from "@/stores/pdfStore";
import { ocrPdf } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OcrDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [lang, setLang] = useState("spa+eng");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  if (!tab) return null;

  const handleRun = async () => {
    setBusy(true);
    setText("");
    try {
      const result = await ocrPdf(tab.path, lang);
      setText(result);
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-ocr.txt"),
      filters: [{ name: "Texto", extensions: ["txt", "md"] }],
    });
    if (!out) return;
    try {
      await writeTextFile(out, text);
      alert(`Guardado en:\n${out}`);
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>OCR (Reconocimiento óptico)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Útil para PDFs escaneados (historias clínicas en papel). Requiere{" "}
            <strong>Tesseract</strong> instalado en el sistema. Descarga:{" "}
            <a
              href="https://github.com/UB-Mannheim/tesseract/wiki"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              UB-Mannheim/tesseract
            </a>
            .
          </p>
          <div className="space-y-1">
            <Label htmlFor="ocr-lang">Idioma(s) Tesseract</Label>
            <Input
              id="ocr-lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              placeholder="spa+eng"
            />
            <p className="text-xs text-muted-foreground">
              Combina con "+" (ej. spa+eng, por+eng). Los paquetes de idioma se
              instalan con Tesseract.
            </p>
          </div>
          {text && (
            <div className="border rounded max-h-60 overflow-auto p-2 text-xs font-mono whitespace-pre-wrap">
              {text}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
          {text && (
            <Button variant="outline" onClick={handleSave}>
              Guardar TXT...
            </Button>
          )}
          <Button onClick={handleRun} disabled={busy}>
            {busy ? "Procesando (puede tardar)..." : "Ejecutar OCR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
