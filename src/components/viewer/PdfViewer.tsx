import { usePdfStore } from "@/stores/pdfStore";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { PageRenderer } from "./PageRenderer";
import type React from "react";

export function PdfViewer() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const zoom = usePdfStore((s) => s.zoom);
  const viewMode = usePdfStore((s) => s.viewMode);
  const setZoom = usePdfStore((s) => s.setZoom);
  const { pages, loading, error } = usePdfDocument(activeTab?.path ?? null);

  const scale = typeof zoom === "number" ? zoom : 1.0;

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const current = typeof zoom === "number" ? zoom : 1.0;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const next = Math.max(0.25, Math.min(5.0, current + delta));
    setZoom(Math.round(next * 100) / 100);
  };

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Abri un PDF para empezar
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Cargando documento...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive p-4">
        Error: {error}
      </div>
    );
  }

  if (viewMode === "continuous") {
    return (
      <div
        className="flex-1 overflow-auto bg-muted/20"
        onWheel={handleWheel}
      >
        {pages.map((p) => (
          <PageRenderer
            key={p.pageNumber}
            path={activeTab.path}
            pageIndex={p.pageNumber}
            scale={scale}
            width={p.width}
            height={p.height}
          />
        ))}
      </div>
    );
  }

  if (viewMode === "double") {
    const left = pages[currentPage];
    const right = pages[currentPage + 1];
    return (
      <div
        className="flex-1 overflow-auto bg-muted/20"
        onWheel={handleWheel}
      >
        <div className="flex justify-center gap-2 p-4">
          {left && (
            <PageRenderer
              path={activeTab.path}
              pageIndex={left.pageNumber}
              scale={scale}
              width={left.width}
              height={left.height}
            />
          )}
          {right && (
            <PageRenderer
              path={activeTab.path}
              pageIndex={right.pageNumber}
              scale={scale}
              width={right.width}
              height={right.height}
            />
          )}
        </div>
      </div>
    );
  }

  // Single page view (default)
  const page = pages[currentPage];
  if (!page) return null;
  return (
    <div
      className="flex-1 overflow-auto bg-muted/20"
      onWheel={handleWheel}
    >
      <PageRenderer
        path={activeTab.path}
        pageIndex={page.pageNumber}
        scale={scale}
        width={page.width}
        height={page.height}
      />
    </div>
  );
}
