import { useEffect, useState } from "react";
import { usePdfStore } from "@/stores/pdfStore";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { useUiStore } from "@/stores/uiStore";
import {
  renderPage,
  reorderPages,
  savePdfBackup,
  saveVersion,
} from "@/lib/tauri";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clsx } from "clsx";
import {
  DndContext,
  closestCenter,
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

function SortableThumb({
  id,
  path,
  pageIndex,
  displayNumber,
  isActive,
  onClick,
}: {
  id: string;
  path: string;
  pageIndex: number;
  displayNumber: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const refreshKey = useUiStore((s) => s.refreshKey);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    renderPage(path, pageIndex, 0.35)
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [path, pageIndex, refreshKey]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "flex flex-col items-center gap-1 p-2 w-full hover:bg-accent transition-colors cursor-grab active:cursor-grabbing",
        isActive && "bg-accent ring-2 ring-primary/40"
      )}
      onClick={onClick}
    >
      {url ? (
        <img
          src={url}
          alt={`Pag ${displayNumber}`}
          className="border max-h-32 shadow-sm pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-24 h-32 bg-muted animate-pulse" />
      )}
      <span className="text-xs text-muted-foreground">{displayNumber}</span>
    </div>
  );
}

export function ThumbnailsPanel() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const { pages } = usePdfDocument(activeTab?.path ?? null);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  if (!activeTab) return null;

  const items = pages.map((p) => String(p.pageNumber));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || busy || !activeTab) return;

    const activeIdx = items.indexOf(active.id as string);
    const overIdx = items.indexOf(over.id as string);
    if (activeIdx < 0 || overIdx < 0) return;

    if (
      !confirm(
        `Mover página ${activeIdx + 1} a posición ${overIdx + 1}? Se crea backup .bak.`
      )
    ) {
      return;
    }

    const newOrder = arrayMove(
      pages.map((p) => p.pageNumber),
      activeIdx,
      overIdx
    );

    setBusy(true);
    try {
      await saveVersion(activeTab.path);
      await savePdfBackup(activeTab.path, activeTab.path + ".bak");
      await reorderPages(activeTab.path, activeTab.path, newOrder);
      // Adjust current page if it was the moved one
      if (currentPage === activeIdx) {
        setCurrentPage(overIdx);
      }
      bumpRefresh();
    } catch (err) {
      alert(`Error al reordenar: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollArea className="h-full w-36 border-r">
      <div className="py-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {pages.map((p, idx) => (
              <SortableThumb
                key={p.pageNumber}
                id={String(p.pageNumber)}
                path={activeTab.path}
                pageIndex={p.pageNumber}
                displayNumber={idx + 1}
                isActive={p.pageNumber === currentPage}
                onClick={() => setCurrentPage(p.pageNumber)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </ScrollArea>
  );
}
