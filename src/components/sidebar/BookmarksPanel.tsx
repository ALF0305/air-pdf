import { useEffect, useState } from "react";
import { usePdfStore } from "@/stores/pdfStore";
import { getBookmarks } from "@/lib/tauri";
import type { Bookmark } from "@/types/pdf";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function BookmarkItem({
  bookmark,
  depth,
}: {
  bookmark: Bookmark;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);

  const hasChildren = bookmark.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 hover:bg-accent cursor-pointer text-sm py-1"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => setCurrentPage(bookmark.page)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <span className="truncate">{bookmark.title}</span>
      </div>
      {hasChildren &&
        expanded &&
        bookmark.children.map((c, i) => (
          <BookmarkItem key={i} bookmark={c} depth={depth + 1} />
        ))}
    </div>
  );
}

export function BookmarksPanel() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeTab) {
      setBookmarks([]);
      return;
    }
    setLoading(true);
    getBookmarks(activeTab.path)
      .then(setBookmarks)
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, [activeTab?.path]);

  if (!activeTab) return null;
  if (loading) {
    return <div className="p-2 text-sm w-64 border-r">Cargando...</div>;
  }
  if (bookmarks.length === 0) {
    return (
      <div className="p-2 text-sm text-muted-foreground w-64 border-r">
        Este PDF no tiene marcadores
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-64 border-r">
      <div className="py-2">
        {bookmarks.map((b, i) => (
          <BookmarkItem key={i} bookmark={b} depth={0} />
        ))}
      </div>
    </ScrollArea>
  );
}
