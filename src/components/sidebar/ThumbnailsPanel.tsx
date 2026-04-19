import { useEffect, useState } from "react";
import { usePdfStore } from "@/stores/pdfStore";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { renderPage } from "@/lib/tauri";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clsx } from "clsx";

function Thumbnail({
  path,
  pageIndex,
  isActive,
  onClick,
}: {
  path: string;
  pageIndex: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    renderPage(path, pageIndex, 0.2)
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
  }, [path, pageIndex]);

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center gap-1 p-2 w-full hover:bg-accent transition-colors",
        isActive && "bg-accent ring-2 ring-primary/40"
      )}
    >
      {url ? (
        <img
          src={url}
          alt={`Pag ${pageIndex + 1}`}
          className="border max-h-32 shadow-sm"
        />
      ) : (
        <div className="w-24 h-32 bg-muted animate-pulse" />
      )}
      <span className="text-xs text-muted-foreground">{pageIndex + 1}</span>
    </button>
  );
}

export function ThumbnailsPanel() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const { pages } = usePdfDocument(activeTab?.path ?? null);

  if (!activeTab) return null;

  return (
    <ScrollArea className="h-full w-36 border-r">
      <div className="py-1">
        {pages.map((p) => (
          <Thumbnail
            key={p.pageNumber}
            path={activeTab.path}
            pageIndex={p.pageNumber}
            isActive={p.pageNumber === currentPage}
            onClick={() => setCurrentPage(p.pageNumber)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
