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
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import {
  setPdfMetadata,
  saveVersion,
  savePdfBackup,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MetadataDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [title, setTitle] = useState(tab?.title ?? "");
  const [author, setAuthor] = useState(tab?.author ?? "");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);

  if (!tab) return null;

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await setPdfMetadata(tab.path, tab.path, {
        title: title || undefined,
        author: author || undefined,
        subject: subject || undefined,
        keywords: keywords || undefined,
      });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propiedades del documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="md-title">Título</Label>
            <Input
              id="md-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="md-author">Autor</Label>
            <Input
              id="md-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="md-subject">Asunto</Label>
            <Input
              id="md-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="md-keywords">Palabras clave</Label>
            <Input
              id="md-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="coma, separadas"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
