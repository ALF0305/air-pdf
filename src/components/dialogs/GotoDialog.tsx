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

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GotoDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const [val, setVal] = useState("");

  if (!tab) return null;

  const submit = () => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    const idx = Math.max(0, Math.min(tab.pageCount - 1, n - 1));
    setCurrentPage(idx);
    setVal("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ir a página</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="go-n">
            Página (1–{tab.pageCount})
          </Label>
          <Input
            id="go-n"
            autoFocus
            type="number"
            min={1}
            max={tab.pageCount}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!val}>
            Ir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
