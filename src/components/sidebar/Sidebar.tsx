import { useState } from "react";
import { ThumbnailsPanel } from "./ThumbnailsPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import { AnnotationsPanel } from "./AnnotationsPanel";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, BookMarked, Pencil } from "lucide-react";

type Panel = "thumbnails" | "bookmarks" | "annotations";

export function Sidebar() {
  const [active, setActive] = useState<Panel>("thumbnails");

  return (
    <div className="flex h-full">
      <div className="w-12 border-r flex flex-col items-center py-2 gap-1 bg-muted/60">
        <Button
          variant={active === "thumbnails" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setActive("thumbnails")}
          aria-label="Thumbnails"
          title="Thumbnails"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={active === "bookmarks" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setActive("bookmarks")}
          aria-label="Bookmarks"
          title="Marcadores"
        >
          <BookMarked className="h-4 w-4" />
        </Button>
        <Button
          variant={active === "annotations" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setActive("annotations")}
          aria-label="Anotaciones"
          title="Anotaciones (Plan 1.2)"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 min-w-0">
        {active === "thumbnails" && <ThumbnailsPanel />}
        {active === "bookmarks" && <BookmarksPanel />}
        {active === "annotations" && <AnnotationsPanel />}
      </div>
    </div>
  );
}
