import { useEffect, useState } from "react";
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
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import {
  getBookmarks,
  setBookmarks,
  savePdfBackup,
  saveVersion,
  type BookmarkEdit,
} from "@/lib/tauri";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

function flatten(nodes: { title: string; page: number; children: any[] }[]): BookmarkEdit[] {
  const out: BookmarkEdit[] = [];
  const walk = (ns: typeof nodes) => {
    for (const n of ns) {
      out.push({ title: n.title, page: n.page });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function BookmarksDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [entries, setEntries] = useState<BookmarkEdit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPage, setNewPage] = useState(currentPage + 1);

  useEffect(() => {
    if (!open || !tab) return;
    setLoading(true);
    getBookmarks(tab.path)
      .then((bm) => setEntries(flatten(bm as any)))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
    setNewPage(currentPage + 1);
  }, [open, tab?.path, currentPage]);

  if (!tab) return null;

  const move = (idx: number, delta: number) => {
    setEntries((prev) => {
      const next = [...prev];
      const t = idx + delta;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTitle = (idx: number, title: string) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, title } : e)));
  };

  const updatePage = (idx: number, page: number) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, page } : e)));
  };

  const addEntry = () => {
    if (!newTitle) return;
    const page = Math.max(1, Math.min(tab.pageCount, newPage)) - 1;
    setEntries((prev) => [...prev, { title: newTitle, page }]);
    setNewTitle("");
  };

  const handleSave = async () => {
    if (!confirm("Reemplazar marcadores del PDF? Se crea backup .bak.")) return;
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await setBookmarks(tab.path, tab.path, entries);
      bumpRefresh();
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
          <DialogTitle>Editor de marcadores</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gestiona la tabla de contenido del PDF. Estructura plana (sin
            niveles anidados en esta versión).
          </p>

          <div className="flex gap-2 items-end border rounded p-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="bm-title">Título</Label>
              <Input
                id="bm-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Introducción"
              />
            </div>
            <div className="w-20 space-y-1">
              <Label htmlFor="bm-page">Página</Label>
              <Input
                id="bm-page"
                type="number"
                min={1}
                max={tab.pageCount}
                value={newPage}
                onChange={(e) => setNewPage(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button size="sm" onClick={addEntry} disabled={!newTitle}>
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>

          <ul className="max-h-72 overflow-auto space-y-1 border rounded p-2">
            {loading ? (
              <li className="text-sm text-muted-foreground p-2">Cargando...</li>
            ) : entries.length === 0 ? (
              <li className="text-sm text-muted-foreground p-2">
                Sin marcadores. Añade uno arriba.
              </li>
            ) : (
              entries.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 border rounded"
                >
                  <Input
                    className="flex-1 h-8"
                    value={e.title}
                    onChange={(ev) => updateTitle(i, ev.target.value)}
                  />
                  <Input
                    className="w-20 h-8"
                    type="number"
                    min={1}
                    max={tab.pageCount}
                    value={e.page + 1}
                    onChange={(ev) =>
                      updatePage(i, (parseInt(ev.target.value) || 1) - 1)
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === entries.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEntry(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Guardando..." : "Guardar marcadores"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
