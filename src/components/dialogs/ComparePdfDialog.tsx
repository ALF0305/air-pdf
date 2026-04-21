import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { usePdfStore } from "@/stores/pdfStore";
import { comparePdfs, type PageDiff } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ComparePdfDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const [pathB, setPathB] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<PageDiff[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (!tab) return null;

  const pickB = async () => {
    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof picked === "string") setPathB(picked);
  };

  const runCompare = async () => {
    if (!pathB) return;
    setBusy(true);
    setDiffs(null);
    try {
      const r = await comparePdfs(tab.path, pathB);
      setDiffs(r);
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparar con otro PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">A (actual):</div>
            <div className="font-mono text-xs truncate">{tab.path}</div>
          </div>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <div className="text-muted-foreground">B:</div>
              <div className="font-mono text-xs truncate">
                {pathB ?? "(no elegido)"}
              </div>
            </div>
            <Button size="sm" onClick={pickB}>
              Elegir B...
            </Button>
          </div>

          <Button onClick={runCompare} disabled={!pathB || busy}>
            {busy ? "Comparando..." : "Comparar texto"}
          </Button>

          {diffs && (
            <div className="border rounded max-h-80 overflow-auto">
              {diffs.length === 0 ? (
                <div className="p-3 text-muted-foreground">
                  Los PDFs son idénticos en contenido de texto.
                </div>
              ) : (
                <ul className="divide-y">
                  {diffs.map((d) => (
                    <li key={d.page} className="p-3">
                      <div className="font-semibold mb-1">
                        Página {d.page + 1}
                      </div>
                      {d.only_in_a.length > 0 && (
                        <div>
                          <div className="text-red-600 text-xs font-semibold">
                            Solo en A ({d.only_in_a.length}):
                          </div>
                          <ul className="pl-3 text-xs">
                            {d.only_in_a.slice(0, 10).map((l, i) => (
                              <li key={i} className="truncate" title={l}>
                                − {l}
                              </li>
                            ))}
                            {d.only_in_a.length > 10 && (
                              <li className="text-muted-foreground">
                                ... y {d.only_in_a.length - 10} más
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      {d.only_in_b.length > 0 && (
                        <div className="mt-1">
                          <div className="text-green-600 text-xs font-semibold">
                            Solo en B ({d.only_in_b.length}):
                          </div>
                          <ul className="pl-3 text-xs">
                            {d.only_in_b.slice(0, 10).map((l, i) => (
                              <li key={i} className="truncate" title={l}>
                                + {l}
                              </li>
                            ))}
                            {d.only_in_b.length > 10 && (
                              <li className="text-muted-foreground">
                                ... y {d.only_in_b.length - 10} más
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
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
