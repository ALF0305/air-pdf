import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { mergePdfs } from "@/lib/tauri";
import { GripVertical, X, FolderPlus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  open: boolean;
  onClose: () => void;
}

function SortableItem({
  path,
  onRemove,
}: {
  path: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: path });
  const filename = path.split(/[\\/]/).pop() ?? path;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 p-2 border rounded bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-sm truncate" title={path}>
        {filename}
      </span>
      <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7">
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function MergePdfsDialog({ open, onClose }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const addFile = async () => {
    const sel = await openDialog({
      multiple: true,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (Array.isArray(sel)) {
      setFiles((f) => [...f, ...sel.filter((s) => !f.includes(s))]);
    } else if (typeof sel === "string" && !files.includes(sel)) {
      setFiles((f) => [...f, sel]);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = files.indexOf(active.id as string);
    const newIdx = files.indexOf(over.id as string);
    setFiles((f) => arrayMove(f, oldIdx, newIdx));
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    const target = await save({
      defaultPath: "combinado.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!target) return;
    setBusy(true);
    try {
      await mergePdfs(files, target);
      alert(`PDFs combinados en: ${target}`);
      setFiles([]);
      onClose();
    } catch (e) {
      alert(`Error al combinar: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Combinar PDFs</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Agregá PDFs y reordenalos arrastrando. Se combinarán en el orden
            mostrado.
          </p>
          <Button onClick={addFile} variant="outline" className="w-full gap-2">
            <FolderPlus className="h-4 w-4" />
            Agregar PDFs
          </Button>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={files}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {files.map((f) => (
                  <SortableItem
                    key={f}
                    path={f}
                    onRemove={() =>
                      setFiles((fs) => fs.filter((x) => x !== f))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            onClick={handleMerge}
            disabled={files.length < 2 || busy}
            className="w-full"
          >
            {busy
              ? "Combinando..."
              : files.length < 2
                ? "Agregá al menos 2 PDFs"
                : `Combinar ${files.length} PDFs`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
