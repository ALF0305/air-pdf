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
import { useUiStore } from "@/stores/uiStore";
import { listVersions, savePdfBackup } from "@/lib/tauri";
import { History, RotateCcw } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VersionsDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !tab) return;
    setLoading(true);
    listVersions(tab.path)
      .then(setVersions)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [open, tab?.path]);

  if (!tab) return null;

  const handleRestore = async (versionPath: string) => {
    if (
      !confirm(
        `Restaurar esta versión? La versión actual se guardará primero como .bak antes de reemplazar.`
      )
    )
      return;
    setBusy(true);
    try {
      // Backup current then overwrite with version
      await savePdfBackup(tab.path, tab.path + ".bak");
      await savePdfBackup(versionPath, tab.path);
      bumpRefresh();
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const fmtName = (p: string) => {
    const base = p.split(/[\\/]/).pop() ?? p;
    // Expected format: YYYYMMDD-HHMMSS-name.pdf or similar
    const match = base.match(/(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
    }
    return base;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de versiones
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Cada edición crea un snapshot automático. Puedes restaurar
            cualquier versión previa.
          </p>
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Cargando...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No hay versiones previas guardadas.
            </div>
          ) : (
            <ul className="max-h-80 overflow-auto space-y-1 border rounded">
              {versions
                .slice()
                .reverse()
                .map((v) => (
                  <li
                    key={v}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 border-b last:border-b-0"
                  >
                    <span className="flex-1 font-mono text-xs truncate" title={v}>
                      {fmtName(v)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(v)}
                      disabled={busy}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
