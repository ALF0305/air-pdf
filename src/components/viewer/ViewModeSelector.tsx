import { Button } from "@/components/ui/button";
import { usePdfStore } from "@/stores/pdfStore";
import { File, BookOpen, AlignJustify } from "lucide-react";

export function ViewModeSelector() {
  const viewMode = usePdfStore((s) => s.viewMode);
  const setViewMode = usePdfStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={viewMode === "single" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => setViewMode("single")}
        aria-label="Una pagina"
        title="Una pagina"
      >
        <File className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "double" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => setViewMode("double")}
        aria-label="Dos paginas"
        title="Dos paginas"
      >
        <BookOpen className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "continuous" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => setViewMode("continuous")}
        aria-label="Continuo"
        title="Continuo"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>
    </div>
  );
}
