import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";
import { extractPages, splitPdf } from "@/lib/tauri";
import { usePdfStore } from "@/stores/pdfStore";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "split" | "extract";
}

function parsePagesInput(input: string, total: number): number[] {
  const result = new Set<number>();
  for (const part of input.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
      if (!isNaN(a) && !isNaN(b)) {
        for (let i = a; i <= b; i++) {
          if (i >= 1 && i <= total) result.add(i - 1);
        }
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1 && n <= total) result.add(n - 1);
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

export function SplitExtractDialog({ open, onClose, mode }: Props) {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const [pagesInput, setPagesInput] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAction = async () => {
    if (!activeTab) return;
    const pages = parsePagesInput(pagesInput, activeTab.pageCount);
    if (pages.length === 0) {
      alert("Indicá páginas válidas (ej: 1-5, 8, 10-12)");
      return;
    }

    setBusy(true);
    try {
      if (mode === "extract") {
        const target = await save({
          defaultPath: activeTab.path.replace(
            /\.pdf$/i,
            "-extraido.pdf"
          ),
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (!target) {
          setBusy(false);
          return;
        }
        await extractPages(activeTab.path, target, pages);
        alert(`Páginas extraídas a:\n${target}`);
      } else {
        const dirSel = await openDialog({ directory: true });
        if (typeof dirSel !== "string") {
          setBusy(false);
          return;
        }
        const result = await splitPdf(
          activeTab.path,
          dirSel,
          pages.map((p) => p + 1 as number)
        );
        alert(`Dividido en ${result.length} archivo(s) en:\n${dirSel}`);
      }
      setPagesInput("");
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "extract" ? "Extraer páginas" : "Dividir PDF"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">
            {mode === "extract"
              ? "Páginas a extraer (ej: 1-5, 8, 10-12)"
              : "Puntos de corte (ej: 5, 10, 15 — divide después de pág 5, 10, 15)"}
          </p>
          <Input
            value={pagesInput}
            onChange={(e) => setPagesInput(e.target.value)}
            placeholder="1-5, 8, 10-12"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAction()}
          />
          {activeTab && (
            <p className="text-xs text-muted-foreground">
              Documento tiene {activeTab.pageCount} páginas
            </p>
          )}
          <Button
            onClick={handleAction}
            className="w-full"
            disabled={busy || !pagesInput.trim()}
          >
            {busy
              ? "Procesando..."
              : mode === "extract"
                ? "Extraer"
                : "Dividir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
