import { Button } from "@/components/ui/button";
import { usePdfStore } from "@/stores/pdfStore";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState } from "react";

export function PageNavigation() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const { pages } = usePdfDocument(activeTab?.path ?? null);
  const [inputValue, setInputValue] = useState("");

  if (!activeTab || pages.length === 0) return null;

  const total = pages.length;

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(total - 1, currentPage + delta));
    setCurrentPage(next);
  };

  const handleInputCommit = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= total) {
      setCurrentPage(num - 1);
    }
    setInputValue("");
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCurrentPage(0)}
        aria-label="Primera pagina"
        title="Primera pagina (Ctrl+Home)"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => go(-1)}
        aria-label="Anterior"
        title="Anterior (PgUp)"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <input
        type="text"
        value={inputValue || (currentPage + 1).toString()}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleInputCommit}
        onKeyDown={(e) => e.key === "Enter" && handleInputCommit()}
        onFocus={(e) => e.target.select()}
        className="w-12 text-center bg-transparent border rounded px-1 text-sm"
        aria-label="Ir a pagina"
      />
      <span className="text-sm text-muted-foreground">/ {total}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => go(1)}
        aria-label="Siguiente"
        title="Siguiente (PgDown)"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCurrentPage(total - 1)}
        aria-label="Ultima pagina"
        title="Ultima pagina (Ctrl+End)"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
