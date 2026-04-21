import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { pdfFromImages, openPdf } from "@/lib/tauri";
import { usePdfStore } from "@/stores/pdfStore";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Button as Btn } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImagesToPdfDialog({ open, onClose }: Props) {
  const addTab = usePdfStore((s) => s.addTab);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const pickImages = async () => {
    const picked = await openDialog({
      multiple: true,
      filters: [
        {
          name: "Imágenes",
          extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tiff"],
        },
      ],
    });
    if (!picked) return;
    const arr = Array.isArray(picked) ? picked : [picked];
    setImages((prev) => [...prev, ...arr]);
  };

  const move = (idx: number, delta: number) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const remove = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (images.length === 0) return;
    const out = await saveDialog({
      defaultPath: "documento.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    setBusy(true);
    try {
      await pdfFromImages(images, out);
      const doc = await openPdf(out);
      addTab(doc);
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear PDF desde imágenes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Btn size="sm" onClick={pickImages}>
              Añadir imágenes...
            </Btn>
          </div>
          <ul className="max-h-64 overflow-auto space-y-1 border rounded p-2">
            {images.length === 0 ? (
              <li className="text-sm text-muted-foreground p-2">
                Ninguna imagen. Cada imagen se colocará centrada en una página
                A4.
              </li>
            ) : (
              images.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 text-sm border rounded"
                >
                  <span className="flex-1 truncate" title={p}>
                    {i + 1}. {p.split(/[\\/]/).pop()}
                  </span>
                  <Btn
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Btn>
                  <Btn
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === images.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Btn>
                  <Btn size="icon" variant="ghost" onClick={() => remove(i)}>
                    <X className="h-3 w-3" />
                  </Btn>
                </li>
              ))
            )}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={busy || images.length === 0}
          >
            {busy ? "Creando..." : "Crear PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
